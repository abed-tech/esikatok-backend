"""
Modèles de paiements pour EsikaTok.
Architecture modulaire prête pour intégration de prestataires externes.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class MoyenPaiement(models.TextChoices):
    """Moyens de paiement supportés."""
    MPESA = 'mpesa', 'M-Pesa'
    AIRTEL_MONEY = 'airtel_money', 'Airtel Money'
    ORANGE_MONEY = 'orange_money', 'Orange Money'
    AFRI_MONEY = 'afri_money', 'Afri Money'
    VISA = 'visa', 'Visa'
    MASTERCARD = 'mastercard', 'Mastercard'


class StatutTransaction(models.TextChoices):
    """Statuts possibles d'une transaction."""
    EN_ATTENTE = 'en_attente', 'En attente'
    EN_COURS = 'en_cours', 'En cours de traitement'
    REUSSIE = 'reussie', 'Réussie'
    ECHOUEE = 'echouee', 'Échouée'
    ANNULEE = 'annulee', 'Annulée'
    REMBOURSEE = 'remboursee', 'Remboursée'


class TypeTransaction(models.TextChoices):
    """Types de transactions."""
    ABONNEMENT = 'abonnement', 'Paiement d\'abonnement'
    BOOST = 'boost', 'Achat de boost'
    RENOUVELLEMENT = 'renouvellement', 'Renouvellement d\'abonnement'


class TransactionPaiement(models.Model):
    """Transaction de paiement principale."""

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name='Utilisateur',
    )
    reference = models.CharField('Référence', max_length=100, unique=True, db_index=True)
    type_transaction = models.CharField(
        'Type de transaction', max_length=30, choices=TypeTransaction.choices,
    )
    montant = models.DecimalField('Montant (USD)', max_digits=10, decimal_places=2)
    devise = models.CharField('Devise', max_length=5, default='USD')
    moyen_paiement = models.CharField(
        'Moyen de paiement', max_length=20, choices=MoyenPaiement.choices,
    )
    statut = models.CharField(
        'Statut', max_length=20, choices=StatutTransaction.choices,
        default=StatutTransaction.EN_ATTENTE, db_index=True,
    )

    # --- Détails prestataire ---
    reference_prestataire = models.CharField(
        'Référence prestataire', max_length=200, blank=True, default='',
    )
    reponse_prestataire = models.JSONField('Réponse prestataire', default=dict, blank=True)
    numero_telephone_paiement = models.CharField(
        'Numéro téléphone paiement', max_length=20, blank=True, default='',
    )

    # --- Objet lié ---
    abonnement = models.ForeignKey(
        'abonnements.Abonnement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name='Abonnement lié',
    )

    # --- Tentatives ---
    nombre_tentatives = models.PositiveSmallIntegerField('Nombre de tentatives', default=1)
    derniere_tentative = models.DateTimeField('Dernière tentative', null=True, blank=True)

    # --- Preuve ---
    preuve_paiement = models.FileField(
        'Preuve de paiement', upload_to='paiements/preuves/', blank=True, null=True,
    )

    # --- Journalisation ---
    description = models.CharField('Description', max_length=300, blank=True, default='')
    adresse_ip = models.GenericIPAddressField('Adresse IP', null=True, blank=True)

    # --- Dates ---
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)
    date_validation = models.DateTimeField('Date de validation', null=True, blank=True)
    date_modification = models.DateTimeField('Date de modification', auto_now=True)

    class Meta:
        verbose_name = 'Transaction de paiement'
        verbose_name_plural = 'Transactions de paiement'
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['statut', '-date_creation']),
            models.Index(fields=['utilisateur', '-date_creation']),
        ]

    def __str__(self):
        return f"{self.reference} - {self.montant} {self.devise} ({self.statut})"

    def marquer_reussie(self):
        """Marque la transaction comme réussie."""
        self.statut = StatutTransaction.REUSSIE
        self.date_validation = timezone.now()
        self.save(update_fields=['statut', 'date_validation', 'date_modification'])

    def marquer_echouee(self):
        """Marque la transaction comme échouée."""
        self.statut = StatutTransaction.ECHOUEE
        self.save(update_fields=['statut', 'date_modification'])


class JournalPaiement(models.Model):
    """Journal détaillé des événements liés à un paiement."""

    transaction = models.ForeignKey(
        TransactionPaiement,
        on_delete=models.CASCADE,
        related_name='journaux',
        verbose_name='Transaction',
    )
    evenement = models.CharField('Événement', max_length=100)
    detail = models.TextField('Détail', blank=True, default='')
    donnees = models.JSONField('Données', default=dict, blank=True)
    date_evenement = models.DateTimeField('Date', auto_now_add=True)

    class Meta:
        verbose_name = 'Journal de paiement'
        verbose_name_plural = 'Journaux de paiement'
        ordering = ['-date_evenement']

    def __str__(self):
        return f"{self.transaction.reference} - {self.evenement}"
