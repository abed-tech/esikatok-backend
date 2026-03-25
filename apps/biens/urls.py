"""
URLs des biens immobiliers pour EsikaTok.
"""
from django.urls import path
from .views import (
    VueFilBiens, VueDetailBien, VueCreationBien,
    VueSoumettreModeration, VueMesBiens, VueEditionBien,
)

urlpatterns = [
    path('fil/', VueFilBiens.as_view(), name='fil_biens'),
    path('<int:pk>/', VueDetailBien.as_view(), name='detail_bien'),
    path('creer/', VueCreationBien.as_view(), name='creer_bien'),
    path('<int:pk>/soumettre/', VueSoumettreModeration.as_view(), name='soumettre_moderation'),
    path('mes-biens/', VueMesBiens.as_view(), name='mes_biens'),
    path('<int:pk>/modifier/', VueEditionBien.as_view(), name='modifier_bien'),
]
