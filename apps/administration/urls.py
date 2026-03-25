"""
URLs de l'administration interne pour EsikaTok.
"""
from django.urls import path
from .views import (
    VueMesPermissions, VueBadgesAdmin, VueTableauDeBordParRole,
    VueListeUtilisateurs, VueDetailUtilisateurAdmin,
    VueActiverDesactiverUtilisateur, VueSupprimerUtilisateur,
    VueListeAgentsAdmin, VueDetailAgentAdmin, VueActionAgentAdmin,
    VueListeBiensAdmin, VueSupprimerBienAdmin, VueRetirerBienAdmin,
    VueSupprimerVideoAdmin, VueHistoriqueSuppressionsVideos,
    VueListeAdmins, VueDetailAdmin, VueModifierRoleAdmin, VueSupprimerAdmin,
    VueListeAbonnementsAdmin, VueActionAbonnementAdmin,
    VueListeBoostsAdmin, VueSuspendreBoost,
    VueListeTransactionsAdmin,
    VueListeConversationsAdmin, VueMessagesConversationAdmin, VueSupprimerMessageAdmin,
    VueLogsConnexionAdmin, VueLogsActiviteAdmin,
    VueFinancesAdmin,
    VueParametresAdmin,
    VueFichesTravailAdmin,
    VueListeAnnoncesAdmin, VueSupprimerAnnonceAdmin,
    VueListePreoccupationsAdmin, VueTraiterPreoccupationAdmin,
)

urlpatterns = [
    # Session / Permissions
    path('mes-permissions/', VueMesPermissions.as_view(), name='admin_mes_permissions'),
    path('badges/', VueBadgesAdmin.as_view(), name='admin_badges'),
    path('tableau-de-bord/', VueTableauDeBordParRole.as_view(), name='admin_tableau_de_bord_role'),
    # Utilisateurs
    path('utilisateurs/', VueListeUtilisateurs.as_view(), name='admin_liste_utilisateurs'),
    path('utilisateurs/<int:pk>/', VueDetailUtilisateurAdmin.as_view(), name='admin_detail_utilisateur'),
    path('utilisateurs/<int:pk>/statut/', VueActiverDesactiverUtilisateur.as_view(), name='admin_statut_utilisateur'),
    path('utilisateurs/<int:pk>/supprimer/', VueSupprimerUtilisateur.as_view(), name='admin_supprimer_utilisateur'),
    # Agents
    path('agents/', VueListeAgentsAdmin.as_view(), name='admin_liste_agents'),
    path('agents/<int:pk>/', VueDetailAgentAdmin.as_view(), name='admin_detail_agent'),
    path('agents/<int:pk>/action/', VueActionAgentAdmin.as_view(), name='admin_action_agent'),
    # Biens
    path('biens/', VueListeBiensAdmin.as_view(), name='admin_liste_biens'),
    path('biens/<int:pk>/supprimer/', VueSupprimerBienAdmin.as_view(), name='admin_supprimer_bien'),
    path('biens/<int:pk>/retirer/', VueRetirerBienAdmin.as_view(), name='admin_retirer_bien'),
    # Vidéos
    path('videos/<int:pk>/supprimer/', VueSupprimerVideoAdmin.as_view(), name='admin_supprimer_video'),
    path('videos/suppressions/', VueHistoriqueSuppressionsVideos.as_view(), name='admin_historique_suppressions_videos'),
    # Administrateurs
    path('admins/', VueListeAdmins.as_view(), name='admin_liste_admins'),
    path('admins/<int:pk>/', VueDetailAdmin.as_view(), name='admin_detail_admin'),
    path('admins/<int:pk>/role/', VueModifierRoleAdmin.as_view(), name='admin_modifier_role'),
    path('admins/<int:pk>/supprimer/', VueSupprimerAdmin.as_view(), name='admin_supprimer_admin'),
    # Abonnements
    path('abonnements/', VueListeAbonnementsAdmin.as_view(), name='admin_liste_abonnements'),
    path('abonnements/<int:pk>/action/', VueActionAbonnementAdmin.as_view(), name='admin_action_abonnement'),
    # Boosts
    path('boosts/', VueListeBoostsAdmin.as_view(), name='admin_liste_boosts'),
    path('boosts/<int:pk>/action/', VueSuspendreBoost.as_view(), name='admin_action_boost'),
    # Transactions
    path('transactions/', VueListeTransactionsAdmin.as_view(), name='admin_liste_transactions'),
    # Messagerie
    path('messagerie/conversations/', VueListeConversationsAdmin.as_view(), name='admin_liste_conversations'),
    path('messagerie/conversations/<int:pk>/messages/', VueMessagesConversationAdmin.as_view(), name='admin_messages_conversation'),
    path('messagerie/messages/<int:pk>/supprimer/', VueSupprimerMessageAdmin.as_view(), name='admin_supprimer_message'),
    # Logs
    path('logs/connexions/', VueLogsConnexionAdmin.as_view(), name='admin_logs_connexions'),
    path('logs/activites/', VueLogsActiviteAdmin.as_view(), name='admin_logs_activites'),
    # Finances
    path('finances/', VueFinancesAdmin.as_view(), name='admin_finances'),
    # Paramètres
    path('parametres/', VueParametresAdmin.as_view(), name='admin_parametres'),
    # Fiches de travail
    path('fiches-travail/', VueFichesTravailAdmin.as_view(), name='admin_fiches_travail'),
    # Annonces (Plateforme → Utilisateurs)
    path('annonces/', VueListeAnnoncesAdmin.as_view(), name='admin_liste_annonces'),
    path('annonces/<int:pk>/supprimer/', VueSupprimerAnnonceAdmin.as_view(), name='admin_supprimer_annonce'),
    # Préoccupations (Questions utilisateurs)
    path('preoccupations/', VueListePreoccupationsAdmin.as_view(), name='admin_liste_preoccupations'),
    path('preoccupations/<int:pk>/traiter/', VueTraiterPreoccupationAdmin.as_view(), name='admin_traiter_preoccupation'),
]
