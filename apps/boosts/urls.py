"""
URLs des boosts vidéo pour EsikaTok.
"""
from django.urls import path
from .views import VueMesBoosts, VueBoosterAbonnement, VueAcheterBoost

urlpatterns = [
    path('mes-boosts/', VueMesBoosts.as_view(), name='mes_boosts'),
    path('abonnement/', VueBoosterAbonnement.as_view(), name='booster_abonnement'),
    path('acheter/', VueAcheterBoost.as_view(), name='acheter_boost'),
]
