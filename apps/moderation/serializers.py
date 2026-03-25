"""
Sérialiseurs pour la modération de contenu EsikaTok.
"""
from rest_framework import serializers
from .models import SoumissionModeration, DecisionModeration


class SoumissionModerationSerializer(serializers.ModelSerializer):
    """Sérialiseur d'une soumission de modération."""
    bien_titre = serializers.CharField(source='bien.titre', read_only=True)
    agent_nom = serializers.CharField(source='agent.nom_complet', read_only=True)
    bien_type = serializers.CharField(source='bien.type_bien', read_only=True)
    bien_prix = serializers.DecimalField(source='bien.prix', max_digits=12, decimal_places=2, read_only=True)
    video_url = serializers.SerializerMethodField()
    video_id = serializers.SerializerMethodField()

    class Meta:
        model = SoumissionModeration
        fields = [
            'id', 'bien', 'bien_titre', 'bien_type', 'bien_prix',
            'agent', 'agent_nom', 'statut', 'commentaire_agent',
            'video_url', 'video_id', 'date_soumission', 'date_traitement',
        ]
        read_only_fields = ['id', 'bien', 'agent', 'date_soumission', 'date_traitement']

    def get_video_url(self, obj):
        try:
            return obj.bien.video.url_lecture
        except Exception:
            return ''

    def get_video_id(self, obj):
        from apps.videos.models import Video
        try:
            video = Video.all_objects.filter(bien=obj.bien).first()
            return video.id if video else None
        except Exception:
            return None


class DecisionModerationSerializer(serializers.ModelSerializer):
    """Sérialiseur d'une décision de modération."""
    moderateur_nom = serializers.CharField(source='moderateur.nom_complet', read_only=True)

    class Meta:
        model = DecisionModeration
        fields = [
            'id', 'soumission', 'moderateur', 'moderateur_nom',
            'decision', 'motif', 'notes_internes', 'date_decision',
        ]
        read_only_fields = ['id', 'moderateur', 'date_decision']


class TraiterModerationSerializer(serializers.Serializer):
    """Sérialiseur pour traiter une soumission de modération."""
    decision = serializers.ChoiceField(choices=[
        ('approuvee', 'Approuver'),
        ('refusee', 'Refuser'),
        ('correction', 'Demander correction'),
        ('suspendue', 'Suspendre'),
    ])
    motif = serializers.CharField(required=False, allow_blank=True, default='')
    notes_internes = serializers.CharField(required=False, allow_blank=True, default='')
