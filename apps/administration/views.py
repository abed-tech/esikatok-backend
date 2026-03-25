"""
Vues API pour l'administration interne EsikaTok.
Gestion des admins, utilisateurs, agents, abonnements, boosts,
messagerie, logs, finances, paramètres et temps de travail.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db.models import Q, Sum, Count
from datetime import timedelta


class PaginationAdmin(PageNumberPagination):
    """Pagination standard pour les vues admin manuelles."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def paginer_queryset(view, queryset, request):
    """Utilitaire pour paginer un queryset dans une APIView manuelle."""
    paginator = PaginationAdmin()
    page = paginator.paginate_queryset(queryset, request, view=view)
    return page, paginator

from apps.comptes.models import (
    Utilisateur, ProfilAdministrateur, ProfilAgent,
    JournalConnexionAdmin, JournalActiviteAdmin,
)
from apps.comptes.serializers import (
    UtilisateurSerializer, ProfilAdministrateurSerializer,
    ProfilAgentSerializer,
)
from apps.comptes.permissions import (
    EstAdministrateur, EstDirecteur, EstModerateur,
    EstGestion,
)
from apps.comptes.services import journaliser_action_admin
from apps.abonnements.models import Abonnement
from apps.abonnements.serializers import AbonnementSerializer
from apps.boosts.models import BoostVideo
from apps.boosts.serializers import BoostVideoSerializer
from apps.paiements.models import TransactionPaiement
from apps.paiements.serializers import TransactionPaiementSerializer
from apps.messagerie.models import Conversation, Message
from apps.biens.models import BienImmobilier
from .models import FicheTravailMensuel, ActionMensuelleNotable, ParametrePlateforme, Annonce, Preoccupation
from .permissions import (
    PERMISSIONS_PAR_ROLE, LABELS_ROLES, MODULES_PAGES,
    obtenir_role_admin, obtenir_permissions_pour_role,
    obtenir_pages_accessibles, a_permission, permission_pour,
)


# === Permissions et session admin ===

class VueMesPermissions(APIView):
    """Retourne le rôle, les permissions et les pages accessibles de l'admin connecté."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def get(self, request):
        role = obtenir_role_admin(request.user)
        if not role:
            return Response({'erreur': 'Profil administrateur introuvable.'}, status=403)

        profil = request.user.profil_admin
        permissions = obtenir_permissions_pour_role(role)
        pages = obtenir_pages_accessibles(role)

        return Response({
            'admin_id': profil.id,
            'utilisateur_id': request.user.id,
            'nom_complet': request.user.nom_complet,
            'email': request.user.email,
            'matricule': profil.matricule,
            'role': role,
            'role_label': LABELS_ROLES.get(role, role),
            'permissions': permissions,
            'pages': pages,
        })


class VueBadgesAdmin(APIView):
    """Compteurs légers pour les badges sidebar admin (polling).
    Retourne uniquement les badges des sections auxquelles l'admin a accès."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def get(self, request):
        badges = {}

        if a_permission(request.user, 'preoccupations', 'lire'):
            badges['preoccupations_en_attente'] = Preoccupation.objects.filter(statut='en_attente').count()

        if a_permission(request.user, 'messagerie', 'lire'):
            badges['messages_non_lus'] = Message.objects.filter(est_lu=False).count()

        if a_permission(request.user, 'moderation', 'lire'):
            from apps.moderation.models import SoumissionModeration
            badges['moderation_en_attente'] = SoumissionModeration.objects.filter(statut='en_attente').count()

        if a_permission(request.user, 'utilisateurs', 'lire'):
            from datetime import timedelta as td
            seuil = timezone.now() - td(days=7)
            badges['utilisateurs_nouveaux'] = Utilisateur.objects.filter(
                type_compte='simple', date_inscription__gte=seuil
            ).count()

        if a_permission(request.user, 'agents', 'lire'):
            from datetime import timedelta as td
            seuil = timezone.now() - td(days=7)
            badges['agents_nouveaux'] = Utilisateur.objects.filter(
                type_compte='agent', date_inscription__gte=seuil
            ).count()

        if a_permission(request.user, 'abonnements', 'lire'):
            from datetime import timedelta as td
            seuil = timezone.now() + td(days=7)
            badges['abonnements_expirants'] = Abonnement.objects.filter(
                statut__in=['actif', 'essai'], date_fin__lte=seuil, date_fin__gte=timezone.now()
            ).count()

        if a_permission(request.user, 'boosts', 'lire'):
            badges['boosts_actifs'] = BoostVideo.objects.filter(
                statut='actif', date_fin__gte=timezone.now()
            ).count()

        if a_permission(request.user, 'biens', 'lire'):
            badges['biens_en_attente'] = BienImmobilier.objects.filter(statut='en_attente').count()

        return Response(badges)


