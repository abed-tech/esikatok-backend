"""
Configuration de base Django pour EsikaTok.
Paramètres communs à tous les environnements.
Toute valeur sensible est lue depuis les variables d'environnement via python-decouple.
"""
import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# =============================================================================
# Chemins
# =============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# =============================================================================
# Sécurité
# =============================================================================
SECRET_KEY = config('DJANGO_SECRET_KEY', default='dev-insecure-key-pour-developpement-local-uniquement')
DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# =============================================================================
# Applications installées
# =============================================================================
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Bibliothèques tierces
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    # Applications métier EsikaTok
    'apps.comptes',
    'apps.localisations',
    'apps.biens',
    'apps.videos',
    'apps.recherche',
    'apps.messagerie',
    'apps.abonnements',
    'apps.paiements',
    'apps.boosts',
    'apps.moderation',
    'apps.favoris',
    'apps.statistiques',
    'apps.administration',
]

# =============================================================================
# Middleware
# =============================================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'esikatok.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'esikatok.wsgi.application'

# =============================================================================
# Modèle utilisateur personnalisé
# =============================================================================
AUTH_USER_MODEL = 'comptes.Utilisateur'

# =============================================================================
# Validation des mots de passe
# =============================================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# =============================================================================
# Internationalisation
# =============================================================================
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Kinshasa'
USE_I18N = True
USE_TZ = True

# =============================================================================
# Fichiers statiques
# =============================================================================
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# =============================================================================
# Fichiers médias
# =============================================================================
MEDIA_URL = config('MEDIA_PUBLIC_URL', default='/media/').rstrip('/') + '/'
MEDIA_ROOT = BASE_DIR / 'media'

# =============================================================================
# Limites d'upload — Protection contre les gros payloads
# =============================================================================
DATA_UPLOAD_MAX_MEMORY_SIZE = 120 * 1024 * 1024   # 120 Mo (vidéos)
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024     # 10 Mo en mémoire, au-delà → fichier temp
TAILLE_MAX_VIDEO_MO = 100
TAILLE_MAX_IMAGE_MO = 10
TYPES_VIDEO_AUTORISES = ['video/mp4', 'video/webm', 'video/quicktime']
TYPES_IMAGE_AUTORISES = ['image/jpeg', 'image/png', 'image/webp']

# =============================================================================
# Django REST Framework
# =============================================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '120/minute',
        'auth': '10/minute',
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'esikatok.exceptions.gestionnaire_exceptions_api',
    'DATETIME_FORMAT': '%d/%m/%Y %H:%M',
    'DATE_FORMAT': '%d/%m/%Y',
}

# =============================================================================
# JWT — Tokens d'authentification
# =============================================================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_LIFETIME_MINUTES', default=30, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'utilisateur_id',
    'UPDATE_LAST_LOGIN': False,
}

# =============================================================================
# CORS — Sera surchargé par local.py ou production.py
# =============================================================================
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:8000',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization',
    'content-type', 'dnt', 'origin', 'user-agent',
    'x-csrftoken', 'x-requested-with',
]

# =============================================================================
# Sécurité HTTP (valeurs de base, renforcées en production.py)
# =============================================================================
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# =============================================================================
# Stockage vidéo — Abstraction (local ou S3)
# =============================================================================
_storage_backend = config('STORAGE_BACKEND', default='local')
if _storage_backend == 's3':
    STOCKAGE_VIDEO = {
        'BACKEND': 'apps.videos.stockage.StockageExterneS3',
        'OPTIONS': {
            'bucket': config('VIDEO_S3_BUCKET', default=''),
            'region': config('VIDEO_S3_REGION', default='eu-west-1'),
            'access_key': config('VIDEO_S3_ACCESS_KEY', default=''),
            'secret_key': config('VIDEO_S3_SECRET_KEY', default=''),
            'endpoint_url': config('VIDEO_S3_ENDPOINT', default=''),
            'cdn_url': config('VIDEO_CDN_URL', default=''),
        },
    }
else:
    STOCKAGE_VIDEO = {
        'BACKEND': 'apps.videos.stockage.StockageLocal',
        'OPTIONS': {
            'repertoire': str(MEDIA_ROOT / 'videos'),
        },
    }

# =============================================================================
# URLs des services (pour communication inter-services)
# =============================================================================
API_BASE_URL = config('API_BASE_URL', default='http://localhost:8000')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:8000')
ADMIN_FRONTEND_URL = config('ADMIN_FRONTEND_URL', default='http://localhost:8000/gestion/EsikaTok')

# =============================================================================
# E-mails jetables interdits
# =============================================================================
DOMAINES_EMAIL_INTERDITS = [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'trashmail.com',
    'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com',
    'grr.la', 'dispostable.com', 'maildrop.cc', 'temp-mail.org',
    'tempail.com', 'mohmal.com', 'getnada.com',
]

# =============================================================================
# Divers
# =============================================================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
CHEMIN_ADMIN_GESTION = config('ADMIN_PATH', default='gestion/EsikaTok')

# =============================================================================
# Logging — Structure professionnelle
# =============================================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
        'securite': {
            'format': '[{asctime}] SECURITE {levelname} {name} | {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'securite_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'securite',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'esikatok': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'esikatok.securite': {
            'handlers': ['securite_console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
