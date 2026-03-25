"""
URLs des abonnements pour EsikaTok.
"""
from django.urls import path
from .views import (
    VueListePlans, VueMonAbonnement,
    VueSouscrireAbonnement, VueHistoriqueAbonnements,
)

urlpatterns = [
    path('plans/', VueListePlans.as_view(), name='liste_plans'),
    path('mon-abonnement/', VueMonAbonnement.as_view(), name='mon_abonnement'),
    path('souscrire/', VueSouscrireAbonnement.as_view(), name='souscrire'),
    path('historique/', VueHistoriqueAbonnements.as_view(), name='historique_abonnements'),
]
