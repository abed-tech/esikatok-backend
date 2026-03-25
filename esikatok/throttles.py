"""
Throttles personnalisés pour EsikaTok.
Protection contre les attaques par force brute sur les endpoints d'authentification.
"""
from rest_framework.throttling import AnonRateThrottle


class ThrottleAuthentification(AnonRateThrottle):
    """
    Limite stricte sur les endpoints d'authentification (login, inscription).
    Utilise le rate 'auth' défini dans REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
    """
    rate = None  # sera lu depuis settings
    scope = 'auth'
