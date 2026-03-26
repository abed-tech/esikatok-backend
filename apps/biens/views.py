"""
Vues API pour les biens immobiliers EsikaTok.
"""
import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

logger = logging.getLogger(__name__)

from django.conf import settings

from .models import BienImmobilier, ImageBien
from .serializers import (
    BienImmobilierListeSerializer,
    BienImmobilierDetailSerializer,
    BienImmobilierCreationSerializer,
    ImageBienSerializer,
)
from apps.comptes.permissions import EstAgent, EstProprietaireBien
from apps.videos.models import Video
from apps.videos.stockage import obtenir_backend_stockage
from apps.moderation.models import SoumissionModeration


def _valider_fichier_video(fichier):
    """Valide le type MIME et la taille d'un fichier vidéo."""
    if fichier.content_type not in settings.TYPES_VIDEO_AUTORISES:
        return 'Format vidéo non autorisé. Formats acceptés : MP4, WebM, MOV.'
    taille_max = settings.TAILLE_MAX_VIDEO_MO * 1024 * 1024
    if fichier.size > taille_max:
        return f'Vidéo trop volumineuse ({settings.TAILLE_MAX_VIDEO_MO} Mo maximum).'
    return None


def _valider_fichier_image(fichier):
    """Valide le type MIME et la taille d'un fichier image."""
    if fichier.content_type not in settings.TYPES_IMAGE_AUTORISES:
        return 'Format image non autorisé. Formats acceptés : JPEG, PNG, WEBP.'
    taille_max = settings.TAILLE_MAX_IMAGE_MO * 1024 * 1024
    if fichier.size > taille_max:
        return f'Image trop volumineuse ({settings.TAILLE_MAX_IMAGE_MO} Mo maximum).'
    return None


class VueFilBiens(generics.ListAPIView):
    """
    Fil principal de vidéos/biens publiés.
    Mélange vidéos récentes, pertinentes et boostées.
    """
    permission_classes = [AllowAny]
    serializer_class = BienImmobilierListeSerializer

    def get_queryset(self):
        return BienImmobilier.objects.filter(
            statut__in=['publie', 'approuve']
        ).exclude(
            video__est_supprime=True
        ).select_related(
            'agent', 'ville', 'commune', 'quartier'
        ).prefetch_related('video').order_by('-est_booste', '-date_publication')


