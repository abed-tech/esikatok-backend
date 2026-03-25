"""
Vues API pour les statistiques EsikaTok.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Sum

from apps.comptes.permissions import EstAdministrateur, EstAgent
from apps.comptes.models import Utilisateur
from apps.biens.models import BienImmobilier
from apps.abonnements.models import Abonnement
from apps.boosts.models import BoostVideo
from apps.messagerie.models import Conversation
from apps.moderation.models import SoumissionModeration
from apps.paiements.models import TransactionPaiement


class VueTableauDeBordAdmin(APIView):
    """Tableau de bord principal de l'administration."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def get(self, request):
        maintenant = timezone.now()
        return Response({
            'utilisateurs': {
                'total': Utilisateur.objects.filter(type_compte='simple').count(),
                'agents': Utilisateur.objects.filter(type_compte='agent').count(),
                'admins': Utilisateur.objects.filter(type_compte='administrateur').count(),
            },
            'biens': {
                'total': BienImmobilier.objects.count(),
                'publies': BienImmobilier.objects.filter(statut='publie').count(),
                'en_attente': BienImmobilier.objects.filter(statut='en_attente').count(),
                'refuses': BienImmobilier.objects.filter(statut='refuse').count(),
                'brouillons': BienImmobilier.objects.filter(statut='brouillon').count(),
            },
            'moderation': {
                'en_attente': SoumissionModeration.objects.filter(statut='en_attente').count(),
                'traitees_ce_mois': SoumissionModeration.objects.filter(
                    date_traitement__month=maintenant.month,
                    date_traitement__year=maintenant.year,
                ).count(),
            },
            'abonnements': {
                'actifs': Abonnement.objects.filter(
                    statut__in=['actif', 'essai'],
                    date_fin__gte=maintenant,
                ).count(),
                'essais': Abonnement.objects.filter(statut='essai').count(),
            },
            'boosts': {
                'actifs': BoostVideo.objects.filter(
                    statut='actif', date_fin__gte=maintenant,
                ).count(),
            },
            'conversations': {
                'total': Conversation.objects.count(),
            },
            'revenus': {
                'total_usd': TransactionPaiement.objects.filter(
                    statut='reussie'
                ).aggregate(total=Sum('montant'))['total'] or 0,
                'ce_mois_usd': TransactionPaiement.objects.filter(
                    statut='reussie',
                    date_validation__month=maintenant.month,
                    date_validation__year=maintenant.year,
                ).aggregate(total=Sum('montant'))['total'] or 0,
            },
        })


class VueStatistiquesAgent(APIView):
    """Statistiques de performance pour un agent."""
    permission_classes = [IsAuthenticated, EstAgent]

    def get(self, request):
        biens = BienImmobilier.objects.filter(agent=request.user)
        return Response({
            'biens': {
                'total': biens.count(),
                'publies': biens.filter(statut='publie').count(),
                'en_attente': biens.filter(statut='en_attente').count(),
                'brouillons': biens.filter(statut='brouillon').count(),
            },
            'engagement': {
                'vues_totales': biens.aggregate(t=Sum('nombre_vues'))['t'] or 0,
                'favoris_totaux': biens.aggregate(t=Sum('nombre_favoris'))['t'] or 0,
                'partages_totaux': biens.aggregate(t=Sum('nombre_partages'))['t'] or 0,
                'contacts_totaux': biens.aggregate(t=Sum('nombre_contacts'))['t'] or 0,
            },
            'boosts': {
                'actifs': BoostVideo.objects.filter(
                    agent=request.user, statut='actif',
                    date_fin__gte=timezone.now(),
                ).count(),
                'total': BoostVideo.objects.filter(agent=request.user).count(),
            },
            'conversations': {
                'total': Conversation.objects.filter(agent=request.user).count(),
            },
        })
