"""
Modèles de comptes utilisateurs pour EsikaTok.
Gère les utilisateurs simples, agents immobiliers et administrateurs.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class GestionnaireUtilisateur(BaseUserManager):
    """Gestionnaire personnalisé pour le modèle Utilisateur."""

    def creer_utilisateur(self, email, mot_de_passe=None, **champs_extra):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        email = self.normalize_email(email)
        utilisateur = self.model(email=email, **champs_extra)
        utilisateur.set_password(mot_de_passe)
        utilisateur.save(using=self._db)
        return utilisateur

    def creer_superutilisateur(self, email, mot_de_passe=None, **champs_extra):
        champs_extra.setdefault('is_staff', True)
        champs_extra.setdefault('is_superuser', True)
        champs_extra.setdefault('type_compte', 'administrateur')
        champs_extra.setdefault('est_actif', True)
        return self.creer_utilisateur(email, mot_de_passe, **champs_extra)

    def create_user(self, email, password=None, **extra_fields):
        return self.creer_utilisateur(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        return self.creer_superutilisateur(email, password, **extra_fields)


class Utilisateur(AbstractBaseUser, PermissionsMixin):
    """
    Modèle utilisateur principal d'EsikaTok.
    Sert de base pour tous les types de comptes.
    """

    class TypeCompte(models.TextChoices):
        SIMPLE = 'simple', 'Utilisateur simple'
        AGENT = 'agent', 'Agent immobilier'
        ADMINISTRATEUR = 'administrateur', 'Administrateur'

    # --- Identité ---
    email = models.EmailField('Adresse e-mail', unique=True, db_index=True)
    nom = models.CharField('Nom', max_length=100)
    postnom = models.CharField('Post-nom', max_length=100, blank=True, default='')
    prenom = models.CharField('Prénom', max_length=100)
    telephone = models.CharField('Téléphone', max_length=20, blank=True, default='')
    photo = models.ImageField('Photo de profil', upload_to='profils/', blank=True, null=True)

    # --- Type de compte ---
    type_compte = models.CharField(
        'Type de compte',
        max_length=20,
        choices=TypeCompte.choices,
        default=TypeCompte.SIMPLE,
        db_index=True,
    )

    # --- État du compte ---
    est_actif = models.BooleanField('Compte actif', default=True)
    est_verifie = models.BooleanField('E-mail vérifié', default=False)
    is_staff = models.BooleanField('Accès staff', default=False)

    # --- Dates ---
    date_inscription = models.DateTimeField('Date d\'inscription', default=timezone.now)
    derniere_connexion_enregistree = models.DateTimeField(
        'Dernière connexion enregistrée', null=True, blank=True
    )

    objects = GestionnaireUtilisateur()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom']

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-date_inscription']

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.email})"

    @property
    def nom_complet(self):
        parties = [self.prenom, self.postnom, self.nom]
        return ' '.join(p for p in parties if p)

    @property
    def est_agent(self):
        return self.type_compte == self.TypeCompte.AGENT

    @property
    def est_administrateur(self):
        return self.type_compte == self.TypeCompte.ADMINISTRATEUR

    @property
    def est_simple(self):
        return self.type_compte == self.TypeCompte.SIMPLE


class ProfilAgent(models.Model):
    """Profil professionnel étendu pour les agents immobiliers."""

    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='profil_agent',
        verbose_name='Utilisateur',
    )
    nom_professionnel = models.CharField('Nom professionnel', max_length=200, blank=True, default='')
    bio = models.TextField('Biographie', blank=True, default='')
    numero_licence = models.CharField('Numéro de licence', max_length=50, blank=True, default='')
    ville_principale = models.ForeignKey(
        'localisations.Ville',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Ville principale',
    )
    adresse_bureau = models.CharField('Adresse du bureau', max_length=300, blank=True, default='')
    site_web = models.URLField('Site web', blank=True, default='')
    est_verifie_agent = models.BooleanField('Agent vérifié', default=False)
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)
    date_modification = models.DateTimeField('Date de modification', auto_now=True)

    class Meta:
        verbose_name = 'Profil agent'
        verbose_name_plural = 'Profils agents'

    def __str__(self):
        return f"Agent: {self.utilisateur.nom_complet}"


class RoleAdministrateur(models.TextChoices):
    """Rôles disponibles pour les administrateurs."""
    DIRECTEUR = 'directeur', 'Directeur (Super Admin)'
    GESTION = 'gestion', 'Gestionnaire'
    MODERATEUR = 'moderateur', 'Modérateur'


class ProfilAdministrateur(models.Model):
    """Profil étendu pour les administrateurs internes."""

    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='profil_admin',
        verbose_name='Utilisateur',
    )
    matricule = models.CharField('Matricule', max_length=50, unique=True)
    role_admin = models.CharField(
        'Rôle administrateur',
        max_length=30,
        choices=RoleAdministrateur.choices,
        default=RoleAdministrateur.MODERATEUR,
    )
    cree_par = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admins_crees',
        verbose_name='Créé par',
    )
    est_en_ligne = models.BooleanField('En ligne', default=False)
    derniere_activite = models.DateTimeField('Dernière activité', null=True, blank=True)
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'Profil administrateur'
        verbose_name_plural = 'Profils administrateurs'

    def __str__(self):
        return f"Admin {self.matricule}: {self.utilisateur.nom_complet} ({self.role_admin})"


class JournalConnexionAdmin(models.Model):
    """Journal des connexions/déconnexions des administrateurs."""

    admin = models.ForeignKey(
        ProfilAdministrateur,
        on_delete=models.CASCADE,
        related_name='journaux_connexion',
        verbose_name='Administrateur',
    )
    heure_connexion = models.DateTimeField('Heure de connexion', default=timezone.now)
    heure_deconnexion = models.DateTimeField('Heure de déconnexion', null=True, blank=True)
    duree_session_minutes = models.PositiveIntegerField('Durée session (min)', default=0)
    adresse_ip = models.GenericIPAddressField('Adresse IP', null=True, blank=True)

    class Meta:
        verbose_name = 'Journal de connexion admin'
        verbose_name_plural = 'Journaux de connexion admin'
        ordering = ['-heure_connexion']

    def __str__(self):
        return f"{self.admin.matricule} - {self.heure_connexion}"


class JournalActiviteAdmin(models.Model):
    """Journal des activités effectuées par les administrateurs."""

    admin = models.ForeignKey(
        ProfilAdministrateur,
        on_delete=models.CASCADE,
        related_name='journaux_activite',
        verbose_name='Administrateur',
    )
    action = models.CharField('Action', max_length=200)
    detail = models.TextField('Détail', blank=True, default='')
    objet_type = models.CharField('Type d\'objet', max_length=100, blank=True, default='')
    objet_id = models.PositiveBigIntegerField('ID de l\'objet', null=True, blank=True)
    date_action = models.DateTimeField('Date de l\'action', default=timezone.now)

    class Meta:
        verbose_name = 'Journal d\'activité admin'
        verbose_name_plural = 'Journaux d\'activité admin'
        ordering = ['-date_action']

    def __str__(self):
        return f"{self.admin.matricule} - {self.action} - {self.date_action}"
