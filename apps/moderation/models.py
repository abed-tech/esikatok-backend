"""
Modèles de modération de contenu pour EsikaTok.
Gère la file de modération, les décisions et le suivi.
"""
from django.db import models
from django.conf import settings


class StatutModeration(models.TextChoices):
    """Statuts de modération."""
    EN_ATTENTE = 'en_attente', 'En attente de revue'
    EN_COURS = 'en_cours', 'En cours de revue'
    APPROUVEE = 'approuvee', 'Approuvée'
    REFUSEE = 'refusee', 'Refusée'
    CORRECTION = 'correction', 'Correction demandée'
    SUSPENDUE = 'suspendue', 'Suspendue'


class SoumissionModeration(models.Model):
    """Soumission d'un bien/vidéo pour modération."""

    bien = models.ForeignKey(
        'biens.BienImmobilier',
        on_delete=models.CASCADE,
        related_name='soumissions_moderation',
        verbose_name='Bien',
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='soumissions_moderation',
        verbose_name='Agent soumetteur',
    )
    statut = models.CharField(
        'Statut', max_length=20, choices=StatutModeration.choices,
        default=StatutModeration.EN_ATTENTE, db_index=True,
    )
    commentaire_agent = models.TextField('Commentaire de l\'agent', blank=True, default='')
    date_soumission = models.DateTimeField('Date de soumission', auto_now_add=True)
    date_traitement = models.DateTimeField('Date de traitement', null=True, blank=True)

    class Meta:
        verbose_name = 'Soumission de modération'
        verbose_name_plural = 'Soumissions de modération'
        ordering = ['-date_soumission']

    def __str__(self):
        return f"Modération #{self.id} - {self.bien.titre} ({self.statut})"


class DecisionModeration(models.Model):
    """Décision prise par un modérateur sur une soumission."""

    soumission = models.ForeignKey(
        SoumissionModeration,
        on_delete=models.CASCADE,
        related_name='decisions',
        verbose_name='Soumission',
    )
    moderateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='decisions_moderation',
        verbose_name='Modérateur',
    )
    decision = models.CharField(
        'Décision', max_length=20, choices=StatutModeration.choices,
    )
    motif = models.TextField('Motif', blank=True, default='')
    notes_internes = models.TextField('Notes internes', blank=True, default='')
    date_decision = models.DateTimeField('Date de décision', auto_now_add=True)

    class Meta:
        verbose_name = 'Décision de modération'
        verbose_name_plural = 'Décisions de modération'
        ordering = ['-date_decision']

    def __str__(self):
        return f"Décision {self.decision} par {self.moderateur} - Soumission #{self.soumission_id}"
