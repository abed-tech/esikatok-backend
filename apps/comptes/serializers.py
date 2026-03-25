"""
Sérialiseurs pour les comptes utilisateurs EsikaTok.
"""
from rest_framework import serializers
from django.conf import settings
from .models import Utilisateur, ProfilAgent, ProfilAdministrateur


class InscriptionUtilisateurSerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'inscription d'un utilisateur simple."""
    mot_de_passe = serializers.CharField(write_only=True, min_length=8)
    confirmation_mot_de_passe = serializers.CharField(write_only=True)

    class Meta:
        model = Utilisateur
        fields = ['email', 'nom', 'postnom', 'prenom', 'telephone', 'mot_de_passe', 'confirmation_mot_de_passe']

    def validate_email(self, valeur):
        domaine = valeur.split('@')[-1].lower()
        if domaine in settings.DOMAINES_EMAIL_INTERDITS:
            raise serializers.ValidationError("Les adresses e-mail jetables ne sont pas acceptées.")
        if Utilisateur.objects.filter(email__iexact=valeur).exists():
            raise serializers.ValidationError("Un compte avec cet e-mail existe déjà.")
        return valeur.lower()

    def validate(self, donnees):
        if donnees['mot_de_passe'] != donnees['confirmation_mot_de_passe']:
            raise serializers.ValidationError({"confirmation_mot_de_passe": "Les mots de passe ne correspondent pas."})
        return donnees

    def create(self, donnees_validees):
        donnees_validees.pop('confirmation_mot_de_passe')
        mot_de_passe = donnees_validees.pop('mot_de_passe')
        utilisateur = Utilisateur(**donnees_validees, type_compte='simple')
        utilisateur.set_password(mot_de_passe)
        utilisateur.save()
        return utilisateur


class InscriptionAgentSerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'inscription d'un agent immobilier."""
    mot_de_passe = serializers.CharField(write_only=True, min_length=8)
    confirmation_mot_de_passe = serializers.CharField(write_only=True)
    nom_professionnel = serializers.CharField(required=False, allow_blank=True, default='')
    bio = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Utilisateur
        fields = [
            'email', 'nom', 'postnom', 'prenom', 'telephone',
            'mot_de_passe', 'confirmation_mot_de_passe',
            'nom_professionnel', 'bio',
        ]

    def validate_email(self, valeur):
        domaine = valeur.split('@')[-1].lower()
        if domaine in settings.DOMAINES_EMAIL_INTERDITS:
            raise serializers.ValidationError("Les adresses e-mail jetables ne sont pas acceptées.")
        if Utilisateur.objects.filter(email__iexact=valeur).exists():
            raise serializers.ValidationError("Un compte avec cet e-mail existe déjà.")
        return valeur.lower()

    def validate(self, donnees):
        if donnees['mot_de_passe'] != donnees['confirmation_mot_de_passe']:
            raise serializers.ValidationError({"confirmation_mot_de_passe": "Les mots de passe ne correspondent pas."})
        return donnees

    def create(self, donnees_validees):
        donnees_validees.pop('confirmation_mot_de_passe')
        mot_de_passe = donnees_validees.pop('mot_de_passe')
        nom_pro = donnees_validees.pop('nom_professionnel', '')
        bio = donnees_validees.pop('bio', '')

        utilisateur = Utilisateur(**donnees_validees, type_compte='agent')
        utilisateur.set_password(mot_de_passe)
        utilisateur.save()

        ProfilAgent.objects.create(
            utilisateur=utilisateur,
            nom_professionnel=nom_pro or f"{utilisateur.prenom} {utilisateur.nom}",
            bio=bio,
        )
        return utilisateur


class ConnexionSerializer(serializers.Serializer):
    """Sérialiseur pour la connexion utilisateur/agent (email + mot de passe)."""
    email = serializers.EmailField()
    mot_de_passe = serializers.CharField()


