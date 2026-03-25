"""
Sérialiseurs pour les localisations géographiques EsikaTok.
"""
from rest_framework import serializers
from .models import Ville, Commune, Quartier


class VilleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ville
        fields = ['id', 'nom', 'code', 'pays', 'latitude', 'longitude']


class CommuneSerializer(serializers.ModelSerializer):
    ville_nom = serializers.CharField(source='ville.nom', read_only=True)

    class Meta:
        model = Commune
        fields = ['id', 'ville', 'ville_nom', 'nom', 'code', 'latitude', 'longitude']


class QuartierSerializer(serializers.ModelSerializer):
    commune_nom = serializers.CharField(source='commune.nom', read_only=True)

    class Meta:
        model = Quartier
        fields = ['id', 'commune', 'commune_nom', 'nom', 'code', 'latitude', 'longitude']
