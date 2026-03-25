"""
Permissions personnalisées pour EsikaTok.
Contrôle d'accès par rôle pour toutes les API.
"""
from rest_framework.permissions import BasePermission


class EstUtilisateurActif(BasePermission):
    """Autorise uniquement les utilisateurs actifs."""
    message = "Votre compte est désactivé."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.est_actif


class EstAgent(BasePermission):
    """Autorise uniquement les agents immobiliers."""
    message = "Seuls les agents immobiliers peuvent effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.est_agent
        )


class EstAdministrateur(BasePermission):
    """Autorise uniquement les administrateurs."""
    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.est_administrateur
        )


class EstDirecteur(BasePermission):
    """Autorise uniquement les directeurs."""
    message = "Accès réservé à la direction."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.est_administrateur):
            return False
        try:
            return request.user.profil_admin.role_admin == 'directeur'
        except Exception:
            return False


class EstModerateur(BasePermission):
    """Autorise les modérateurs et directeurs."""
    message = "Accès réservé aux modérateurs."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.est_administrateur):
            return False
        try:
            return request.user.profil_admin.role_admin in ['moderateur', 'directeur']
        except Exception:
            return False


class EstGestion(BasePermission):
    """Autorise les admins gestion et directeurs."""
    message = "Accès réservé à l'administration gestion."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.est_administrateur):
            return False
        try:
            return request.user.profil_admin.role_admin in ['gestion', 'directeur']
        except Exception:
            return False




class EstProprietaireBien(BasePermission):
    """Vérifie que l'utilisateur est propriétaire du bien."""
    message = "Vous n'êtes pas autorisé à modifier ce bien."

    def has_object_permission(self, request, view, obj):
        return obj.agent == request.user


class EstParticipantConversation(BasePermission):
    """Vérifie que l'utilisateur participe à la conversation."""
    message = "Vous ne participez pas à cette conversation."

    def has_object_permission(self, request, view, obj):
        return request.user in [obj.initiateur, obj.agent]


class LectureSeuleOuAgent(BasePermission):
    """Lecture pour tous, écriture pour les agents uniquement."""
    message = "Seuls les agents peuvent effectuer cette action."

    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.user.est_agent
        )