class VueDetailBien(generics.RetrieveAPIView):
    """Détail d'un bien immobilier publié."""
    permission_classes = [AllowAny]
    serializer_class = BienImmobilierDetailSerializer
    queryset = BienImmobilier.objects.filter(
        statut__in=['publie', 'approuve']
    ).exclude(
        video__est_supprime=True
    ).select_related('agent', 'ville', 'commune', 'quartier').prefetch_related('images', 'video')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Incrémenter le compteur de vues
        instance.nombre_vues += 1
        instance.save(update_fields=['nombre_vues'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class VueCreationBien(APIView):
    """Création d'un bien par un agent."""
    permission_classes = [IsAuthenticated, EstAgent]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Vérifier le quota de publication
        from apps.abonnements.models import Abonnement, CycleAbonnement
        abonnement = Abonnement.objects.filter(
            agent=request.user,
            statut__in=['actif', 'essai'],
            date_fin__gte=timezone.now(),
        ).first()

        if not abonnement:
            return Response(
                {'erreur': 'Vous devez avoir un abonnement actif pour publier.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        cycle = CycleAbonnement.objects.filter(
            abonnement=abonnement, est_actif=True,
        ).first()

        if cycle and not cycle.peut_publier():
            return Response(
                {'erreur': 'Vous avez atteint votre quota de publications pour ce mois.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BienImmobilierCreationSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        bien = serializer.save()

        # Gérer l'upload vidéo si présent
        fichier_video = request.FILES.get('fichier_video')
        if fichier_video:
            erreur_video = _valider_fichier_video(fichier_video)
            if erreur_video:
                bien.delete()
                return Response({'erreur': erreur_video}, status=status.HTTP_400_BAD_REQUEST)

            # Upload via le backend de stockage (S3 en prod, local en dev)
            try:
                backend = obtenir_backend_stockage()
                cle = backend.sauvegarder(fichier_video)
                url = backend.obtenir_url(cle)
            except Exception as e:
                logger.error(f'Erreur upload vidéo S3: {e}')
                bien.delete()
                return Response(
                    {'erreur': f'Erreur lors de l\'upload de la vidéo: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            Video.objects.create(
                bien=bien,
                agent=request.user,
                url_externe=url,
                cle_stockage=cle,
                taille_octets=fichier_video.size,
                format_video=fichier_video.content_type.split('/')[-1],
                miniature=request.FILES.get('miniature'),
            )

        # Gérer les images complémentaires
        images = request.FILES.getlist('images')
        for i, img in enumerate(images[:10]):  # Max 10 images
            erreur_img = _valider_fichier_image(img)
            if erreur_img:
                return Response({'erreur': erreur_img}, status=status.HTTP_400_BAD_REQUEST)
            ImageBien.objects.create(bien=bien, image=img, ordre=i)

        return Response(
            BienImmobilierDetailSerializer(bien, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class VueSoumettreModeration(APIView):
    """Soumettre un bien pour modération."""
    permission_classes = [IsAuthenticated, EstAgent]

    def post(self, request, pk):
        try:
            bien = BienImmobilier.objects.get(pk=pk, agent=request.user)
        except BienImmobilier.DoesNotExist:
            return Response(
                {'erreur': 'Bien introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if bien.statut not in ['brouillon', 'refuse']:
            return Response(
                {'erreur': 'Ce bien ne peut pas être soumis pour modération dans son état actuel.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier qu'une vidéo est associée
        if not Video.objects.filter(bien=bien).exists():
            return Response(
                {'erreur': 'Une vidéo est obligatoire pour soumettre un bien.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bien.statut = 'en_attente'
        bien.save(update_fields=['statut'])

        SoumissionModeration.objects.create(
            bien=bien,
            agent=request.user,
            commentaire_agent=request.data.get('commentaire', ''),
        )

        # Incrémenter le quota de publication
        from apps.abonnements.models import Abonnement, CycleAbonnement
        abonnement = Abonnement.objects.filter(
            agent=request.user,
            statut__in=['actif', 'essai'],
            date_fin__gte=timezone.now(),
        ).first()
        if abonnement:
            cycle = CycleAbonnement.objects.filter(
                abonnement=abonnement, est_actif=True
            ).first()
            if cycle:
                cycle.publications_utilisees += 1
                cycle.save(update_fields=['publications_utilisees'])

        return Response({'message': 'Bien soumis pour modération.'})


class VueMesBiens(generics.ListAPIView):
    """Liste des biens de l'agent connecté."""
    permission_classes = [IsAuthenticated, EstAgent]
    serializer_class = BienImmobilierDetailSerializer

    def get_queryset(self):
        return BienImmobilier.objects.filter(
            agent=self.request.user
        ).select_related('ville', 'commune', 'quartier').prefetch_related('images', 'video').order_by('-date_creation')


class VueEditionBien(APIView):
    """Modification d'un bien (brouillon uniquement)."""
    permission_classes = [IsAuthenticated, EstAgent]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk):
        try:
            bien = BienImmobilier.objects.get(pk=pk, agent=request.user)
        except BienImmobilier.DoesNotExist:
            return Response(
                {'erreur': 'Bien introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if bien.statut not in ['brouillon', 'refuse']:
            return Response(
                {'erreur': 'Seuls les brouillons et biens refusés peuvent être modifiés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BienImmobilierCreationSerializer(
            bien, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Mise à jour vidéo si nouveau fichier
        fichier_video = request.FILES.get('fichier_video')
        if fichier_video:
            erreur_video = _valider_fichier_video(fichier_video)
            if erreur_video:
                return Response({'erreur': erreur_video}, status=status.HTTP_400_BAD_REQUEST)

            # Supprimer l'ancien fichier S3 si existant
            backend = obtenir_backend_stockage()
            ancienne_video = Video.objects.filter(bien=bien).first()
            if ancienne_video and ancienne_video.cle_stockage:
                try:
                    backend.supprimer(ancienne_video.cle_stockage)
                except Exception:
                    pass

            # Upload du nouveau fichier
            try:
                cle = backend.sauvegarder(fichier_video)
                url = backend.obtenir_url(cle)
            except Exception as e:
                logger.error(f'Erreur upload vidéo S3 (édition): {e}')
                return Response(
                    {'erreur': f'Erreur lors de l\'upload de la vidéo: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            Video.objects.update_or_create(
                bien=bien,
                defaults={
                    'agent': request.user,
                    'url_externe': url,
                    'cle_stockage': cle,
                    'taille_octets': fichier_video.size,
                    'format_video': fichier_video.content_type.split('/')[-1],
                }
            )

        miniature = request.FILES.get('miniature')
        if miniature and hasattr(bien, 'video'):
            bien.video.miniature = miniature
            bien.video.save(update_fields=['miniature'])

        return Response(
            BienImmobilierDetailSerializer(bien, context={'request': request}).data,
        )
