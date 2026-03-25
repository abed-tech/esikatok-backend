"""
Matrice centralisée des permissions par rôle pour l'administration EsikaTok.
Chaque rôle possède un ensemble précis de permissions (lire, creer, modifier, supprimer)
définies par module. Le directeur a accès à tout. Ce fichier est la source unique de vérité.
"""
from rest_framework.permissions import BasePermission


# ──────────────────────────────────────────────
# Matrice de permissions : rôle → module → actions
# ──────────────────────────────────────────────
PERMISSIONS_PAR_ROLE = {
    # ── Directeur (Super Admin) : accès total sans restriction ──
    'directeur': {
        'tableau_de_bord':  ['lire'],
        'moderation':       ['lire', 'creer', 'modifier', 'supprimer'],
        'utilisateurs':     ['lire', 'creer', 'modifier', 'supprimer'],
        'agents':           ['lire', 'creer', 'modifier', 'supprimer'],
        'biens':            ['lire', 'modifier', 'supprimer'],
        'videos':           ['lire', 'supprimer'],
        'abonnements':      ['lire', 'modifier'],
        'boosts':           ['lire', 'modifier'],
        'messagerie':       ['lire', 'supprimer'],
        'annonces':         ['lire', 'creer', 'supprimer'],
        'preoccupations':   ['lire', 'modifier', 'supprimer'],
        'administrateurs':  ['lire', 'creer', 'modifier', 'supprimer'],
        'activites':        ['lire'],
        'finances':         ['lire'],
        'parametres':       ['lire', 'creer', 'modifier', 'supprimer'],
    },
    # ── Modérateur : vidéos, utilisateurs, agents, modération ──
    'moderateur': {
        'tableau_de_bord':  ['lire'],
        'moderation':       ['lire', 'creer', 'modifier', 'supprimer'],
        'utilisateurs':     ['lire', 'modifier'],
        'agents':           ['lire', 'modifier'],
        'biens':            ['lire', 'modifier'],
        'videos':           ['lire', 'supprimer'],
    },
    # ── Gestionnaire : abonnements, boosts, messagerie, préoccupations ──
    # AUCUN accès aux finances (revenus, transactions, stats financières, paiements)
    'gestion': {
        'tableau_de_bord':    ['lire'],
        'abonnements':        ['lire', 'modifier'],
        'boosts':             ['lire', 'modifier'],
        'messagerie':         ['lire', 'creer', 'supprimer'],
        'annonces':           ['lire', 'creer', 'supprimer'],
        'preoccupations':     ['lire', 'modifier', 'supprimer'],
    },
}

# Modules accessibles en page (clé sidebar frontend → module backend)
MODULES_PAGES = {
    'tableau-de-bord':  'tableau_de_bord',
    'moderation':       'moderation',
    'utilisateurs':     'utilisateurs',
    'agents':           'agents',
    'biens':            'biens',
    'abonnements':      'abonnements',
    'boosts':           'boosts',
    'messagerie':       'messagerie',
    'annonces':         'annonces',
    'preoccupations':   'preoccupations',
    'administrateurs':  'administrateurs',
    'activites':        'activites',
    'finances':         'finances',
    'parametres':       'parametres',
}

LABELS_ROLES = {
    'directeur':  'Directeur (Super Admin)',
    'moderateur': 'Modérateur',
    'gestion':    'Gestionnaire',
}


# ──────────────────────────────────────────────
# Fonctions utilitaires
# ──────────────────────────────────────────────

def obtenir_role_admin(utilisateur):
    """Retourne le rôle admin d'un utilisateur, ou None."""
    if not utilisateur or not utilisateur.is_authenticated:
        return None
    if utilisateur.type_compte != 'administrateur':
        return None
    try:
        return utilisateur.profil_admin.role_admin
    except Exception:
        return None


def a_permission(utilisateur, module, action='lire'):
    """Vérifie si un utilisateur admin a la permission (module, action)."""
    role = obtenir_role_admin(utilisateur)
    if not role:
        return False
    perms_role = PERMISSIONS_PAR_ROLE.get(role, {})
    actions_module = perms_role.get(module, [])
    return action in actions_module


def obtenir_permissions_pour_role(role):
    """Retourne la matrice complète de permissions pour un rôle donné."""
    return PERMISSIONS_PAR_ROLE.get(role, {})


def obtenir_modules_accessibles(role):
    """Retourne la liste des modules accessibles pour un rôle."""
    return list(PERMISSIONS_PAR_ROLE.get(role, {}).keys())


def obtenir_pages_accessibles(role):
    """Retourne les clés de pages sidebar accessibles pour un rôle."""
    modules = obtenir_modules_accessibles(role)
    pages = []
    for page_id, module_id in MODULES_PAGES.items():
        if module_id in modules:
            pages.append(page_id)
    return pages


# ──────────────────────────────────────────────
# Classes de permission DRF réutilisables
# ──────────────────────────────────────────────

class PermissionModule(BasePermission):
    """
    Permission DRF générique basée sur le module et l'action.
    Utilisée en spécifiant module et action sur la vue :

        class MaVue(APIView):
            permission_classes = [IsAuthenticated, PermissionModule]
            module_permission = 'moderation'
            action_permission = 'lire'
    """
    message = "Vous n'avez pas les permissions nécessaires pour cette action."

    def has_permission(self, request, view):
        module = getattr(view, 'module_permission', None)
        action = getattr(view, 'action_permission', 'lire')

        if not module:
            return False

        return a_permission(request.user, module, action)


def permission_pour(module, action='lire'):
    """
    Factory pour créer une classe de permission spécifique à un module/action.
    Usage :
        permission_classes = [IsAuthenticated, permission_pour('moderation', 'supprimer')]
    """
    class _PermissionDynamique(BasePermission):
        message = f"Accès refusé : permission '{action}' requise sur le module '{module}'."

        def has_permission(self, request, view):
            return a_permission(request.user, module, action)

    _PermissionDynamique.__name__ = f'Permission_{module}_{action}'
    _PermissionDynamique.__qualname__ = f'Permission_{module}_{action}'
    return _PermissionDynamique
