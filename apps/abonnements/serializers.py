"""
Sérialiseurs pour les abonnements agents EsikaTok.
"""
from rest_framework import serializers
from .models import PlanAbonnement, Abonnement, CycleAbonnement


class PlanAbonnementSerializer(serializers.ModelSerializer):
    """Sérialiseur d'un plan d'abonnement."""
    est_illimite = serializers.ReadOnlyField()

    class Meta:
        model = PlanAbonnement
        fields = [
            'id', 'nom', 'prix_mensuel_usd', 'nombre_publications_max',
            'nombre_boosts_inclus', 'messages_illimites', 'est_actif',
            'description', 'est_illimite', 'ordre_affichage',
        ]


class AbonnementSerializer(serializers.ModelSerializer):
    """Sérialiseur d'un abonnement."""
    plan_detail = PlanAbonnementSerializer(source='plan', read_only=True)
    est_actif_ou_essai = serializers.ReadOnlyField()

    class Meta:
        model = Abonnement
        fields = [
            'id', 'agent', 'plan', 'plan_detail', 'statut',
            'date_debut', 'date_fin', 'est_essai_gratuit',
            'renouvellement_auto', 'est_actif_ou_essai',
            'date_creation',
        ]
        read_only_fields = ['id', 'agent', 'date_creation']


class CycleAbonnementSerializer(serializers.ModelSerializer):
    """Sérialiseur d'un cycle d'abonnement."""
    publications_restantes = serializers.ReadOnlyField()
    boosts_restants = serializers.ReadOnlyField()

    class Meta:
        model = CycleAbonnement
        fields = [
            'id', 'abonnement', 'date_debut_cycle', 'date_fin_cycle',
            'publications_utilisees', 'boosts_utilises',
            'publications_restantes', 'boosts_restants', 'est_actif',
        ]


class SouscriptionAbonnementSerializer(serializers.Serializer):
    """Sérialiseur pour souscrire à un abonnement."""
    plan_id = serializers.IntegerField()
    moyen_paiement = serializers.ChoiceField(choices=[
        ('mpesa', 'M-Pesa'),
        ('airtel_money', 'Airtel Money'),
        ('orange_money', 'Orange Money'),
        ('afri_money', 'Afri Money'),
        ('visa', 'Visa'),
        ('mastercard', 'Mastercard'),
    ])
    numero_telephone = serializers.CharField(required=False, allow_blank=True)

    def validate_plan_id(self, valeur):
        try:
            PlanAbonnement.objects.get(id=valeur, est_actif=True)
        except PlanAbonnement.DoesNotExist:
            raise serializers.ValidationError("Ce plan n'existe pas ou n'est plus disponible.")
        return valeur
