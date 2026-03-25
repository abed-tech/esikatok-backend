"""
Sérialiseurs pour les paiements EsikaTok.
"""
from rest_framework import serializers
from .models import TransactionPaiement, JournalPaiement


class TransactionPaiementSerializer(serializers.ModelSerializer):
    """Sérialiseur d'une transaction de paiement."""
    class Meta:
        model = TransactionPaiement
        fields = [
            'id', 'reference', 'type_transaction', 'montant', 'devise',
            'moyen_paiement', 'statut', 'description',
            'date_creation', 'date_validation',
        ]
        read_only_fields = ['id', 'reference', 'statut', 'date_creation', 'date_validation']


class JournalPaiementSerializer(serializers.ModelSerializer):
    """Sérialiseur du journal de paiement."""
    class Meta:
        model = JournalPaiement
        fields = ['id', 'evenement', 'detail', 'date_evenement']
