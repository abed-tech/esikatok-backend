"""
Vues API pour la recherche de biens EsikaTok.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination

from apps.biens.serializers import BienImmobilierListeSerializer
from .services import rechercher_biens


class PaginationRecherche(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'taille_page'
    max_page_size = 50


class VueRechercheBiens(APIView):
    """
    Recherche de biens immobiliers avec filtres et score de pertinence.
    Classement de 100% à 1% de correspondance.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        filtres = {
            'ville_id': request.query_params.get('ville'),
            'commune_id': request.query_params.get('commune'),
            'quartier_id': request.query_params.get('quartier'),
            'type_bien': request.query_params.get('type_bien'),
            'type_offre': request.query_params.get('type_offre'),
            'prix_min': self._entier_ou_none(request.query_params.get('prix_min')),
            'prix_max': self._entier_ou_none(request.query_params.get('prix_max')),
            'chambres_min': self._entier_ou_none(request.query_params.get('chambres_min')),
            'terme_recherche': request.query_params.get('q', ''),
        }

        queryset = rechercher_biens(filtres, request.user if request.user.is_authenticated else None)

        paginator = PaginationRecherche()
        page = paginator.paginate_queryset(queryset, request)

        serializer = BienImmobilierListeSerializer(
            page, many=True, context={'request': request}
        )

        # Ajouter le score de pertinence si disponible
        donnees = serializer.data
        for i, bien_data in enumerate(donnees):
            if page and hasattr(page[i], 'score_pertinence'):
                bien_data['score_pertinence'] = page[i].score_pertinence
            else:
                bien_data['score_pertinence'] = None

        return paginator.get_paginated_response(donnees)

    def _entier_ou_none(self, valeur):
        if valeur:
            try:
                return int(valeur)
            except (ValueError, TypeError):
                pass
        return None


class VueBiensBoosted(APIView):
    """Biens les plus boostés (pour la page recherche)."""
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.biens.models import BienImmobilier
        biens = BienImmobilier.objects.filter(
            statut__in=['publie', 'approuve'], est_booste=True
        ).exclude(
            video__est_supprime=True
        ).select_related(
            'agent', 'ville', 'commune', 'quartier'
        ).prefetch_related('video')[:20]

        serializer = BienImmobilierListeSerializer(
            biens, many=True, context={'request': request}
        )
        return Response(serializer.data)
