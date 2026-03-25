"""
URLs de la modération pour EsikaTok.
"""
from django.urls import path
from .views import (
    VueListeSoumissions, VueDetailSoumission,
    VueTraiterModeration, VueStatistiquesModeration,
)

urlpatterns = [
    path('soumissions/', VueListeSoumissions.as_view(), name='liste_soumissions'),
    path('soumissions/<int:pk>/', VueDetailSoumission.as_view(), name='detail_soumission'),
    path('soumissions/<int:pk>/traiter/', VueTraiterModeration.as_view(), name='traiter_moderation'),
    path('statistiques/', VueStatistiquesModeration.as_view(), name='stats_moderation'),
]
