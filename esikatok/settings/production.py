"""
Configuration production pour EsikaTok.
Toutes les valeurs sensibles sont lues depuis les variables d'environnement.
Ce fichier renforce la sécurité par rapport à base.py.
"""
from decouple import config, Csv
from .base import *  # noqa: F401,F403

DEBUG = False

# =============================================================================
# Base de données PostgreSQL production
# =============================================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='esikatok_db'),
        'USER': config('DB_USER', default='esikatok_user'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# =============================================================================
# CORS production (depuis variables d'environnement)
# =============================================================================
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='https://esikatok.com,https://www.esikatok.com',
    cast=Csv(),
)

# =============================================================================
# CSRF — Origines de confiance (nécessaire si frontends sur domaines séparés)
# =============================================================================
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='https://esikatok.com,https://www.esikatok.com',
    cast=Csv(),
)

# =============================================================================
# Sécurité HTTP renforcée
# =============================================================================
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# =============================================================================
# E-mail production
# =============================================================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# =============================================================================
# Logging production — fichiers + console
# =============================================================================
import os as _os
_LOG_DIR = BASE_DIR / 'logs'
_os.makedirs(_LOG_DIR, exist_ok=True)

LOGGING['handlers']['fichier'] = {
    'class': 'logging.handlers.RotatingFileHandler',
    'filename': str(_LOG_DIR / 'esikatok.log'),
    'maxBytes': 10 * 1024 * 1024,  # 10 Mo
    'backupCount': 5,
    'formatter': 'verbose',
}
LOGGING['handlers']['fichier_securite'] = {
    'class': 'logging.handlers.RotatingFileHandler',
    'filename': str(_LOG_DIR / 'securite.log'),
    'maxBytes': 10 * 1024 * 1024,
    'backupCount': 10,
    'formatter': 'securite',
}
LOGGING['loggers']['esikatok']['handlers'] = ['console', 'fichier']
LOGGING['loggers']['esikatok.securite']['handlers'] = ['securite_console', 'fichier_securite']
LOGGING['loggers']['django.request']['handlers'] = ['console', 'fichier']
