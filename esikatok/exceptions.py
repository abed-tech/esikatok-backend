"""
Gestionnaire d'exceptions personnalisé pour l'API EsikaTok.
Ne jamais exposer les détails techniques au client en production.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

logger = logging.getLogger('esikatok')
logger_securite = logging.getLogger('esikatok.securite')


def gestionnaire_exceptions_api(exc, context):
    """
    Surcharge du handler DRF par défaut :
    - Log toutes les erreurs côté serveur
    - Ne jamais exposer de stacktrace ou détails internes au client
    - Retourner des messages d'erreur génériques en production
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Erreurs gérées par DRF (validation, permissions, throttle, etc.)
        if response.status_code == 429:
            logger_securite.warning(
                'Rate limit atteint | IP=%s | Vue=%s',
                _obtenir_ip(context.get('request')),
                _obtenir_vue(context),
            )
        return response

    # Erreurs non gérées (500) — NE PAS exposer les détails
    request = context.get('request')
    logger.error(
        'Erreur interne non gérée | Vue=%s | IP=%s | %s: %s',
        _obtenir_vue(context),
        _obtenir_ip(request),
        type(exc).__name__,
        str(exc),
        exc_info=True,
    )

    return Response(
        {'erreur': 'Une erreur interne est survenue. Veuillez réessayer.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _obtenir_ip(request):
    """Extrait l'IP du client, en tenant compte des proxys."""
    if request is None:
        return 'inconnue'
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'inconnue')


def _obtenir_vue(context):
    """Nom de la vue pour le logging."""
    view = context.get('view')
    if view:
        return type(view).__name__
    return 'inconnue'
