"""
Vues API pour la messagerie EsikaTok.
La première conversation est toujours déclenchée à partir d'un bien.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q

from django.db.models import Count

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    CreationConversationSerializer,
    EnvoiMessageSerializer,
)
from apps.biens.models import BienImmobilier
from apps.comptes.permissions import EstParticipantConversation


class VueCompteurNonLus(APIView):
    """Compteur léger de messages non lus pour les badges."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Conversations where user is participant
        conversations = Conversation.objects.filter(
            Q(initiateur=user) | Q(agent=user)
        )
        # Per-conversation unread counts (messages not sent by me and not read)
        conversations_avec_non_lus = conversations.filter(
            messages__est_lu=False
        ).exclude(
            messages__expediteur=user
        ).annotate(
            _non_lus=Count(
                'messages',
                filter=Q(messages__est_lu=False) & ~Q(messages__expediteur=user)
            )
        ).filter(_non_lus__gt=0)

        total_conversations = conversations_avec_non_lus.count()
        total_messages = sum(c._non_lus for c in conversations_avec_non_lus)

        return Response({
            'conversations_non_lues': total_conversations,
            'messages_non_lus': total_messages,
        })


class VueMesConversations(generics.ListAPIView):
    """Liste des conversations de l'utilisateur connecté."""
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(initiateur=self.request.user) | Q(agent=self.request.user)
        ).select_related('initiateur', 'agent', 'bien').order_by('-date_dernier_message')


class VueCreerConversation(APIView):
    """Créer une conversation à partir d'un bien."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreationConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bien_id = serializer.validated_data['bien_id']
        message_initial = serializer.validated_data['message_initial']

        try:
            bien = BienImmobilier.objects.get(id=bien_id, statut__in=['publie', 'approuve'])
        except BienImmobilier.DoesNotExist:
            return Response(
                {'erreur': 'Bien introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if bien.agent == request.user:
            return Response(
                {'erreur': 'Vous ne pouvez pas vous envoyer un message à vous-même.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier si une conversation existe déjà pour ce bien
        conversation = Conversation.objects.filter(
            initiateur=request.user,
            agent=bien.agent,
            bien=bien,
        ).first()

        if not conversation:
            conversation = Conversation.objects.create(
                bien=bien,
                initiateur=request.user,
                agent=bien.agent,
            )
            # Incrémenter le compteur de contacts du bien
            bien.nombre_contacts += 1
            bien.save(update_fields=['nombre_contacts'])

        # Créer le message initial
        Message.objects.create(
            conversation=conversation,
            expediteur=request.user,
            contenu=message_initial,
        )

        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class VueMessagesConversation(APIView):
    """Messages d'une conversation."""
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                Q(id=conversation_id),
                Q(initiateur=request.user) | Q(agent=request.user),
            )
        except Conversation.DoesNotExist:
            return Response(
                {'erreur': 'Conversation introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Marquer les messages comme lus
        Message.objects.filter(
            conversation=conversation, est_lu=False
        ).exclude(expediteur=request.user).update(
            est_lu=True, date_lecture=timezone.now()
        )

        messages = conversation.messages.select_related('expediteur').all()
        serializer = MessageSerializer(messages, many=True, context={'request': request})

        return Response({
            'conversation': ConversationSerializer(conversation, context={'request': request}).data,
            'messages': serializer.data,
        })


class VueEnvoyerMessage(APIView):
    """Envoyer un message dans une conversation existante."""
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                Q(id=conversation_id),
                Q(initiateur=request.user) | Q(agent=request.user),
            )
        except Conversation.DoesNotExist:
            return Response(
                {'erreur': 'Conversation introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EnvoiMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = Message.objects.create(
            conversation=conversation,
            expediteur=request.user,
            contenu=serializer.validated_data['contenu'],
        )

        conversation.save()  # Met à jour date_dernier_message via auto_now

        return Response(
            MessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )
