"""
Vues API pour les boosts vidéo EsikaTok.
"""
import uuid
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from .models import BoostVideo
from .serializers import BoostVideoSerializer, AchatBoostSerializer
from apps.comptes.permissions import EstAgent
from apps.videos.models import Video
from apps.paiements.models import TransactionPaiement
from apps.abonnements.models import Abonnement, CycleAbonnement


class VueMesBoosts(generics.ListAPIView):
    """Liste des boosts de l'agent connecté."""
    permission_classes = [IsAuthenticated, EstAgent]
    serializer_class = BoostVideoSerializer

    def get_queryset(self):
        return BoostVideo.objects.filter(
            agent=self.request.user
        ).select_related('video__bien').order_by('-date_debut')


class VueBoosterAbonnement(APIView):
    """Utiliser un boost inclus dans l'abonnement."""
    permission_classes = [IsAuthenticated, EstAgent]

    def post(self, request):
        video_id = request.data.get('video_id')
        try:
            video = Video.objects.get(id=video_id, agent=request.user)
        except Video.DoesNotExist:
            return Response(
                {'erreur': 'Vidéo introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Vérifier l'abonnement et le quota de boosts
        abonnement = Abonnement.objects.filter(
            agent=request.user,
            statut__in=['actif', 'essai'],
            date_fin__gte=timezone.now(),
        ).first()

        if not abonnement:
            return Response(
                {'erreur': 'Abonnement actif requis.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        cycle = CycleAbonnement.objects.filter(
            abonnement=abonnement, est_actif=True
        ).first()

        if not cycle or not cycle.peut_booster_inclus():
            return Response(
                {'erreur': 'Quota de boosts inclus épuisé. Achetez un boost unitaire.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        maintenant = timezone.now()
        boost = BoostVideo.objects.create(
            video=video,
            agent=request.user,
            source='abonnement',
            date_debut=maintenant,
            date_fin=maintenant + timedelta(days=7),
        )

        # Marquer le bien comme boosté
        video.bien.est_booste = True
        video.bien.save(update_fields=['est_booste'])

        # Incrémenter le compteur
        cycle.boosts_utilises += 1
        cycle.save(update_fields=['boosts_utilises'])

        return Response(
            BoostVideoSerializer(boost).data,
            status=status.HTTP_201_CREATED,
        )


class VueAcheterBoost(APIView):
    """Acheter un boost unitaire à 1 USD."""
    permission_classes = [IsAuthenticated, EstAgent]

    def post(self, request):
        serializer = AchatBoostSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        video_id = serializer.validated_data['video_id']
        moyen = serializer.validated_data['moyen_paiement']

        try:
            video = Video.objects.get(id=video_id, agent=request.user)
        except Video.DoesNotExist:
            return Response(
                {'erreur': 'Vidéo introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Créer la transaction
        reference = f"BST-{uuid.uuid4().hex[:12].upper()}"
        transaction = TransactionPaiement.objects.create(
            utilisateur=request.user,
            reference=reference,
            type_transaction='boost',
            montant=BoostVideo.PRIX_BOOST_UNITAIRE_USD,
            moyen_paiement=moyen,
            description=f"Boost vidéo: {video.bien.titre}",
        )

        # En dev, valider directement
        transaction.marquer_reussie()

        maintenant = timezone.now()
        boost = BoostVideo.objects.create(
            video=video,
            agent=request.user,
            source='achat',
            transaction=transaction,
            date_debut=maintenant,
            date_fin=maintenant + timedelta(days=7),
        )

        video.bien.est_booste = True
        video.bien.save(update_fields=['est_booste'])

        return Response({
            'message': 'Boost acheté avec succès.',
            'boost': BoostVideoSerializer(boost).data,
            'transaction': {'reference': reference, 'statut': 'reussie'},
        }, status=status.HTTP_201_CREATED)
