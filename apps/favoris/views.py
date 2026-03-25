"""
Vues API pour les favoris EsikaTok.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Favori
from .serializers import FavoriSerializer


class VueMesFavoris(generics.ListAPIView):
    """Liste des favoris de l'utilisateur connecté."""
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriSerializer

    def get_queryset(self):
        return Favori.objects.filter(
            utilisateur=self.request.user
        ).exclude(
            bien__video__est_supprime=True
        ).select_related('bien__agent', 'bien__ville', 'bien__commune')


class VueAjouterFavori(APIView):
    """Ajouter un bien en favori."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FavoriSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VueSupprimerFavori(APIView):
    """Retirer un bien des favoris."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, bien_id):
        try:
            favori = Favori.objects.get(utilisateur=request.user, bien_id=bien_id)
            bien = favori.bien
            favori.delete()
            # Décrémenter le compteur
            if bien.nombre_favoris > 0:
                bien.nombre_favoris -= 1
                bien.save(update_fields=['nombre_favoris'])
            return Response({'message': 'Favori supprimé.'}, status=status.HTTP_200_OK)
        except Favori.DoesNotExist:
            return Response(
                {'erreur': 'Ce bien n\'est pas dans vos favoris.'},
                status=status.HTTP_404_NOT_FOUND,
            )
