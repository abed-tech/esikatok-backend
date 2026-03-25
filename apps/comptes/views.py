"""
Vues API pour les comptes utilisateurs EsikaTok.
"""
import logging
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone

from .models import Utilisateur, ProfilAgent, ProfilAdministrateur
from .serializers import (
    InscriptionUtilisateurSerializer,
    InscriptionAgentSerializer,
    ConnexionSerializer,
    ConnexionAdminSerializer,
    UtilisateurSerializer,
    ProfilAgentSerializer,
    ProfilAgentEditionSerializer,
    ProfilAdministrateurSerializer,
    CreationAdminSerializer,
)
from .permissions import EstAgent, EstAdministrateur, EstDirecteur
from .services import creer_essai_gratuit_agent, enregistrer_connexion_admin
from esikatok.throttles import ThrottleAuthentification
from esikatok.sanitization import nettoyer_texte

logger_securite = logging.getLogger('esikatok.securite')


class VueCompteursBadges(APIView):
    """Compteurs unifiés pour tous les badges utilisateur (polling léger)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q, Count
        from apps.messagerie.models import Conversation, Message
        from apps.administration.models import Annonce, Preoccupation

        user = request.user

        # 1. Messages non lus
        convs_avec_non_lus = Conversation.objects.filter(
            Q(initiateur=user) | Q(agent=user)
        ).annotate(
            _non_lus=Count(
                'messages',
                filter=Q(messages__est_lu=False) & ~Q(messages__expediteur=user)
            )
        ).filter(_non_lus__gt=0)
        conversations_non_lues = convs_avec_non_lus.count()
        messages_non_lus = sum(c._non_lus for c in convs_avec_non_lus)

        # 2. Annonces (total count — frontend tracks "seen" via localStorage)
        annonces_total = Annonce.objects.count()

        # 3. Préoccupations avec réponse (pour cet utilisateur)
        preoccupations_repondues = Preoccupation.objects.filter(
            utilisateur=user,
            reponse__isnull=False,
        ).exclude(reponse='').count()

        data = {
            'conversations_non_lues': conversations_non_lues,
            'messages_non_lus': messages_non_lus,
            'annonces_total': annonces_total,
            'preoccupations_repondues': preoccupations_repondues,
        }

        # 4. Agent-specific: publications en attente + abonnement expirant
        if user.type_compte == 'agent':
            from apps.biens.models import BienImmobilier
            from apps.abonnements.models import Abonnement
            from datetime import timedelta
            data['publications_en_attente'] = BienImmobilier.objects.filter(
                agent=user, statut='en_attente'
            ).count()
            data['publications_refusees'] = BienImmobilier.objects.filter(
                agent=user, statut='refuse'
            ).count()
            seuil = timezone.now() + timedelta(days=7)
            data['abo_expirant'] = Abonnement.objects.filter(
                agent=user, statut__in=['actif', 'essai'],
                date_fin__lte=seuil, date_fin__gte=timezone.now()
            ).exists()

        return Response(data)


class VueInscriptionUtilisateur(APIView):
    """Inscription d'un utilisateur simple."""
    permission_classes = [AllowAny]
    throttle_classes = [ThrottleAuthentification]

    def post(self, request):
        serializer = InscriptionUtilisateurSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.save()
        tokens = RefreshToken.for_user(utilisateur)
        return Response({
            'message': 'Compte créé avec succès.',
            'utilisateur': UtilisateurSerializer(utilisateur).data,
            'tokens': {
                'access': str(tokens.access_token),
                'refresh': str(tokens),
            }
        }, status=status.HTTP_201_CREATED)


class VueInscriptionAgent(APIView):
    """Inscription d'un agent immobilier avec essai gratuit."""
    permission_classes = [AllowAny]
    throttle_classes = [ThrottleAuthentification]

    def post(self, request):
        serializer = InscriptionAgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.save()

        # Créer l'essai gratuit Premium de 30 jours
        creer_essai_gratuit_agent(utilisateur)

        tokens = RefreshToken.for_user(utilisateur)
        return Response({
            'message': 'Compte agent créé avec succès. Essai Premium gratuit de 30 jours activé.',
            'utilisateur': UtilisateurSerializer(utilisateur).data,
            'tokens': {
                'access': str(tokens.access_token),
                'refresh': str(tokens),
            }
        }, status=status.HTTP_201_CREATED)


class VueConnexion(APIView):
    """Connexion par e-mail + mot de passe."""
    permission_classes = [AllowAny]
    throttle_classes = [ThrottleAuthentification]

    def post(self, request):
        serializer = ConnexionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower()
        mot_de_passe = serializer.validated_data['mot_de_passe']

        utilisateur = authenticate(request, username=email, password=mot_de_passe)
        if not utilisateur:
            logger_securite.warning(
                'Échec connexion | email=%s | IP=%s',
                email,
                request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')),
            )
            return Response(
                {'erreur': 'Identifiants incorrects.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not utilisateur.est_actif:
            return Response(
                {'erreur': 'Votre compte est désactivé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Mettre à jour la dernière connexion
        utilisateur.derniere_connexion_enregistree = timezone.now()
        utilisateur.save(update_fields=['derniere_connexion_enregistree'])

        # Si admin, enregistrer la connexion
        if utilisateur.est_administrateur:
            try:
                ip = request.META.get('REMOTE_ADDR')
                enregistrer_connexion_admin(utilisateur.profil_admin, adresse_ip=ip)
            except Exception:
                pass

        tokens = RefreshToken.for_user(utilisateur)
        return Response({
            'message': 'Connexion réussie.',
            'utilisateur': UtilisateurSerializer(utilisateur).data,
            'tokens': {
                'access': str(tokens.access_token),
                'refresh': str(tokens),
            }
        })


class VueConnexionAdmin(APIView):
    """Connexion administrateur par matricule + mot de passe."""
    permission_classes = [AllowAny]
    throttle_classes = [ThrottleAuthentification]

    def post(self, request):
        serializer = ConnexionAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        matricule = serializer.validated_data['matricule'].strip()
        mot_de_passe = serializer.validated_data['mot_de_passe']

        # Chercher le profil admin par matricule
        try:
            profil_admin = ProfilAdministrateur.objects.select_related('utilisateur').get(matricule=matricule)
        except ProfilAdministrateur.DoesNotExist:
            logger_securite.warning(
                'Échec connexion admin | matricule=%s | IP=%s',
                matricule,
                request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')),
            )
            return Response(
                {'erreur': 'Matricule ou mot de passe incorrect.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        utilisateur = profil_admin.utilisateur

        # Vérifier le mot de passe
        if not utilisateur.check_password(mot_de_passe):
            logger_securite.warning(
                'Échec connexion admin (mdp) | matricule=%s | IP=%s',
                matricule,
                request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')),
            )
            return Response(
                {'erreur': 'Matricule ou mot de passe incorrect.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not utilisateur.est_actif:
            return Response(
                {'erreur': 'Votre compte est désactivé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not utilisateur.est_administrateur:
            return Response(
                {'erreur': 'Ce compte n\'est pas un compte administrateur.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Mettre à jour la dernière connexion
        utilisateur.derniere_connexion_enregistree = timezone.now()
        utilisateur.save(update_fields=['derniere_connexion_enregistree'])

        # Enregistrer la connexion admin
        try:
            ip = request.META.get('REMOTE_ADDR')
            enregistrer_connexion_admin(profil_admin, adresse_ip=ip)
        except Exception:
            pass

        tokens = RefreshToken.for_user(utilisateur)
        return Response({
            'message': 'Connexion réussie.',
            'utilisateur': UtilisateurSerializer(utilisateur).data,
            'tokens': {
                'access': str(tokens.access_token),
                'refresh': str(tokens),
            }
        })


class VueDeconnexion(APIView):
    """Déconnexion (invalidation du refresh token)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            # Si admin, enregistrer la déconnexion
            if request.user.est_administrateur:
                from .services import enregistrer_deconnexion_admin
                try:
                    enregistrer_deconnexion_admin(request.user.profil_admin)
                except Exception:
                    pass
        except Exception:
            pass

        return Response({'message': 'Déconnexion réussie.'})


class VueProfilUtilisateur(APIView):
    """Profil de l'utilisateur connecté."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        donnees = UtilisateurSerializer(request.user).data
        if request.user.est_agent:
            try:
                donnees['profil_agent'] = ProfilAgentSerializer(
                    request.user.profil_agent
                ).data
            except ProfilAgent.DoesNotExist:
                pass
        return Response(donnees)

    def patch(self, request):
        serializer = UtilisateurSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class VueProfilAgentEdition(APIView):
    """Édition du profil agent."""
    permission_classes = [IsAuthenticated, EstAgent]

    def patch(self, request):
        try:
            profil = request.user.profil_agent
        except ProfilAgent.DoesNotExist:
            return Response(
                {'erreur': 'Profil agent introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ProfilAgentEditionSerializer(profil, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfilAgentSerializer(profil).data)


class VueProfilAgentPublic(generics.RetrieveAPIView):
    """Profil public d'un agent."""
    permission_classes = [AllowAny]
    serializer_class = ProfilAgentSerializer
    queryset = ProfilAgent.objects.filter(utilisateur__est_actif=True)
    lookup_field = 'utilisateur_id'
    lookup_url_kwarg = 'agent_id'


class VueCreationAdmin(APIView):
    """Création d'un compte administrateur par le directeur."""
    permission_classes = [IsAuthenticated, EstDirecteur]

    def post(self, request):
        serializer = CreationAdminSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.save()

        # Journaliser l'action
        from .services import journaliser_action_admin
        try:
            journaliser_action_admin(
                request.user.profil_admin,
                action='Création administrateur',
                detail=f"Création du compte admin {utilisateur.email}",
                objet_type='Utilisateur',
                objet_id=utilisateur.id,
            )
        except Exception:
            pass

        return Response({
            'message': 'Compte administrateur créé avec succès.',
            'admin': ProfilAdministrateurSerializer(utilisateur.profil_admin).data,
        }, status=status.HTTP_201_CREATED)


# === Annonces (lecture seule côté utilisateur, aucune réponse possible) ===

class VueMesAnnonces(APIView):
    """Liste des annonces destinées à l'utilisateur connecté. Lecture seule."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.administration.models import Annonce
        from django.db.models import Q
        annonces = Annonce.objects.filter(
            Q(cible='tous') | Q(cible='specifique', destinataire=request.user)
        ).select_related('envoye_par').order_by('-date_envoi')[:50]
        donnees = [{
            'id': a.id,
            'titre': a.titre,
            'contenu': a.contenu,
            'date_envoi': a.date_envoi,
        } for a in annonces]
        return Response({'resultats': donnees})


# === Préoccupations (soumission via page Aide) ===

class VueSoumettrePreoccupation(APIView):
    """Soumettre une question/préoccupation via la page Aide."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Historique des préoccupations de l'utilisateur."""
        from apps.administration.models import Preoccupation
        preocs = Preoccupation.objects.filter(utilisateur=request.user).order_by('-date_creation')[:20]
        donnees = [{
            'id': p.id,
            'categorie': p.categorie,
            'sujet': p.sujet,
            'message': p.message,
            'statut': p.statut,
            'reponse': p.reponse,
            'date_creation': p.date_creation,
            'date_traitement': p.date_traitement,
        } for p in preocs]
        return Response({'resultats': donnees})

    def post(self, request):
        from apps.administration.models import Preoccupation
        categorie = nettoyer_texte(request.data.get('categorie', 'autre'))
        sujet = nettoyer_texte(request.data.get('sujet', ''))
        message = nettoyer_texte(request.data.get('message', ''))

        if not sujet or not message:
            return Response({'erreur': 'Sujet et message obligatoires.'}, status=400)
        if len(sujet) > 200:
            return Response({'erreur': 'Sujet trop long (200 caractères max).'}, status=400)

        preoc = Preoccupation.objects.create(
            utilisateur=request.user,
            categorie=categorie,
            sujet=sujet,
            message=message,
        )
        return Response({
            'message': 'Votre question a été envoyée. Nous vous répondrons bientôt.',
            'id': preoc.id,
        }, status=201)


# === Photo de profil (upload, modification, suppression) ===

class VuePhotoProfil(APIView):
    """Gestion de la photo de profil : upload, modification, suppression."""
    permission_classes = [IsAuthenticated]

    FORMATS_AUTORISES = ['image/jpeg', 'image/png', 'image/webp']
    TAILLE_MAX_OCTETS = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        """Ajouter ou modifier la photo de profil."""
        fichier = request.FILES.get('photo')
        if not fichier:
            return Response({'erreur': 'Aucun fichier envoyé.'}, status=400)

        # Validation du type MIME
        if fichier.content_type not in self.FORMATS_AUTORISES:
            return Response({'erreur': 'Format non autorisé. Utilisez JPG, PNG ou WEBP.'}, status=400)

        # Validation de la taille
        if fichier.size > self.TAILLE_MAX_OCTETS:
            return Response({'erreur': 'Image trop volumineuse (5 MB maximum).'}, status=400)

        # Compression et redimensionnement
        try:
            from PIL import Image
            import io
            img = Image.open(fichier)

            # Sécurité : vérifier que c'est bien une image
            img.verify()
            fichier.seek(0)
            img = Image.open(fichier)

            # Convertir en RGB si nécessaire (RGBA → RGB)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            # Redimensionner si trop grand (max 800x800)
            taille_max = 800
            if img.width > taille_max or img.height > taille_max:
                img.thumbnail((taille_max, taille_max), Image.LANCZOS)

            # Compresser en JPEG
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85, optimize=True)
            buffer.seek(0)

            from django.core.files.uploadedfile import InMemoryUploadedFile
            fichier_compresse = InMemoryUploadedFile(
                buffer, 'photo', f'profil_{request.user.id}.jpg',
                'image/jpeg', buffer.getbuffer().nbytes, None,
            )

            # Supprimer l'ancienne photo si elle existe
            if request.user.photo:
                try:
                    request.user.photo.delete(save=False)
                except Exception:
                    pass

            request.user.photo = fichier_compresse
            request.user.save(update_fields=['photo'])

            return Response({
                'message': 'Photo de profil mise à jour.',
                'photo_url': request.user.photo.url if request.user.photo else None,
            })

        except Exception as e:
            return Response({'erreur': f'Erreur lors du traitement de l\'image.'}, status=400)

    def delete(self, request):
        """Supprimer la photo de profil."""
        if request.user.photo:
            try:
                request.user.photo.delete(save=False)
            except Exception:
                pass
            request.user.photo = None
            request.user.save(update_fields=['photo'])
        return Response({'message': 'Photo de profil supprimée.'})
