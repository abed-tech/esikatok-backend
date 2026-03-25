"""
URLs des vidéos pour EsikaTok.
"""
from django.urls import path
from .views import VueMesVideos, VueDetailVideo, VueEnregistrerLecture

urlpatterns = [
    path('mes-videos/', VueMesVideos.as_view(), name='mes_videos'),
    path('<int:pk>/', VueDetailVideo.as_view(), name='detail_video'),
    path('<int:pk>/lecture/', VueEnregistrerLecture.as_view(), name='enregistrer_lecture'),
]
