"""
URLs de la messagerie pour EsikaTok.
"""
from django.urls import path
from .views import (
    VueMesConversations, VueCreerConversation,
    VueMessagesConversation, VueEnvoyerMessage,
    VueCompteurNonLus,
)

urlpatterns = [
    path('non-lus/', VueCompteurNonLus.as_view(), name='compteur_non_lus'),
    path('conversations/', VueMesConversations.as_view(), name='mes_conversations'),
    path('conversations/creer/', VueCreerConversation.as_view(), name='creer_conversation'),
    path('conversations/<int:conversation_id>/messages/', VueMessagesConversation.as_view(), name='messages_conversation'),
    path('conversations/<int:conversation_id>/envoyer/', VueEnvoyerMessage.as_view(), name='envoyer_message'),
]
