"""
URLs d'authentification pour EsikaTok.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    VueInscriptionUtilisateur,
    VueInscriptionAgent,
    VueConnexion,
    VueConnexionAdmin,
    VueDeconnexion,
)

urlpatterns = [
    path('inscription/', VueInscriptionUtilisateur.as_view(), name='inscription'),
    path('inscription-agent/', VueInscriptionAgent.as_view(), name='inscription_agent'),
    path('connexion/', VueConnexion.as_view(), name='connexion'),
    path('connexion-admin/', VueConnexionAdmin.as_view(), name='connexion_admin'),
    path('deconnexion/', VueDeconnexion.as_view(), name='deconnexion'),
    path('token/rafraichir/', TokenRefreshView.as_view(), name='token_rafraichir'),
]
