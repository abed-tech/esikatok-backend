"""
URLs des localisations géographiques pour EsikaTok.
"""
from django.urls import path
from .views import VueListeVilles, VueListeCommunesParVille, VueListeQuartiersParCommune

urlpatterns = [
    path('villes/', VueListeVilles.as_view(), name='liste_villes'),
    path('villes/<int:ville_id>/communes/', VueListeCommunesParVille.as_view(), name='communes_par_ville'),
    path('communes/<int:commune_id>/quartiers/', VueListeQuartiersParCommune.as_view(), name='quartiers_par_commune'),
]
