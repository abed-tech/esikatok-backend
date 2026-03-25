"""
Sérialiseurs pour les biens immobiliers EsikaTok.
"""
from rest_framework import serializers
from .models import BienImmobilier, ImageBien


class ImageBienSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageBien
        fields = ['id', 'image', 'legende', 'ordre', 'date_ajout']


class BienImmobilierListeSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les listes de biens (flux vidéo)."""
    agent_nom = serializers.CharField(source='agent.nom_complet', read_only=True)
    agent_photo = serializers.ImageField(source='agent.photo', read_only=True)
    agent_id = serializers.IntegerField(source='agent.id', read_only=True)
    ville_nom = serializers.CharField(source='ville.nom', read_only=True)
    commune_nom = serializers.CharField(source='commune.nom', read_only=True)
    quartier_nom = serializers.CharField(source='quartier.nom', read_only=True, default='')
    video_url = serializers.SerializerMethodField()
    miniature_url = serializers.SerializerMethodField()
    est_favori = serializers.SerializerMethodField()

    class Meta:
        model = BienImmobilier
        fields = [
            'id', 'titre', 'type_bien', 'type_offre', 'prix', 'devise',
            'nombre_chambres', 'nombre_salles_bain', 'surface_m2',
            'ville_nom', 'commune_nom', 'quartier_nom', 'quartier_texte',
            'latitude', 'longitude',
            'agent_nom', 'agent_photo', 'agent_id',
            'video_url', 'miniature_url', 'est_booste',
            'nombre_vues', 'nombre_favoris', 'nombre_partages',
            'est_favori', 'date_publication',
        ]

    def get_video_url(self, obj):
        try:
            return obj.video.url_lecture
        except Exception:
            return ''

    def get_miniature_url(self, obj):
        try:
            if obj.video.miniature:
                return obj.video.miniature.url
        except Exception:
            pass
        return ''

    def get_est_favori(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favoris.filter(utilisateur=request.user).exists()
        return False


class BienImmobilierDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur détaillé d'un bien."""
    agent_nom = serializers.CharField(source='agent.nom_complet', read_only=True)
    agent_photo = serializers.ImageField(source='agent.photo', read_only=True)
    agent_id = serializers.IntegerField(source='agent.id', read_only=True)
    ville_nom = serializers.CharField(source='ville.nom', read_only=True)
    commune_nom = serializers.CharField(source='commune.nom', read_only=True)
    quartier_nom = serializers.CharField(source='quartier.nom', read_only=True, default='')
    images = ImageBienSerializer(many=True, read_only=True)
    video_url = serializers.SerializerMethodField()
    miniature_url = serializers.SerializerMethodField()
    est_favori = serializers.SerializerMethodField()

    class Meta:
        model = BienImmobilier
        fields = [
            'id', 'titre', 'description', 'type_bien', 'type_offre',
            'prix', 'devise', 'nombre_chambres', 'nombre_salles_bain',
            'surface_m2', 'ville', 'ville_nom', 'commune', 'commune_nom',
            'quartier', 'quartier_nom', 'quartier_texte',
            'latitude', 'longitude', 'statut', 'est_booste',
            'agent_nom', 'agent_photo', 'agent_id',
            'images', 'video_url', 'miniature_url',
            'nombre_vues', 'nombre_favoris', 'nombre_partages',
            'nombre_contacts', 'est_favori',
            'date_creation', 'date_publication',
        ]

    def get_video_url(self, obj):
        try:
            return obj.video.url_lecture
        except Exception:
            return ''

    def get_miniature_url(self, obj):
        try:
            if obj.video.miniature:
                return obj.video.miniature.url
        except Exception:
            pass
        return ''

    def get_est_favori(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favoris.filter(utilisateur=request.user).exists()
        return False


class BienImmobilierCreationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'un bien par un agent."""

    class Meta:
        model = BienImmobilier
        fields = [
            'titre', 'description', 'type_bien', 'type_offre',
            'prix', 'devise', 'nombre_chambres', 'nombre_salles_bain',
            'surface_m2', 'ville', 'commune', 'quartier', 'quartier_texte',
            'avenue', 'numero_adresse', 'latitude', 'longitude',
        ]

    def validate(self, donnees):
        # Vérifier cohérence localisation
        commune = donnees.get('commune')
        ville = donnees.get('ville')
        quartier = donnees.get('quartier')

        if commune and ville and commune.ville != ville:
            raise serializers.ValidationError({
                'commune': "La commune sélectionnée n'appartient pas à cette ville."
            })
        if quartier and commune and quartier.commune != commune:
            raise serializers.ValidationError({
                'quartier': "Le quartier sélectionné n'appartient pas à cette commune."
            })
        return donnees

    def create(self, donnees_validees):
        donnees_validees['agent'] = self.context['request'].user
        donnees_validees['statut'] = 'brouillon'
        return super().create(donnees_validees)
