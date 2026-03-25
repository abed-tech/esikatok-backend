"""
Configuration locale (développement) pour EsikaTok.
Hérite de base.py, active le mode debug et utilise SQLite.
"""
from .base import *  # noqa: F401,F403

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# --- Base de données locale SQLite ---
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# --- CORS en développement (tout autoriser) ---
CORS_ALLOW_ALL_ORIGINS = True

# --- Throttle relâché en dev ---
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '600/minute',
    'user': '1200/minute',
    'auth': '100/minute',
}

# --- Renderers : ajouter le BrowsableAPI en dev ---
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]

# --- Médias servis directement en dev ---
MEDIA_URL = '/media/'
