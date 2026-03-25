"""
Sérialiseurs pour les boosts vidéo EsikaTok.
"""
from rest_framework import serializers
from .models import BoostVideo


class BoostVideoSerializer(serializers.ModelSerializer):
    """Sérialiseur d'un boost vidéo."""
    est_actif = serializers.ReadOnlyField()
    video_titre = serializers.CharField(source='video.bien.titre', read_only=True)

    class Meta:
        model = BoostVideo
        fields = [
            'id', 'video', 'video_titre', 'agent', 'source', 'statut',
            'date_debut', 'date_fin', 'score_boost',
            'impressions', 'clics', 'est_actif', 'date_creation',
        ]
        read_only_fields = ['id', 'agent', 'date_creation', 'impressions', 'clics']


class AchatBoostSerializer(serializers.Serializer):
    """Sérialiseur pour acheter un boost unitaire."""
    video_id = serializers.IntegerField()
    moyen_paiement = serializers.ChoiceField(choices=[
        ('mpesa', 'M-Pesa'),
        ('airtel_money', 'Airtel Money'),
        ('orange_money', 'Orange Money'),
        ('afri_money', 'Afri Money'),
        ('visa', 'Visa'),
        ('mastercard', 'Mastercard'),
    ])

    def validate_video_id(self, valeur):
        from apps.videos.models import Video
        try:
            Video.objects.get(id=valeur)
        except Video.DoesNotExist:
            raise serializers.ValidationError("Cette vidéo n'existe pas.")
        return valeur
