"""
Modèles d'administration interne pour EsikaTok.
Gère le temps de travail, la rémunération et les actions mensuelles.
"""
from django.db import models
from django.conf import settings


class FicheTravailMensuel(models.Model):
    """Fiche mensuelle de travail d'un administrateur."""

    admin = models.ForeignKey(
        'comptes.ProfilAdministrateur',
        on_delete=models.CASCADE,
        related_name='fiches_travail',
        verbose_name='Administrateur',
    )
    mois = models.PositiveSmallIntegerField('Mois')
    annee = models.PositiveSmallIntegerField('Année')
    heures_travaillees = models.DecimalField(
        'Heures travaillées', max_digits=6, decimal_places=2, default=0,
    )
    heures_supplementaires = models.DecimalField(
        'Heures supplémentaires', max_digits=6, decimal_places=2, default=0,
    )
    salaire_base_usd = models.DecimalField(
        'Salaire de base (USD)', max_digits=10, decimal_places=2, default=0,
    )
    prime_heures_sup_usd = models.DecimalField(
        'Prime heures sup (USD)', max_digits=10, decimal_places=2, default=0,
    )
    total_usd = models.DecimalField(
        'Total (USD)', max_digits=10, decimal_places=2, default=0,
    )
    est_valide = models.BooleanField('Validé', default=False)
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fiches_validees',
        verbose_name='Validé par',
    )
    notes = models.TextField('Notes', blank=True, default='')
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)
    date_modification = models.DateTimeField('Date de modification', auto_now=True)

    class Meta:
        verbose_name = 'Fiche de travail mensuel'
        verbose_name_plural = 'Fiches de travail mensuel'
        unique_together = [('admin', 'mois', 'annee')]
        ordering = ['-annee', '-mois']

    def __str__(self):
        return f"Fiche {self.mois}/{self.annee} - {self.admin}"


class ParametrePlateforme(models.Model):
    """Paramètres de configuration globale de la plateforme."""

    cle = models.CharField('Clé', max_length=100, unique=True, db_index=True)
    valeur = models.TextField('Valeur', blank=True, default='')
    description = models.CharField('Description', max_length=300, blank=True, default='')
    type_donnee = models.CharField(
        'Type de donnée', max_length=20, default='texte',
        choices=[
            ('texte', 'Texte'),
            ('nombre', 'Nombre'),
            ('booleen', 'Booléen'),
            ('json', 'JSON'),
        ],
    )
    date_modification = models.DateTimeField('Dernière modification', auto_now=True)
    modifie_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name='Modifié par',
    )

    class Meta:
        verbose_name = 'Paramètre de plateforme'
        verbose_name_plural = 'Paramètres de plateforme'
        ordering = ['cle']

    def __str__(self):
        return f"{self.cle} = {self.valeur[:50]}"


class Annonce(models.Model):
    """
    Annonce officielle de la plateforme vers les utilisateurs.
    Envoyée par un Gestionnaire ou Directeur. Lecture seule côté utilisateur,
    aucune réponse possible, aucun chat.
    """

    class Cible(models.TextChoices):
        TOUS = 'tous', 'Tous les utilisateurs'
        SPECIFIQUE = 'specifique', 'Utilisateur spécifique'

    titre = models.CharField('Titre', max_length=200)
    contenu = models.TextField('Contenu')
    cible = models.CharField(
        'Cible', max_length=20, choices=Cible.choices, default=Cible.TOUS,
    )
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='annonces_recues',
        verbose_name='Destinataire',
        help_text='Rempli uniquement si cible = spécifique',
    )
    envoye_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='annonces_envoyees',
        verbose_name='Envoyé par',
    )
    est_lu = models.BooleanField('Lu', default=False)
    date_envoi = models.DateTimeField('Date d\'envoi', auto_now_add=True)

    class Meta:
        verbose_name = 'Annonce'
        verbose_name_plural = 'Annonces'
        ordering = ['-date_envoi']

    def __str__(self):
        return f"Annonce: {self.titre} ({self.cible})"


class Preoccupation(models.Model):
    """
    Question/préoccupation envoyée par un utilisateur via la page Aide.
    Seul canal de communication utilisateur → plateforme.
    Traitée par le Gestionnaire ou le Directeur.
    """

    class Statut(models.TextChoices):
        EN_ATTENTE = 'en_attente', 'En attente'
        EN_COURS = 'en_cours', 'En cours de traitement'
        TRAITEE = 'traitee', 'Traitée'
        FERMEE = 'fermee', 'Fermée'

    class Categorie(models.TextChoices):
        COMPTE = 'compte', 'Mon compte'
        PAIEMENT = 'paiement', 'Paiement / Abonnement'
        TECHNIQUE = 'technique', 'Problème technique'
        SIGNALEMENT = 'signalement', 'Signalement'
        AUTRE = 'autre', 'Autre'

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='preoccupations',
        verbose_name='Utilisateur',
    )
    categorie = models.CharField(
        'Catégorie', max_length=30, choices=Categorie.choices, default=Categorie.AUTRE,
    )
    sujet = models.CharField('Sujet', max_length=200)
    message = models.TextField('Message')
    statut = models.CharField(
        'Statut', max_length=20, choices=Statut.choices,
        default=Statut.EN_ATTENTE, db_index=True,
    )
    reponse = models.TextField('Réponse', blank=True, default='')
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='preoccupations_traitees',
        verbose_name='Traité par',
    )
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)
    date_traitement = models.DateTimeField('Date de traitement', null=True, blank=True)

    class Meta:
        verbose_name = 'Préoccupation'
        verbose_name_plural = 'Préoccupations'
        ordering = ['-date_creation']

    def __str__(self):
        return f"[{self.statut}] {self.sujet} - {self.utilisateur}"


class ActionMensuelleNotable(models.Model):
    """Actions notables effectuées dans le mois par un administrateur."""

    fiche = models.ForeignKey(
        FicheTravailMensuel,
        on_delete=models.CASCADE,
        related_name='actions_notables',
        verbose_name='Fiche mensuelle',
    )
    description = models.CharField('Description', max_length=300)
    date_action = models.DateField('Date de l\'action')
    impact = models.CharField('Impact', max_length=100, blank=True, default='')

    class Meta:
        verbose_name = 'Action mensuelle notable'
        verbose_name_plural = 'Actions mensuelles notables'
        ordering = ['-date_action']

    def __str__(self):
        return f"{self.description} - {self.date_action}"
