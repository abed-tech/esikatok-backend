"""
Vues API pour les abonnements agents EsikaTok.
"""
import uuid
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta

from .models import PlanAbonnement, Abonnement, CycleAbonnement
from .serializers import (
    PlanAbonnementSerializer,
    AbonnementSerializer,
    CycleAbonnementSerializer,
    SouscriptionAbonnementSerializer,
)
from apps.comptes.permissions import EstAgent
from apps.paiements.models import TransactionPaiement


class VueListePlans(generics.ListAPIView):
    """Liste des plans d'abonnement disponibles."""
    permission_classes = [AllowAny]
    serializer_class = PlanAbonnementSerializer
    queryset = PlanAbonnement.objects.filter(est_actif=True)
    pagination_class = None


class VueMonAbonnement(APIView):
    """Abonnement actuel de l'agent connecté."""
    permission_classes = [IsAuthenticated, EstAgent]

    def get(self, request):
        abonnement = Abonnement.objects.filter(
            agent=request.user,
        ).select_related('plan').order_by('-date_debut').first()

        if not abonnement:
            return Response({'abonnement': None, 'cycle': None})

        cycle = CycleAbonnement.objects.filter(
            abonnement=abonnement, est_actif=True
        ).first()

        return Response({
            'abonnement': AbonnementSerializer(abonnement).data,
            'cycle': CycleAbonnementSerializer(cycle).data if cycle else None,
        })


class VueSouscrireAbonnement(APIView):
    """Souscrire à un plan d'abonnement."""
    permission_classes = [IsAuthenticated, EstAgent]

    def post(self, request):
        serializer = SouscriptionAbonnementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = PlanAbonnement.objects.get(id=serializer.validated_data['plan_id'])
        moyen = serializer.validated_data['moyen_paiement']
        numero_tel = serializer.validated_data.get('numero_telephone', '')

        # Vérifier s'il y a un abonnement actif
        abonnement_actif = Abonnement.objects.filter(
            agent=request.user,
            statut__in=['actif', 'essai'],
            date_fin__gte=timezone.now(),
        ).first()

        if abonnement_actif and abonnement_actif.statut == 'actif':
            return Response(
                {'erreur': 'Vous avez déjà un abonnement actif. Attendez son expiration ou annulez-le.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Créer la transaction de paiement
        reference = f"ABO-{uuid.uuid4().hex[:12].upper()}"
        transaction = TransactionPaiement.objects.create(
            utilisateur=request.user,
            reference=reference,
            type_transaction='abonnement',
            montant=plan.prix_mensuel_usd,
            moyen_paiement=moyen,
            numero_telephone_paiement=numero_tel,
            description=f"Abonnement {plan.get_nom_display()}",
        )

        # En mode développement, on valide directement
        transaction.marquer_reussie()

        # Désactiver l'ancien abonnement si existant
        if abonnement_actif:
            abonnement_actif.statut = 'expire'
            abonnement_actif.save(update_fields=['statut'])
            CycleAbonnement.objects.filter(
                abonnement=abonnement_actif, est_actif=True
            ).update(est_actif=False)

        # Créer le nouvel abonnement
        maintenant = timezone.now()
        date_fin = maintenant + timedelta(days=30)

        abonnement = Abonnement.objects.create(
            agent=request.user,
            plan=plan,
            statut='actif',
            date_debut=maintenant,
            date_fin=date_fin,
        )
        transaction.abonnement = abonnement
        transaction.save(update_fields=['abonnement'])

        CycleAbonnement.objects.create(
            abonnement=abonnement,
            date_debut_cycle=maintenant,
            date_fin_cycle=date_fin,
            est_actif=True,
        )

        return Response({
            'message': f'Abonnement {plan.get_nom_display()} activé avec succès.',
            'abonnement': AbonnementSerializer(abonnement).data,
            'transaction': {'reference': reference, 'statut': 'reussie'},
        }, status=status.HTTP_201_CREATED)


class VueHistoriqueAbonnements(generics.ListAPIView):
    """Historique des abonnements de l'agent."""
    permission_classes = [IsAuthenticated, EstAgent]
    serializer_class = AbonnementSerializer

    def get_queryset(self):
        return Abonnement.objects.filter(
            agent=self.request.user
        ).select_related('plan').order_by('-date_debut')