class ConnexionAdminSerializer(serializers.Serializer):
    """Sérialiseur pour la connexion administrateur (matricule + mot de passe)."""
    matricule = serializers.CharField()
    mot_de_passe = serializers.CharField()


class UtilisateurSerializer(serializers.ModelSerializer):
    """Sérialiseur complet d'un utilisateur."""
    nom_complet = serializers.ReadOnlyField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'email', 'nom', 'postnom', 'prenom', 'telephone',
            'photo', 'type_compte', 'nom_complet', 'est_actif',
            'est_verifie', 'date_inscription',
        ]
        read_only_fields = ['id', 'email', 'type_compte', 'date_inscription', 'est_actif', 'est_verifie']


class UtilisateurResumeSerializer(serializers.ModelSerializer):
    """Sérialiseur résumé d'un utilisateur (pour listes)."""
    class Meta:
        model = Utilisateur
        fields = ['id', 'nom', 'prenom', 'photo', 'type_compte']


class ProfilAgentSerializer(serializers.ModelSerializer):
    """Sérialiseur du profil agent."""
    utilisateur = UtilisateurSerializer(read_only=True)
    nombre_biens = serializers.SerializerMethodField()
    nombre_videos_actives = serializers.SerializerMethodField()

    class Meta:
        model = ProfilAgent
        fields = [
            'id', 'utilisateur', 'nom_professionnel', 'bio',
            'numero_licence', 'ville_principale', 'adresse_bureau',
            'site_web', 'est_verifie_agent', 'nombre_biens',
            'nombre_videos_actives', 'date_creation',
        ]

    def get_nombre_biens(self, obj):
        return obj.utilisateur.biens.filter(statut__in=['publie', 'approuve']).count()

    def get_nombre_videos_actives(self, obj):
        return obj.utilisateur.videos.count()


class ProfilAgentEditionSerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'édition du profil agent."""
    class Meta:
        model = ProfilAgent
        fields = [
            'nom_professionnel', 'bio', 'numero_licence',
            'ville_principale', 'adresse_bureau', 'site_web',
        ]


class ProfilAdministrateurSerializer(serializers.ModelSerializer):
    """Sérialiseur du profil administrateur."""
    utilisateur = UtilisateurSerializer(read_only=True)

    class Meta:
        model = ProfilAdministrateur
        fields = [
            'id', 'utilisateur', 'matricule', 'role_admin',
            'est_en_ligne', 'derniere_activite', 'date_creation',
        ]


class CreationAdminSerializer(serializers.Serializer):
    """Sérialiseur pour la création d'un administrateur par le directeur."""
    email = serializers.EmailField()
    nom = serializers.CharField(max_length=100)
    postnom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom = serializers.CharField(max_length=100)
    matricule = serializers.CharField(max_length=50)
    role_admin = serializers.ChoiceField(choices=[
        ('gestion', 'Gestionnaire'),
        ('moderateur', 'Modérateur'),
    ])
    mot_de_passe = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, valeur):
        if Utilisateur.objects.filter(email__iexact=valeur).exists():
            raise serializers.ValidationError("Un compte avec cet e-mail existe déjà.")
        return valeur.lower()

    def validate_matricule(self, valeur):
        if ProfilAdministrateur.objects.filter(matricule=valeur).exists():
            raise serializers.ValidationError("Ce matricule est déjà utilisé.")
        return valeur

    def create(self, donnees_validees):
        mot_de_passe = donnees_validees.pop('mot_de_passe')
        matricule = donnees_validees.pop('matricule')
        role_admin = donnees_validees.pop('role_admin')

        utilisateur = Utilisateur(
            **donnees_validees,
            type_compte='administrateur',
            is_staff=True,
        )
        utilisateur.set_password(mot_de_passe)
        utilisateur.save()

        ProfilAdministrateur.objects.create(
            utilisateur=utilisateur,
            matricule=matricule,
            role_admin=role_admin,
            cree_par=self.context.get('request').user if self.context.get('request') else None,
        )
        return utilisateur
