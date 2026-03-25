"""
Sérialiseurs pour les favoris EsikaTok.
"""
from rest_framework import serializers
from .models import Favori
from apps.biens.serializers import BienImmobilierListeSerializer


class FavoriSerializer(serializers.ModelSerializer):
    """Sérialiseur d'un favori."""
    bien_detail = BienImmobilierListeSerializer(source='bien', read_only=True)

    class Meta:
        model = Favori
        fields = ['id', 'bien', 'bien_detail', 'date_ajout']
        read_only_fields = ['id', 'date_ajout']

    def validate_bien(self, valeur):
        request = self.context.get('request')
        if request and Favori.objects.filter(utilisateur=request.user, bien=valeur).exists():
            raise serializers.ValidationError("Ce bien est déjà dans vos favoris.")
        return valeur

    def create(self, donnees_validees):
        donnees_validees['utilisateur'] = self.context['request'].user
        favori = super().create(donnees_validees)
        # Incrémenter le compteur de favoris du bien
        bien = favori.bien
        bien.nombre_favoris += 1
        bien.save(update_fields=['nombre_favoris'])
        return favori
