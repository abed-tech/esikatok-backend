"""
Vues API pour les paiements EsikaTok.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import TransactionPaiement
from .serializers import TransactionPaiementSerializer
from apps.comptes.permissions import EstAgent


class VueMesTransactions(generics.ListAPIView):
    """Historique des transactions de l'utilisateur connecté."""
    permission_classes = [IsAuthenticated, EstAgent]
    serializer_class = TransactionPaiementSerializer

    def get_queryset(self):
        return TransactionPaiement.objects.filter(
            utilisateur=self.request.user
        ).order_by('-date_creation')
