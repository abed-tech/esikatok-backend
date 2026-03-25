"""
Modèles de boost de vidéos pour EsikaTok.
Gère les boosts inclus dans l'abonnement et les boosts achetés.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class SourceBoost(models.TextChoices):
    """Source d'un boost."""
    ABONNEMENT = 'abonnement', 'Inclus dans l\'abonnement'
    ACHAT = 'achat', 'Achat unitaire'


class StatutBoost(models.TextChoices):
    """Statuts possibles d'un boost."""
    ACTIF = 'actif', 'Actif'
    EXPIRE = 'expire', 'Expiré'
    SUSPENDU = 'suspendu', 'Suspendu'
    ANNULE = 'annule', 'Annulé'


class BoostVideo(models.Model):
    """Boost appliqué à une vidéo pour augmenter sa visibilité."""

    PRIX_BOOST_UNITAIRE_USD = 1.00
    DUREE_BOOST_JOURS = 7

    video = models.ForeignKey(
        'videos.Video',
        on_delete=models.CASCADE,
        related_name='boosts',
        verbose_name='Vidéo',
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='boosts',
        verbose_name='Agent',
    )
    source = models.CharField(
        'Source du boost', max_length=20, choices=SourceBoost.choices,
    )
    statut = models.CharField(
        'Statut', max_length=20, choices=StatutBoost.choices,
        default=StatutBoost.ACTIF, db_index=True,
    )
    transaction = models.ForeignKey(
        'paiements.TransactionPaiement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='boosts',
        verbose_name='Transaction associée',
    )
    date_debut = models.DateTimeField('Date de début', default=timezone.now)
    date_fin = models.DateTimeField('Date de fin')
    score_boost = models.PositiveIntegerField(
        'Score de boost', default=100,
        help_text='Score de priorité pour le classement (0-1000)',
    )

    # --- Métriques ---
    impressions = models.PositiveIntegerField('Impressions', default=0)
    clics = models.PositiveIntegerField('Clics', default=0)

    date_creation = models.DateTimeField('Date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'Boost vidéo'
        verbose_name_plural = 'Boosts vidéo'
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['statut', '-date_debut']),
        ]

    def __str__(self):
        return f"Boost {self.source} - {self.video} ({self.statut})"

    def save(self, *args, **kwargs):
        if not self.date_fin:
            self.date_fin = self.date_debut + timedelta(days=self.DUREE_BOOST_JOURS)
        super().save(*args, **kwargs)

    @property
    def est_actif(self):
        maintenant = timezone.now()
        return (
            self.statut == StatutBoost.ACTIF
            and self.date_debut <= maintenant <= self.date_fin
        )
