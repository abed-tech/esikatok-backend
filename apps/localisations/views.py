"""
Vues API pour les localisations géographiques EsikaTok.
Chargement dynamique ville → communes → quartiers.
"""
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Ville, Commune, Quartier
from .serializers import VilleSerializer, CommuneSerializer, QuartierSerializer


class VueListeVilles(generics.ListAPIView):
    """Liste de toutes les villes actives."""
    permission_classes = [AllowAny]
    serializer_class = VilleSerializer
    queryset = Ville.objects.filter(est_active=True)
    pagination_class = None


class VueListeCommunesParVille(generics.ListAPIView):
    """Liste des communes d'une ville donnée."""
    permission_classes = [AllowAny]
    serializer_class = CommuneSerializer
    pagination_class = None

    def get_queryset(self):
        ville_id = self.kwargs.get('ville_id')
        return Commune.objects.filter(ville_id=ville_id, est_active=True)


class VueListeQuartiersParCommune(generics.ListAPIView):
    """Liste des quartiers d'une commune donnée."""
    permission_classes = [AllowAny]
    serializer_class = QuartierSerializer
    pagination_class = None

    def get_queryset(self):
        commune_id = self.kwargs.get('commune_id')
        return Quartier.objects.filter(commune_id=commune_id, est_actif=True)
