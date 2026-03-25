"""
Sérialiseurs pour les vidéos EsikaTok.
"""
from rest_framework import serializers
from .models import Video


class VideoSerializer(serializers.ModelSerializer):
    """Sérialiseur complet d'une vidéo."""
    url_lecture = serializers.ReadOnlyField()
    bien_titre = serializers.CharField(source='bien.titre', read_only=True)

    class Meta:
        model = Video
        fields = [
            'id', 'bien', 'bien_titre', 'agent',
            'fichier_video', 'url_externe', 'miniature',
            'url_lecture', 'duree_secondes', 'taille_octets',
            'format_video', 'resolution', 'est_verticale',
            'nombre_lectures', 'nombre_lectures_completes',
            'date_upload', 'date_modification',
        ]
        read_only_fields = ['id', 'agent', 'nombre_lectures', 'nombre_lectures_completes', 'date_upload']


class VideoUploadSerializer(serializers.Serializer):
    """Sérialiseur pour l'upload d'une vidéo."""
    fichier_video = serializers.FileField()
    miniature = serializers.ImageField(required=False)

    def validate_fichier_video(self, valeur):
        from django.conf import settings
        taille_max = settings.TAILLE_MAX_VIDEO_MO * 1024 * 1024
        if valeur.size > taille_max:
            raise serializers.ValidationError(
                f"La vidéo ne doit pas dépasser {settings.TAILLE_MAX_VIDEO_MO} Mo."
            )
        if valeur.content_type not in settings.TYPES_VIDEO_AUTORISES:
            raise serializers.ValidationError(
                "Format de vidéo non supporté. Formats acceptés : MP4, WebM, MOV."
            )
        return valeur
