"""
Configuration des URLs racine pour EsikaTok.
Sépare clairement les espaces utilisateur, administration et API.
Le chemin d'accès à l'administration est configurable via CHEMIN_ADMIN_GESTION.
"""
import re
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.http import JsonResponse


# --- Health check (monitoring / load balancer) ---
def vue_health(request):
    return JsonResponse({'status': 'ok'})


# --- Point d'entrée SPA utilisateur ---
vue_spa_utilisateur = TemplateView.as_view(template_name='utilisateur/index.html')

# --- Point d'entrée SPA administration ---
vue_spa_admin = TemplateView.as_view(template_name='administration/index.html')

# --- Chemin admin dynamique (depuis settings, configurable par env) ---
_chemin_admin = re.escape(settings.CHEMIN_ADMIN_GESTION)

urlpatterns = [
    # === Health check ===
    path('api/health/', vue_health, name='health_check'),

    # === API REST v1 ===
    path('api/v1/auth/', include('apps.comptes.urls_auth')),
    path('api/v1/comptes/', include('apps.comptes.urls')),
    path('api/v1/localisations/', include('apps.localisations.urls')),
    path('api/v1/biens/', include('apps.biens.urls')),
    path('api/v1/videos/', include('apps.videos.urls')),
    path('api/v1/recherche/', include('apps.recherche.urls')),
    path('api/v1/messagerie/', include('apps.messagerie.urls')),
    path('api/v1/abonnements/', include('apps.abonnements.urls')),
    path('api/v1/paiements/', include('apps.paiements.urls')),
    path('api/v1/boosts/', include('apps.boosts.urls')),
    path('api/v1/favoris/', include('apps.favoris.urls')),
    path('api/v1/statistiques/', include('apps.statistiques.urls')),

    # === API Administration ===
    path('api/v1/administration/', include('apps.administration.urls')),
    path('api/v1/moderation/', include('apps.moderation.urls')),

    # === SPA Administration (chemin dynamique depuis settings) ===
    re_path(
        rf'^{_chemin_admin}(?:/.*)?$',
        vue_spa_admin,
        name='spa_admin',
    ),

    # === SPA Utilisateur (catch-all, doit rester en dernier) ===
    re_path(r'^(?!api/|gestion/|static/|media/).*$', vue_spa_utilisateur, name='spa_utilisateur'),
]

# --- Fichiers médias en développement uniquement ---
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
