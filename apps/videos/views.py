"""
Vues API pour les vidéos EsikaTok.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Video
from .serializers import VideoSerializer
from apps.comptes.permissions import EstAgent


class VueMesVideos(generics.ListAPIView):
    """Liste des vidéos de l'agent connecté."""
    permission_classes = [IsAuthenticated, EstAgent]
    serializer_class = VideoSerializer

    def get_queryset(self):
        return Video.objects.filter(agent=self.request.user).select_related('bien')


class VueDetailVideo(generics.RetrieveAPIView):
    """Détail d'une vidéo."""
    permission_classes = [AllowAny]
    serializer_class = VideoSerializer
    queryset = Video.objects.all()


class VueEnregistrerLecture(APIView):
    """Enregistre une lecture de vidéo (vue)."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            video = Video.objects.get(pk=pk)
        except Video.DoesNotExist:
            return Response(
                {'erreur': 'Vidéo introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        video.nombre_lectures += 1
        duree = request.data.get('duree_visionnage', 0)
        if duree:
            video.duree_visionnage_totale += int(duree)
            if int(duree) >= video.duree_secondes * 0.9 and video.duree_secondes > 0:
                video.nombre_lectures_completes += 1
        video.save(update_fields=[
            'nombre_lectures', 'nombre_lectures_completes', 'duree_visionnage_totale'
        ])

        # Enregistrer dans les statistiques détaillées
        from apps.statistiques.models import VueBien
        VueBien.objects.create(
            bien=video.bien,
            utilisateur=request.user if request.user.is_authenticated else None,
            adresse_ip=request.META.get('REMOTE_ADDR'),
            duree_visionnage_sec=int(duree) if duree else 0,
            est_lecture_complete=int(duree) >= video.duree_secondes * 0.9 if duree and video.duree_secondes else False,
        )

        return Response({'message': 'Lecture enregistrée.'})
