"""
URLs de recherche pour EsikaTok.
"""
from django.urls import path
from .views import VueRechercheBiens, VueBiensBoosted

urlpatterns = [
    path('', VueRechercheBiens.as_view(), name='recherche_biens'),
    path('boostes/', VueBiensBoosted.as_view(), name='biens_boostes'),
]
