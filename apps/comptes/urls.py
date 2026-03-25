"""
URLs des comptes utilisateurs pour EsikaTok.
"""
from django.urls import path
from .views import (
    VueProfilUtilisateur,
    VueProfilAgentEdition,
    VueProfilAgentPublic,
    VueCreationAdmin,
    VueMesAnnonces,
    VueSoumettrePreoccupation,
    VuePhotoProfil,
    VueCompteursBadges,
)

urlpatterns = [
    path('badges/', VueCompteursBadges.as_view(), name='compteurs_badges'),
    path('profil/', VueProfilUtilisateur.as_view(), name='profil'),
    path('profil-agent/', VueProfilAgentEdition.as_view(), name='profil_agent_edition'),
    path('agent/<int:agent_id>/', VueProfilAgentPublic.as_view(), name='profil_agent_public'),
    path('creer-admin/', VueCreationAdmin.as_view(), name='creer_admin'),
    # Annonces (lecture seule)
    path('annonces/', VueMesAnnonces.as_view(), name='mes_annonces'),
    # Préoccupations (page Aide)
    path('aide/preoccupations/', VueSoumettrePreoccupation.as_view(), name='soumettre_preoccupation'),
    # Photo de profil
    path('photo-profil/', VuePhotoProfil.as_view(), name='photo_profil'),
]
