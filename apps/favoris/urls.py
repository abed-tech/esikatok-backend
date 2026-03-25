"""
URLs des favoris pour EsikaTok.
"""
from django.urls import path
from .views import VueMesFavoris, VueAjouterFavori, VueSupprimerFavori

urlpatterns = [
    path('', VueMesFavoris.as_view(), name='mes_favoris'),
    path('ajouter/', VueAjouterFavori.as_view(), name='ajouter_favori'),
    path('supprimer/<int:bien_id>/', VueSupprimerFavori.as_view(), name='supprimer_favori'),
]
