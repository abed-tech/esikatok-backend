"""Configuration WSGI pour EsikaTok."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esikatok.settings.local')
application = get_wsgi_application()
