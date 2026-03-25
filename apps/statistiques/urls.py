"""
URLs des statistiques pour EsikaTok.
"""
from django.urls import path
from .views import VueTableauDeBordAdmin, VueStatistiquesAgent

urlpatterns = [
    path('tableau-de-bord/', VueTableauDeBordAdmin.as_view(), name='tableau_de_bord'),
    path('agent/', VueStatistiquesAgent.as_view(), name='stats_agent'),
]
