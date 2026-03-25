"""
Sérialiseurs pour la messagerie EsikaTok.
"""
from rest_framework import serializers
from .models import Conversation, Message
from apps.comptes.serializers import UtilisateurResumeSerializer


class MessageSerializer(serializers.ModelSerializer):
    """Sérialiseur d'un message."""
    expediteur_nom = serializers.CharField(source='expediteur.nom_complet', read_only=True)
    est_moi = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'expediteur', 'expediteur_nom',
            'contenu', 'est_lu', 'est_moi', 'date_envoi', 'date_lecture',
        ]
        read_only_fields = ['id', 'expediteur', 'est_lu', 'date_envoi', 'date_lecture']

    def get_est_moi(self, obj):
        request = self.context.get('request')
        if request:
            return obj.expediteur == request.user
        return False


class ConversationSerializer(serializers.ModelSerializer):
    """Sérialiseur d'une conversation."""
    initiateur = UtilisateurResumeSerializer(read_only=True)
    agent = UtilisateurResumeSerializer(read_only=True)
    bien_titre = serializers.CharField(source='bien.titre', read_only=True, default='')
    bien_id = serializers.IntegerField(source='bien.id', read_only=True, default=None)
    dernier_message = serializers.SerializerMethodField()
    messages_non_lus = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'bien_titre', 'bien_id', 'initiateur', 'agent',
            'est_active', 'dernier_message', 'messages_non_lus',
            'date_creation', 'date_dernier_message',
        ]

    def get_dernier_message(self, obj):
        msg = obj.messages.order_by('-date_envoi').first()
        if msg:
            return {
                'contenu': msg.contenu[:80],
                'expediteur_nom': msg.expediteur.prenom,
                'date_envoi': msg.date_envoi,
                'est_lu': msg.est_lu,
            }
        return None

    def get_messages_non_lus(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(est_lu=False).exclude(expediteur=request.user).count()
        return 0


class CreationConversationSerializer(serializers.Serializer):
    """Sérialiseur pour créer une conversation à partir d'un bien."""
    bien_id = serializers.IntegerField()
    message_initial = serializers.CharField(min_length=1, max_length=2000)

    def validate_bien_id(self, valeur):
        from apps.biens.models import BienImmobilier
        try:
            bien = BienImmobilier.objects.get(id=valeur, statut__in=['publie', 'approuve'])
        except BienImmobilier.DoesNotExist:
            raise serializers.ValidationError("Ce bien n'existe pas ou n'est pas publié.")
        return valeur


class EnvoiMessageSerializer(serializers.Serializer):
    """Sérialiseur pour envoyer un message dans une conversation existante."""
    contenu = serializers.CharField(min_length=1, max_length=5000)