class VueTableauDeBordParRole(APIView):
    """Tableau de bord dynamique selon le rôle de l'admin connecté."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def get(self, request):
        role = obtenir_role_admin(request.user)
        if not role:
            return Response({'erreur': 'Profil introuvable.'}, status=403)

        maintenant = timezone.now()
        donnees = {'role': role, 'role_label': LABELS_ROLES.get(role, role)}

        # --- Stats modération (moderateur, directeur) ---
        if a_permission(request.user, 'moderation', 'lire'):
            from apps.moderation.models import SoumissionModeration
            from apps.videos.models import Video
            donnees['moderation'] = {
                'en_attente': SoumissionModeration.objects.filter(statut='en_attente').count(),
                'approuvee': SoumissionModeration.objects.filter(statut='approuvee').count(),
                'refusee': SoumissionModeration.objects.filter(statut='refusee').count(),
                'suspendue': SoumissionModeration.objects.filter(statut='suspendue').count(),
                'videos_supprimees': Video.all_objects.filter(est_supprime=True).count(),
                'traitees_ce_mois': SoumissionModeration.objects.filter(
                    date_traitement__month=maintenant.month,
                    date_traitement__year=maintenant.year,
                ).count(),
            }

        # --- Stats utilisateurs (gestion, support, directeur) ---
        if a_permission(request.user, 'utilisateurs', 'lire'):
            donnees['utilisateurs'] = {
                'total': Utilisateur.objects.filter(type_compte='simple').count(),
                'actifs': Utilisateur.objects.filter(type_compte='simple', est_actif=True).count(),
                'bloques': Utilisateur.objects.filter(type_compte='simple', est_actif=False).count(),
            }

        # --- Stats agents (gestion, support, directeur) ---
        if a_permission(request.user, 'agents', 'lire'):
            donnees['agents'] = {
                'total': Utilisateur.objects.filter(type_compte='agent').count(),
                'actifs': Utilisateur.objects.filter(type_compte='agent', est_actif=True).count(),
                'suspendus': Utilisateur.objects.filter(type_compte='agent', est_actif=False).count(),
            }

        # --- Stats biens (moderateur, directeur) ---
        if a_permission(request.user, 'biens', 'lire'):
            donnees['biens'] = {
                'total': BienImmobilier.objects.count(),
                'publies': BienImmobilier.objects.filter(statut__in=['publie', 'approuve']).count(),
                'en_attente': BienImmobilier.objects.filter(statut='en_attente').count(),
                'refuses': BienImmobilier.objects.filter(statut='refuse').count(),
                'suspendus': BienImmobilier.objects.filter(statut='suspendu').count(),
            }

        # --- Stats abonnements (gestion, directeur) ---
        if a_permission(request.user, 'abonnements', 'lire'):
            donnees['abonnements'] = {
                'actifs': Abonnement.objects.filter(statut__in=['actif', 'essai'], date_fin__gte=maintenant).count(),
                'essais': Abonnement.objects.filter(statut='essai').count(),
                'expires': Abonnement.objects.filter(statut='expire').count(),
            }

        # --- Stats boosts (gestion, directeur) ---
        if a_permission(request.user, 'boosts', 'lire'):
            donnees['boosts'] = {
                'actifs': BoostVideo.objects.filter(statut='actif', date_fin__gte=maintenant).count(),
                'total': BoostVideo.objects.count(),
            }

        # --- Stats finances (gestion, directeur) ---
        if a_permission(request.user, 'finances', 'lire'):
            tx_reussies = TransactionPaiement.objects.filter(statut='reussie')
            debut_mois = maintenant.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            donnees['revenus'] = {
                'total_usd': float(tx_reussies.aggregate(t=Sum('montant'))['t'] or 0),
                'ce_mois_usd': float(tx_reussies.filter(date_validation__gte=debut_mois).aggregate(t=Sum('montant'))['t'] or 0),
            }

        # --- Stats messagerie (support, directeur) ---
        if a_permission(request.user, 'messagerie', 'lire'):
            donnees['messagerie'] = {
                'conversations': Conversation.objects.count(),
            }

        # --- Stats annonces (gestion, directeur) ---
        if a_permission(request.user, 'annonces', 'lire'):
            donnees['annonces'] = {
                'total': Annonce.objects.count(),
            }

        # --- Stats préoccupations (gestion, directeur) ---
        if a_permission(request.user, 'preoccupations', 'lire'):
            donnees['preoccupations'] = {
                'total': Preoccupation.objects.count(),
                'en_attente': Preoccupation.objects.filter(statut='en_attente').count(),
                'en_cours': Preoccupation.objects.filter(statut='en_cours').count(),
                'traitees': Preoccupation.objects.filter(statut='traitee').count(),
            }

        # --- Stats administrateurs (directeur uniquement) ---
        if a_permission(request.user, 'administrateurs', 'lire'):
            donnees['administrateurs'] = {
                'total': ProfilAdministrateur.objects.count(),
                'en_ligne': ProfilAdministrateur.objects.filter(est_en_ligne=True).count(),
            }

        # --- Activités récentes de cet admin ---
        activites = JournalActiviteAdmin.objects.filter(
            admin=request.user.profil_admin
        ).order_by('-date_action')[:10]
        donnees['mes_activites'] = [{
            'action': a.action,
            'detail': a.detail,
            'date': a.date_action,
        } for a in activites]

        return Response(donnees)


# === Gestion des utilisateurs ===

class VueListeUtilisateurs(generics.ListAPIView):
    """Liste des utilisateurs (simples et agents) avec recherche, filtres et tri."""
    permission_classes = [IsAuthenticated, permission_pour('utilisateurs', 'lire')]
    serializer_class = UtilisateurSerializer

    def get_queryset(self):
        queryset = Utilisateur.objects.exclude(type_compte='administrateur')
        type_filtre = self.request.query_params.get('type')
        if type_filtre:
            queryset = queryset.filter(type_compte=type_filtre)
        statut = self.request.query_params.get('statut')
        if statut == 'actif':
            queryset = queryset.filter(est_actif=True)
        elif statut == 'bloque':
            queryset = queryset.filter(est_actif=False)
        recherche = self.request.query_params.get('q')
        if recherche:
            queryset = queryset.filter(
                Q(nom__icontains=recherche) |
                Q(prenom__icontains=recherche) |
                Q(email__icontains=recherche) |
                Q(telephone__icontains=recherche)
            )
        tri = self.request.query_params.get('ordering', '-date_inscription')
        tris_autorises = ['date_inscription', '-date_inscription', 'nom', '-nom', 'email', '-email']
        if tri in tris_autorises:
            queryset = queryset.order_by(tri)
        else:
            queryset = queryset.order_by('-date_inscription')
        return queryset


class VueDetailUtilisateurAdmin(APIView):
    """Détail d'un utilisateur vu par l'admin."""
    permission_classes = [IsAuthenticated, permission_pour('utilisateurs', 'lire')]

    def get(self, request, pk):
        try:
            utilisateur = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'erreur': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        donnees = UtilisateurSerializer(utilisateur).data
        donnees['derniere_connexion'] = utilisateur.derniere_connexion_enregistree
        if utilisateur.est_agent:
            try:
                donnees['profil_agent'] = ProfilAgentSerializer(utilisateur.profil_agent).data
            except Exception:
                pass
            donnees['abonnements'] = AbonnementSerializer(
                Abonnement.objects.filter(agent=utilisateur).order_by('-date_debut')[:5], many=True
            ).data

        try:
            journaliser_action_admin(
                request.user.profil_admin, action='consulter utilisateur',
                detail=f"{utilisateur.email} (id={pk})",
                objet_type='Utilisateur', objet_id=pk,
            )
        except Exception:
            pass

        return Response(donnees)


class VueActiverDesactiverUtilisateur(APIView):
    """Activer ou désactiver un utilisateur."""
    permission_classes = [IsAuthenticated, permission_pour('utilisateurs', 'modifier')]

    def post(self, request, pk):
        try:
            utilisateur = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'erreur': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')  # 'activer' ou 'desactiver'
        if action == 'activer':
            utilisateur.est_actif = True
            msg = 'Utilisateur activé.'
        elif action == 'desactiver':
            utilisateur.est_actif = False
            msg = 'Utilisateur désactivé.'
        else:
            return Response({'erreur': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        utilisateur.save(update_fields=['est_actif'])

        try:
            journaliser_action_admin(
                request.user.profil_admin, action=f'{action} utilisateur',
                detail=f"{utilisateur.email}", objet_type='Utilisateur', objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': msg})


class VueSupprimerUtilisateur(APIView):
    """Supprimer un utilisateur."""
    permission_classes = [IsAuthenticated, permission_pour('utilisateurs', 'supprimer')]

    def delete(self, request, pk):
        try:
            utilisateur = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'erreur': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if utilisateur.est_administrateur:
            return Response({'erreur': 'Impossible de supprimer un administrateur ici.'}, status=status.HTTP_403_FORBIDDEN)

        email = utilisateur.email
        utilisateur.delete()

        try:
            journaliser_action_admin(
                request.user.profil_admin, action='supprimer utilisateur',
                detail=email, objet_type='Utilisateur', objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': 'Utilisateur supprimé.'})


# === Gestion des agents ===

class VueListeAgentsAdmin(APIView):
    """Liste des agents avec données enrichies, pagination et recherche."""
    permission_classes = [IsAuthenticated, permission_pour('agents', 'lire')]

    def get(self, request):
        from django.db.models import Prefetch

        recherche = request.query_params.get('q', '')
        statut = request.query_params.get('statut', '')
        tri = request.query_params.get('ordering', '-date_inscription')

        queryset = Utilisateur.objects.filter(
            type_compte='agent'
        ).select_related(
            'profil_agent',
        ).annotate(
            _nombre_biens=Count('biens', distinct=True),
            _nombre_biens_publies=Count('biens', filter=Q(biens__statut__in=['publie', 'approuve']), distinct=True),
        ).prefetch_related(
            Prefetch(
                'abonnements',
                queryset=Abonnement.objects.filter(
                    statut__in=['actif', 'essai']
                ).select_related('plan').order_by('-date_debut'),
                to_attr='_abonnements_actifs',
            ),
        )

        if recherche:
            queryset = queryset.filter(
                Q(nom__icontains=recherche) |
                Q(prenom__icontains=recherche) |
                Q(email__icontains=recherche)
            )
        if statut == 'actif':
            queryset = queryset.filter(est_actif=True)
        elif statut == 'suspendu':
            queryset = queryset.filter(est_actif=False)

        tris_autorises = ['date_inscription', '-date_inscription', 'nom', '-nom', 'email', '-email']
        if tri in tris_autorises:
            queryset = queryset.order_by(tri)
        else:
            queryset = queryset.order_by('-date_inscription')

        page, paginator = paginer_queryset(self, queryset, request)

        donnees = []
        for agent in page:
            agent_data = {
                'id': agent.id,
                'nom': agent.nom,
                'prenom': agent.prenom,
                'email': agent.email,
                'telephone': agent.telephone,
                'est_actif': agent.est_actif,
                'date_inscription': agent.date_inscription,
                'nombre_biens': agent._nombre_biens,
                'nombre_biens_publies': agent._nombre_biens_publies,
            }
            try:
                profil = agent.profil_agent
                agent_data['nom_professionnel'] = profil.nom_professionnel
                agent_data['est_verifie_agent'] = profil.est_verifie_agent
            except Exception:
                agent_data['nom_professionnel'] = ''
                agent_data['est_verifie_agent'] = False

            abos_actifs = getattr(agent, '_abonnements_actifs', [])
            if abos_actifs:
                abo = abos_actifs[0]
                agent_data['abonnement'] = {
                    'plan': abo.plan.nom,
                    'statut': abo.statut,
                    'date_fin': abo.date_fin,
                }
            else:
                agent_data['abonnement'] = None

            donnees.append(agent_data)

        return paginator.get_paginated_response(donnees)


class VueDetailAgentAdmin(APIView):
    """Détail complet d'un agent."""
    permission_classes = [IsAuthenticated, permission_pour('agents', 'lire')]

    def get(self, request, pk):
        try:
            agent = Utilisateur.objects.get(pk=pk, type_compte='agent')
        except Utilisateur.DoesNotExist:
            return Response({'erreur': 'Agent introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        donnees = UtilisateurSerializer(agent).data
        try:
            donnees['profil_agent'] = ProfilAgentSerializer(agent.profil_agent).data
        except Exception:
            pass

        donnees['abonnements'] = AbonnementSerializer(
            Abonnement.objects.filter(agent=agent).order_by('-date_debut')[:10], many=True
        ).data
        donnees['nombre_biens'] = agent.biens.count()
        donnees['nombre_biens_publies'] = agent.biens.filter(statut__in=['publie', 'approuve']).count()
        donnees['nombre_boosts'] = BoostVideo.objects.filter(agent=agent).count()
        donnees['revenus_generes'] = float(
            TransactionPaiement.objects.filter(
                utilisateur=agent, statut='reussie'
            ).aggregate(total=Sum('montant'))['total'] or 0
        )
        donnees['biens'] = list(
            agent.biens.values('id', 'titre', 'type_bien', 'prix', 'statut', 'nombre_vues')
            .order_by('-date_creation')[:20]
        )
        donnees['derniere_connexion'] = agent.derniere_connexion_enregistree

        try:
            journaliser_action_admin(
                request.user.profil_admin, action='consulter agent',
                detail=f"{agent.email} (id={pk})",
                objet_type='Agent', objet_id=pk,
            )
        except Exception:
            pass

        return Response(donnees)


class VueActionAgentAdmin(APIView):
    """Activer/suspendre un agent."""
    permission_classes = [IsAuthenticated, permission_pour('agents', 'modifier')]

    def post(self, request, pk):
        try:
            agent = Utilisateur.objects.get(pk=pk, type_compte='agent')
        except Utilisateur.DoesNotExist:
            return Response({'erreur': 'Agent introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'activer':
            agent.est_actif = True
            msg = 'Agent activé.'
        elif action == 'suspendre':
            agent.est_actif = False
            msg = 'Agent suspendu.'
        else:
            return Response({'erreur': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        agent.save(update_fields=['est_actif'])

        try:
            journaliser_action_admin(
                request.user.profil_admin, action=f'{action} agent',
                detail=agent.email, objet_type='Agent', objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': msg})


# === Gestion des biens (admin) ===

class VueListeBiensAdmin(APIView):
    """Liste de tous les biens avec filtres, recherche et pagination."""
    permission_classes = [IsAuthenticated, permission_pour('biens', 'lire')]

    def get(self, request):
        from apps.biens.serializers import BienImmobilierDetailSerializer

        recherche = request.query_params.get('q', '')
        statut = request.query_params.get('statut', '')
        type_bien = request.query_params.get('type_bien', '')

        queryset = BienImmobilier.objects.select_related(
            'agent', 'ville', 'commune'
        ).prefetch_related('images', 'video').order_by('-date_creation')

        if statut:
            queryset = queryset.filter(statut=statut)
        if type_bien:
            queryset = queryset.filter(type_bien=type_bien)
        if recherche:
            queryset = queryset.filter(
                Q(titre__icontains=recherche) |
                Q(agent__nom__icontains=recherche) |
                Q(agent__prenom__icontains=recherche) |
                Q(agent__email__icontains=recherche) |
                Q(commune__nom__icontains=recherche)
            )

        page, paginator = paginer_queryset(self, queryset, request)
        donnees = BienImmobilierDetailSerializer(
            page, many=True, context={'request': request}
        ).data
        return paginator.get_paginated_response(donnees)


class VueSupprimerBienAdmin(APIView):
    """Supprimer un bien immobilier (y compris sa vidéo et ses images)."""
    permission_classes = [IsAuthenticated, permission_pour('biens', 'supprimer')]

    def delete(self, request, pk):
        try:
            bien = BienImmobilier.objects.select_related('agent').get(pk=pk)
        except BienImmobilier.DoesNotExist:
            return Response(
                {'erreur': 'Bien introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        titre = bien.titre
        agent_email = bien.agent.email
        bien.delete()

        try:
            journaliser_action_admin(
                request.user.profil_admin,
                action='supprimer bien',
                detail=f'Bien: {titre} (agent: {agent_email})',
                objet_type='BienImmobilier',
                objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': f'Bien « {titre} » supprimé avec succès.'})


class VueRetirerBienAdmin(APIView):
    """Retirer (suspendre) un bien déjà approuvé ou publié."""
    permission_classes = [IsAuthenticated, permission_pour('biens', 'modifier')]

    def post(self, request, pk):
        try:
            bien = BienImmobilier.objects.select_related('agent').get(pk=pk)
        except BienImmobilier.DoesNotExist:
            return Response(
                {'erreur': 'Bien introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if bien.statut not in ('publie', 'approuve'):
            return Response(
                {'erreur': f'Ce bien est déjà en statut « {bien.statut} ». Seuls les biens publiés ou approuvés peuvent être retirés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        motif = request.data.get('motif', '')
        if not motif.strip():
            return Response(
                {'erreur': 'Un motif est obligatoire pour retirer un bien.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = bien.statut
        bien.statut = 'suspendu'
        bien.save(update_fields=['statut'])

        try:
            journaliser_action_admin(
                request.user.profil_admin,
                action='retirer bien',
                detail=f'Bien: {bien.titre} (agent: {bien.agent.email}) — Motif: {motif}',
                objet_type='BienImmobilier',
                objet_id=pk,
            )
        except Exception:
            pass

        return Response({
            'message': f'Bien « {bien.titre} » retiré avec succès (statut: {ancien_statut} → suspendu).',
            'motif': motif,
        })


# === Suppression logique de vidéos (admin) ===

class VueSupprimerVideoAdmin(APIView):
    """Suppression logique (soft-delete) d'une vidéo par un administrateur."""
    permission_classes = [IsAuthenticated, permission_pour('videos', 'supprimer')]

    def post(self, request, pk):
        from apps.videos.models import Video

        try:
            video = Video.all_objects.select_related('bien__agent').get(pk=pk)
        except Video.DoesNotExist:
            return Response(
                {'erreur': 'Vidéo introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if video.est_supprime:
            return Response(
                {'erreur': 'Cette vidéo est déjà supprimée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        motif = request.data.get('motif', '')
        video.supprimer_logiquement(admin=request.user, motif=motif)

        # Suspendre aussi le bien associé s'il est publié
        bien = video.bien
        if bien.statut in ('publie', 'approuve'):
            bien.statut = 'suspendu'
            bien.save(update_fields=['statut'])

        try:
            journaliser_action_admin(
                request.user.profil_admin,
                action='supprimer vidéo (soft-delete)',
                detail=f'Vidéo #{video.id} — Bien: {bien.titre} (agent: {bien.agent.email}) — Motif: {motif or "Non précisé"}',
                objet_type='Video',
                objet_id=pk,
            )
        except Exception:
            pass

        return Response({
            'message': f'Vidéo du bien « {bien.titre} » supprimée avec succès.',
            'video_id': video.id,
            'bien_id': bien.id,
        })


class VueHistoriqueSuppressionsVideos(APIView):
    """Historique de toutes les vidéos supprimées (audit trail)."""
    permission_classes = [IsAuthenticated, permission_pour('videos', 'lire')]

    def get(self, request):
        from apps.videos.models import Video

        queryset = Video.all_objects.filter(
            est_supprime=True
        ).select_related(
            'bien__agent', 'bien__ville', 'bien__commune', 'supprime_par'
        ).order_by('-date_suppression')

        recherche = request.query_params.get('q', '')
        if recherche:
            queryset = queryset.filter(
                Q(bien__titre__icontains=recherche) |
                Q(bien__agent__nom__icontains=recherche) |
                Q(bien__agent__email__icontains=recherche) |
                Q(supprime_par__nom__icontains=recherche)
            )

        page, paginator = paginer_queryset(self, queryset, request)

        donnees = []
        for video in page:
            donnees.append({
                'id': video.id,
                'bien_id': video.bien_id,
                'bien_titre': video.bien.titre,
                'agent_nom': video.bien.agent.nom_complet if video.bien.agent else 'N/A',
                'agent_email': video.bien.agent.email if video.bien.agent else 'N/A',
                'date_upload': video.date_upload,
                'date_suppression': video.date_suppression,
                'supprime_par': video.supprime_par.nom_complet if video.supprime_par else 'N/A',
                'supprime_par_email': video.supprime_par.email if video.supprime_par else 'N/A',
                'supprime_par_role': getattr(getattr(video.supprime_par, 'profil_admin', None), 'role_admin', 'N/A') if video.supprime_par else 'N/A',
                'supprime_par_role_label': LABELS_ROLES.get(getattr(getattr(video.supprime_par, 'profil_admin', None), 'role_admin', ''), 'N/A') if video.supprime_par else 'N/A',
                'motif_suppression': video.motif_suppression,
                'bien_statut': video.bien.statut,
            })

        return paginator.get_paginated_response(donnees)


# === Gestion des administrateurs ===

class VueListeAdmins(generics.ListAPIView):
    """Liste des administrateurs."""
    permission_classes = [IsAuthenticated, permission_pour('administrateurs', 'lire')]
    serializer_class = ProfilAdministrateurSerializer
    queryset = ProfilAdministrateur.objects.select_related('utilisateur').order_by('-date_creation')


class VueDetailAdmin(APIView):
    """Détail d'un administrateur avec journaux."""
    permission_classes = [IsAuthenticated, permission_pour('administrateurs', 'lire')]

    def get(self, request, pk):
        try:
            admin = ProfilAdministrateur.objects.select_related('utilisateur').get(pk=pk)
        except ProfilAdministrateur.DoesNotExist:
            return Response({'erreur': 'Administrateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        connexions = JournalConnexionAdmin.objects.filter(admin=admin).order_by('-heure_connexion')[:20]
        activites = JournalActiviteAdmin.objects.filter(admin=admin).order_by('-date_action')[:50]

        return Response({
            'admin': ProfilAdministrateurSerializer(admin).data,
            'connexions': [
                {
                    'heure_connexion': c.heure_connexion,
                    'heure_deconnexion': c.heure_deconnexion,
                    'duree_minutes': c.duree_session_minutes,
                    'ip': c.adresse_ip,
                }
                for c in connexions
            ],
            'activites': [
                {
                    'action': a.action,
                    'detail': a.detail,
                    'date': a.date_action,
                }
                for a in activites
            ],
        })


class VueModifierRoleAdmin(APIView):
    """Modifier le rôle d'un administrateur."""
    permission_classes = [IsAuthenticated, permission_pour('administrateurs', 'modifier')]

    def patch(self, request, pk):
        try:
            admin = ProfilAdministrateur.objects.get(pk=pk)
        except ProfilAdministrateur.DoesNotExist:
            return Response({'erreur': 'Administrateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        nouveau_role = request.data.get('role_admin')
        if not nouveau_role:
            return Response({'erreur': 'Rôle requis.'}, status=status.HTTP_400_BAD_REQUEST)

        if nouveau_role == 'directeur':
            return Response({'erreur': 'Impossible d\'attribuer le rôle Directeur.'}, status=status.HTTP_400_BAD_REQUEST)

        if admin.role_admin == 'directeur':
            return Response({'erreur': 'Impossible de modifier le rôle du Directeur.'}, status=status.HTTP_400_BAD_REQUEST)

        roles_valides = ['gestion', 'moderateur', 'support']
        if nouveau_role not in roles_valides:
            return Response({'erreur': f'Rôle invalide. Rôles acceptés : {", ".join(roles_valides)}'}, status=status.HTTP_400_BAD_REQUEST)

        admin.role_admin = nouveau_role
        admin.save(update_fields=['role_admin'])

        try:
            journaliser_action_admin(
                request.user.profil_admin, action='modifier rôle admin',
                detail=f"{admin.utilisateur.email} → {nouveau_role}",
                objet_type='ProfilAdministrateur', objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': 'Rôle modifié.'})


class VueSupprimerAdmin(APIView):
    """Supprimer un administrateur."""
    permission_classes = [IsAuthenticated, permission_pour('administrateurs', 'supprimer')]

    def delete(self, request, pk):
        try:
            admin = ProfilAdministrateur.objects.select_related('utilisateur').get(pk=pk)
        except ProfilAdministrateur.DoesNotExist:
            return Response({'erreur': 'Administrateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if admin.utilisateur == request.user:
            return Response({'erreur': 'Vous ne pouvez pas supprimer votre propre compte.'}, status=status.HTTP_403_FORBIDDEN)

        if admin.role_admin == 'directeur':
            return Response({'erreur': 'Impossible de supprimer le compte Directeur.'}, status=status.HTTP_403_FORBIDDEN)

        email = admin.utilisateur.email
        admin.utilisateur.delete()

        try:
            journaliser_action_admin(
                request.user.profil_admin, action='supprimer admin',
                detail=email, objet_type='ProfilAdministrateur', objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': 'Administrateur supprimé.'})


# === Gestion abonnements (admin) ===

class VueListeAbonnementsAdmin(generics.ListAPIView):
    """Liste de tous les abonnements avec recherche et filtres."""
    permission_classes = [IsAuthenticated, permission_pour('abonnements', 'lire')]
    serializer_class = AbonnementSerializer

    def get_queryset(self):
        queryset = Abonnement.objects.select_related('agent', 'plan').order_by('-date_debut')
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        recherche = self.request.query_params.get('q')
        if recherche:
            queryset = queryset.filter(
                Q(agent__nom__icontains=recherche) |
                Q(agent__prenom__icontains=recherche) |
                Q(agent__email__icontains=recherche) |
                Q(plan__nom__icontains=recherche)
            )
        return queryset


class VueActionAbonnementAdmin(APIView):
    """Activer/suspendre/modifier un abonnement."""
    permission_classes = [IsAuthenticated, permission_pour('abonnements', 'modifier')]

    def post(self, request, pk):
        try:
            abonnement = Abonnement.objects.get(pk=pk)
        except Abonnement.DoesNotExist:
            return Response({'erreur': 'Abonnement introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'activer':
            abonnement.statut = 'actif'
            msg = 'Abonnement activé.'
        elif action == 'suspendre':
            abonnement.statut = 'suspendu'
            msg = 'Abonnement suspendu.'
        elif action == 'modifier_plan':
            plan_id = request.data.get('plan_id')
            from apps.abonnements.models import PlanAbonnement
            try:
                nouveau_plan = PlanAbonnement.objects.get(pk=plan_id)
                abonnement.plan = nouveau_plan
                msg = f'Plan modifié vers {nouveau_plan.nom}.'
            except PlanAbonnement.DoesNotExist:
                return Response({'erreur': 'Plan introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'erreur': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        abonnement.save()

        try:
            journaliser_action_admin(
                request.user.profil_admin, action=f'{action} abonnement',
                detail=f"Abonnement #{pk}", objet_type='Abonnement', objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': msg})


# === Gestion boosts (admin) ===

class VueListeBoostsAdmin(generics.ListAPIView):
    """Liste de tous les boosts avec recherche et filtres."""
    permission_classes = [IsAuthenticated, permission_pour('boosts', 'lire')]
    serializer_class = BoostVideoSerializer

    def get_queryset(self):
        queryset = BoostVideo.objects.select_related('video__bien', 'agent').order_by('-date_debut')
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(source=source)
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        recherche = self.request.query_params.get('q')
        if recherche:
            queryset = queryset.filter(
                Q(agent__nom__icontains=recherche) |
                Q(agent__prenom__icontains=recherche) |
                Q(video__bien__titre__icontains=recherche)
            )
        return queryset


class VueSuspendreBoost(APIView):
    """Suspendre ou réactiver un boost."""
    permission_classes = [IsAuthenticated, permission_pour('boosts', 'modifier')]

    def post(self, request, pk):
        try:
            boost = BoostVideo.objects.get(pk=pk)
        except BoostVideo.DoesNotExist:
            return Response({'erreur': 'Boost introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'suspendre':
            boost.statut = 'suspendu'
            boost.video.bien.est_booste = False
            boost.video.bien.save(update_fields=['est_booste'])
            msg = 'Boost suspendu.'
        elif action == 'reactiver':
            boost.statut = 'actif'
            boost.video.bien.est_booste = True
            boost.video.bien.save(update_fields=['est_booste'])
            msg = 'Boost réactivé.'
        else:
            return Response({'erreur': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        boost.save(update_fields=['statut'])
        return Response({'message': msg})


# === Gestion transactions (admin) ===

class VueListeTransactionsAdmin(generics.ListAPIView):
    """Liste de toutes les transactions avec recherche et filtres."""
    permission_classes = [IsAuthenticated, permission_pour('finances', 'lire')]
    serializer_class = TransactionPaiementSerializer

    def get_queryset(self):
        queryset = TransactionPaiement.objects.select_related('utilisateur').order_by('-date_creation')
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        type_tx = self.request.query_params.get('type')
        if type_tx:
            queryset = queryset.filter(type_transaction=type_tx)
        recherche = self.request.query_params.get('q')
        if recherche:
            queryset = queryset.filter(
                Q(reference__icontains=recherche) |
                Q(utilisateur__nom__icontains=recherche) |
                Q(utilisateur__prenom__icontains=recherche) |
                Q(utilisateur__email__icontains=recherche)
            )
        return queryset


# === Messagerie Admin ===

class VueListeConversationsAdmin(APIView):
    """Liste de toutes les conversations pour l'admin avec pagination et recherche."""
    permission_classes = [IsAuthenticated, permission_pour('messagerie', 'lire')]

    def get(self, request):
        from django.db.models import Subquery, OuterRef, CharField
        from django.db.models.functions import Substr

        recherche = request.query_params.get('q', '')
        dernier_msg_sub = Message.objects.filter(
            conversation=OuterRef('pk')
        ).order_by('-date_envoi').values('contenu')[:1]

        queryset = Conversation.objects.select_related(
            'initiateur', 'agent', 'bien'
        ).annotate(
            _nombre_messages=Count('messages'),
            _dernier_message=Substr(Subquery(dernier_msg_sub, output_field=CharField()), 1, 100),
        ).order_by('-date_dernier_message')

        if recherche:
            queryset = queryset.filter(
                Q(initiateur__nom__icontains=recherche) |
                Q(initiateur__prenom__icontains=recherche) |
                Q(agent__nom__icontains=recherche) |
                Q(agent__prenom__icontains=recherche) |
                Q(bien__titre__icontains=recherche)
            )

        page, paginator = paginer_queryset(self, queryset, request)

        donnees = []
        for conv in page:
            donnees.append({
                'id': conv.id,
                'initiateur': {
                    'id': conv.initiateur.id,
                    'nom': conv.initiateur.nom_complet,
                    'email': conv.initiateur.email,
                },
                'agent': {
                    'id': conv.agent.id,
                    'nom': conv.agent.nom_complet,
                    'email': conv.agent.email,
                },
                'bien': {
                    'id': conv.bien.id if conv.bien else None,
                    'titre': conv.bien.titre if conv.bien else 'N/A',
                },
                'est_active': conv.est_active,
                'nombre_messages': conv._nombre_messages,
                'dernier_message': conv._dernier_message or '',
                'date_creation': conv.date_creation,
                'date_dernier_message': conv.date_dernier_message,
            })

        return paginator.get_paginated_response(donnees)


class VueMessagesConversationAdmin(APIView):
    """Voir les messages d'une conversation."""
    permission_classes = [IsAuthenticated, permission_pour('messagerie', 'lire')]

    def get(self, request, pk):
        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'erreur': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        messages = conversation.messages.select_related('expediteur').order_by('date_envoi')
        donnees = [{
            'id': msg.id,
            'expediteur': {
                'id': msg.expediteur.id,
                'nom': msg.expediteur.nom_complet,
                'type': msg.expediteur.type_compte,
            },
            'contenu': msg.contenu,
            'est_lu': msg.est_lu,
            'date_envoi': msg.date_envoi,
        } for msg in messages]

        return Response({
            'conversation_id': conversation.id,
            'messages': donnees,
        })


class VueSupprimerMessageAdmin(APIView):
    """Supprimer un message."""
    permission_classes = [IsAuthenticated, permission_pour('messagerie', 'supprimer')]

    def delete(self, request, pk):
        try:
            message = Message.objects.get(pk=pk)
        except Message.DoesNotExist:
            return Response({'erreur': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        message.delete()

        try:
            journaliser_action_admin(
                request.user.profil_admin, action='supprimer message',
                detail=f"Message #{pk}", objet_type='Message', objet_id=pk,
            )
        except Exception:
            pass

        return Response({'message': 'Message supprimé.'})


# === Logs / Activités ===

class VueLogsConnexionAdmin(APIView):
    """Liste des journaux de connexion des administrateurs avec pagination."""
    permission_classes = [IsAuthenticated, permission_pour('activites', 'lire')]

    def get(self, request):
        admin_id = request.query_params.get('admin_id')
        queryset = JournalConnexionAdmin.objects.select_related(
            'admin__utilisateur'
        ).order_by('-heure_connexion')

        if admin_id:
            queryset = queryset.filter(admin_id=admin_id)

        page, paginator = paginer_queryset(self, queryset, request)

        donnees = [{
            'id': log.id,
            'admin_nom': log.admin.utilisateur.nom_complet,
            'admin_matricule': log.admin.matricule,
            'admin_role': log.admin.role_admin,
            'heure_connexion': log.heure_connexion,
            'heure_deconnexion': log.heure_deconnexion,
            'duree_minutes': log.duree_session_minutes,
            'ip': log.adresse_ip,
        } for log in page]

        return paginator.get_paginated_response(donnees)


class VueLogsActiviteAdmin(APIView):
    """Liste des journaux d'activité des administrateurs avec pagination."""
    permission_classes = [IsAuthenticated, permission_pour('activites', 'lire')]

    def get(self, request):
        admin_id = request.query_params.get('admin_id')
        recherche = request.query_params.get('q', '')
        queryset = JournalActiviteAdmin.objects.select_related(
            'admin__utilisateur'
        ).order_by('-date_action')

        if admin_id:
            queryset = queryset.filter(admin_id=admin_id)
        if recherche:
            queryset = queryset.filter(
                Q(action__icontains=recherche) |
                Q(detail__icontains=recherche) |
                Q(admin__utilisateur__nom__icontains=recherche)
            )

        page, paginator = paginer_queryset(self, queryset, request)

        donnees = [{
            'id': log.id,
            'admin_nom': log.admin.utilisateur.nom_complet,
            'admin_matricule': log.admin.matricule,
            'action': log.action,
            'detail': log.detail,
            'objet_type': log.objet_type,
            'objet_id': log.objet_id,
            'date_action': log.date_action,
        } for log in page]

        return paginator.get_paginated_response(donnees)


# === Finances ===

class VueFinancesAdmin(APIView):
    """Vue détaillée des finances de la plateforme."""
    permission_classes = [IsAuthenticated, permission_pour('finances', 'lire')]

    def get(self, request):
        from django.db.models.functions import TruncMonth

        maintenant = timezone.now()
        debut_mois = maintenant.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        debut_6_mois = (maintenant - timedelta(days=180)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        tx_reussies = TransactionPaiement.objects.filter(statut='reussie')

        # Revenus par type (1 seule requête)
        revenus_par_type = tx_reussies.values('type_transaction').annotate(
            total=Sum('montant')
        )
        rev_map = {r['type_transaction']: float(r['total'] or 0) for r in revenus_par_type}
        revenus_abonnements = rev_map.get('abonnement', 0)
        revenus_boosts = rev_map.get('boost', 0)
        revenus_renouvellements = rev_map.get('renouvellement', 0)

        # Revenus ce mois par type (1 seule requête)
        revenus_mois_par_type = tx_reussies.filter(
            date_validation__gte=debut_mois,
        ).values('type_transaction').annotate(
            total=Sum('montant')
        )
        rev_mois_map = {r['type_transaction']: float(r['total'] or 0) for r in revenus_mois_par_type}
        revenus_mois_abonnements = rev_mois_map.get('abonnement', 0)
        revenus_mois_boosts = rev_mois_map.get('boost', 0)

        # Revenus par moyen de paiement
        par_moyen = tx_reussies.values('moyen_paiement').annotate(
            total=Sum('montant'), nombre=Count('id')
        ).order_by('-total')

        # Revenus mensuels (6 derniers mois, 1 seule requête)
        revenus_mensuels_qs = tx_reussies.filter(
            date_validation__gte=debut_6_mois
        ).annotate(
            mois=TruncMonth('date_validation')
        ).values('mois').annotate(
            total=Sum('montant')
        ).order_by('mois')

        revenus_mensuels = [
            {
                'mois': r['mois'].strftime('%Y-%m'),
                'label': r['mois'].strftime('%b %Y'),
                'total': float(r['total'] or 0),
            }
            for r in revenus_mensuels_qs
        ]

        # Dernières transactions
        dernieres = tx_reussies.order_by('-date_validation')[:20]

        return Response({
            'total_general': float(revenus_abonnements + revenus_boosts + revenus_renouvellements),
            'revenus_abonnements': float(revenus_abonnements),
            'revenus_boosts': float(revenus_boosts),
            'revenus_renouvellements': float(revenus_renouvellements),
            'ce_mois': {
                'total': float(revenus_mois_abonnements + revenus_mois_boosts),
                'abonnements': float(revenus_mois_abonnements),
                'boosts': float(revenus_mois_boosts),
            },
            'par_moyen_paiement': [
                {
                    'moyen': m['moyen_paiement'],
                    'total': float(m['total']),
                    'nombre': m['nombre'],
                }
                for m in par_moyen
            ],
            'revenus_mensuels': revenus_mensuels,
            'dernieres_transactions': TransactionPaiementSerializer(dernieres, many=True).data,
        })


# === Paramètres ===

class VueParametresAdmin(APIView):
    """Gestion des paramètres de la plateforme."""
    permission_classes = [IsAuthenticated, permission_pour('parametres', 'lire')]

    def get(self, request):
        parametres = ParametrePlateforme.objects.all()
        donnees = [{
            'id': p.id,
            'cle': p.cle,
            'valeur': p.valeur,
            'description': p.description,
            'type_donnee': p.type_donnee,
            'date_modification': p.date_modification,
        } for p in parametres]
        return Response(donnees)

    def post(self, request):
        """Créer ou mettre à jour un paramètre."""
        cle = request.data.get('cle')
        valeur = request.data.get('valeur', '')
        description = request.data.get('description', '')
        type_donnee = request.data.get('type_donnee', 'texte')

        if not cle:
            return Response({'erreur': 'Clé requise.'}, status=status.HTTP_400_BAD_REQUEST)

        param, created = ParametrePlateforme.objects.update_or_create(
            cle=cle,
            defaults={
                'valeur': valeur,
                'description': description,
                'type_donnee': type_donnee,
                'modifie_par': request.user,
            }
        )

        try:
            journaliser_action_admin(
                request.user.profil_admin, action='modifier paramètre',
                detail=f"{cle} = {valeur[:50]}", objet_type='ParametrePlateforme', objet_id=param.id,
            )
        except Exception:
            pass

        return Response({
            'message': 'Paramètre enregistré.',
            'id': param.id,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        """Supprimer un paramètre."""
        cle = request.data.get('cle')
        try:
            param = ParametrePlateforme.objects.get(cle=cle)
            param.delete()
            return Response({'message': 'Paramètre supprimé.'})
        except ParametrePlateforme.DoesNotExist:
            return Response({'erreur': 'Paramètre introuvable.'}, status=status.HTTP_404_NOT_FOUND)


# === Temps de travail ===

class VueFichesTravailAdmin(APIView):
    """Fiches de travail mensuelles des administrateurs."""
    permission_classes = [IsAuthenticated, permission_pour('fiches_travail', 'lire')]

    def get(self, request):
        mois = request.query_params.get('mois', timezone.now().month)
        annee = request.query_params.get('annee', timezone.now().year)

        fiches = FicheTravailMensuel.objects.filter(
            mois=mois, annee=annee
        ).select_related('admin__utilisateur')

        donnees = []
        for fiche in fiches:
            donnees.append({
                'id': fiche.id,
                'admin': ProfilAdministrateurSerializer(fiche.admin).data,
                'heures_travaillees': float(fiche.heures_travaillees),
                'heures_supplementaires': float(fiche.heures_supplementaires),
                'salaire_base_usd': float(fiche.salaire_base_usd),
                'prime_heures_sup_usd': float(fiche.prime_heures_sup_usd),
                'total_usd': float(fiche.total_usd),
                'est_valide': fiche.est_valide,
                'notes': fiche.notes,
            })

        return Response(donnees)

    def post(self, request):
        """Créer ou mettre à jour une fiche de travail."""
        admin_id = request.data.get('admin_id')
        mois = request.data.get('mois', timezone.now().month)
        annee = request.data.get('annee', timezone.now().year)

        try:
            admin = ProfilAdministrateur.objects.get(pk=admin_id)
        except ProfilAdministrateur.DoesNotExist:
            return Response({'erreur': 'Administrateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Calculer les heures depuis les journaux de connexion
        connexions = JournalConnexionAdmin.objects.filter(
            admin=admin,
            heure_connexion__month=mois,
            heure_connexion__year=annee,
        )
        heures_total = sum(c.duree_session_minutes for c in connexions) / 60

        fiche, created = FicheTravailMensuel.objects.update_or_create(
            admin=admin, mois=mois, annee=annee,
            defaults={
                'heures_travaillees': heures_total,
                'salaire_base_usd': request.data.get('salaire_base', 0),
                'notes': request.data.get('notes', ''),
            }
        )

        return Response({
            'message': 'Fiche de travail enregistrée.',
            'fiche_id': fiche.id,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# === Annonces (Plateforme → Utilisateurs) ===

class VueListeAnnoncesAdmin(APIView):
    """Liste et création d'annonces. Accessible au Gestionnaire et Directeur."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def get(self, request):
        if not a_permission(request.user, 'annonces', 'lire'):
            return Response({'erreur': 'Accès refusé.'}, status=403)
        annonces = Annonce.objects.select_related('destinataire', 'envoye_par').all()
        donnees = [{
            'id': a.id,
            'titre': a.titre,
            'contenu': a.contenu,
            'cible': a.cible,
            'destinataire_id': a.destinataire_id,
            'destinataire_nom': a.destinataire.nom_complet if a.destinataire else None,
            'envoye_par_nom': a.envoye_par.nom_complet if a.envoye_par else None,
            'date_envoi': a.date_envoi,
        } for a in annonces[:100]]
        return Response({'resultats': donnees, 'total': Annonce.objects.count()})

    def post(self, request):
        if not a_permission(request.user, 'annonces', 'creer'):
            return Response({'erreur': 'Accès refusé.'}, status=403)
        titre = request.data.get('titre', '').strip()
        contenu = request.data.get('contenu', '').strip()
        cible = request.data.get('cible', 'tous')
        destinataire_id = request.data.get('destinataire_id')

        if not titre or not contenu:
            return Response({'erreur': 'Titre et contenu obligatoires.'}, status=400)

        annonce = Annonce.objects.create(
            titre=titre,
            contenu=contenu,
            cible=cible,
            destinataire_id=destinataire_id if cible == 'specifique' else None,
            envoye_par=request.user,
        )
        journaliser_action_admin(request.user.profil_admin, 'annonce_envoyee', f'Annonce: {titre}')
        return Response({'message': 'Annonce envoyée.', 'id': annonce.id}, status=201)


class VueSupprimerAnnonceAdmin(APIView):
    """Supprimer une annonce."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def delete(self, request, pk):
        if not a_permission(request.user, 'annonces', 'supprimer'):
            return Response({'erreur': 'Accès refusé.'}, status=403)
        try:
            annonce = Annonce.objects.get(pk=pk)
            annonce.delete()
            return Response({'message': 'Annonce supprimée.'})
        except Annonce.DoesNotExist:
            return Response({'erreur': 'Annonce introuvable.'}, status=404)


# === Préoccupations (Questions utilisateurs via Aide) ===

class VueListePreoccupationsAdmin(APIView):
    """Liste des préoccupations utilisateurs. Accessible au Gestionnaire et Directeur."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def get(self, request):
        if not a_permission(request.user, 'preoccupations', 'lire'):
            return Response({'erreur': 'Accès refusé.'}, status=403)
        statut_filtre = request.query_params.get('statut')
        qs = Preoccupation.objects.select_related('utilisateur', 'traite_par').all()
        if statut_filtre:
            qs = qs.filter(statut=statut_filtre)
        donnees = [{
            'id': p.id,
            'utilisateur_id': p.utilisateur_id,
            'utilisateur_nom': p.utilisateur.nom_complet,
            'utilisateur_email': p.utilisateur.email,
            'utilisateur_photo': p.utilisateur.photo.url if p.utilisateur.photo else None,
            'categorie': p.categorie,
            'sujet': p.sujet,
            'message': p.message,
            'statut': p.statut,
            'reponse': p.reponse,
            'traite_par_nom': p.traite_par.nom_complet if p.traite_par else None,
            'date_creation': p.date_creation,
            'date_traitement': p.date_traitement,
        } for p in qs[:200]]
        stats = {
            'total': Preoccupation.objects.count(),
            'en_attente': Preoccupation.objects.filter(statut='en_attente').count(),
            'en_cours': Preoccupation.objects.filter(statut='en_cours').count(),
            'traitees': Preoccupation.objects.filter(statut='traitee').count(),
        }
        return Response({'resultats': donnees, 'stats': stats})


class VueTraiterPreoccupationAdmin(APIView):
    """Traiter (répondre, changer statut) une préoccupation."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def post(self, request, pk):
        if not a_permission(request.user, 'preoccupations', 'modifier'):
            return Response({'erreur': 'Accès refusé.'}, status=403)
        try:
            preoc = Preoccupation.objects.get(pk=pk)
        except Preoccupation.DoesNotExist:
            return Response({'erreur': 'Préoccupation introuvable.'}, status=404)

        nouveau_statut = request.data.get('statut')
        reponse = request.data.get('reponse', '').strip()

        if nouveau_statut:
            preoc.statut = nouveau_statut
        if reponse:
            preoc.reponse = reponse
        preoc.traite_par = request.user
        preoc.date_traitement = timezone.now()
        preoc.save()

        journaliser_action_admin(request.user.profil_admin, 'preoccupation_traitee', f'#{pk}: {preoc.sujet}')
        return Response({'message': 'Préoccupation mise à jour.'})
