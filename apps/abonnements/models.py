"""
Modèles d'abonnements pour les agents immobiliers EsikaTok.
Gère les plans, cycles, quotas et consommation.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class PlanAbonnement(models.Model):
    """Plans d'abonnement disponibles pour les agents."""

    class NomPlan(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        PRO = 'pro', 'Pro'
        PREMIUM = 'premium', 'Premium'

    nom = models.CharField('Nom du plan', max_length=20, choices=NomPlan.choices, unique=True)
    prix_mensuel_usd = models.DecimalField('Prix mensuel (USD)', max_digits=8, decimal_places=2)
    nombre_publications_max = models.PositiveIntegerField(
        'Publications max / mois', default=10, help_text='0 = illimité'
    )
    nombre_boosts_inclus = models.PositiveIntegerField(
        'Boosts inclus / mois', default=5, help_text='0 = illimité'
    )
    messages_illimites = models.BooleanField('Messages illimités', default=True)
    est_actif = models.BooleanField('Plan actif', default=True)
    description = models.TextField('Description', blank=True, default='')
    ordre_affichage = models.PositiveSmallIntegerField('Ordre d\'affichage', default=0)

    class Meta:
        verbose_name = 'Plan d\'abonnement'
        verbose_name_plural = 'Plans d\'abonnement'
        ordering = ['ordre_affichage']

    def __str__(self):
        return f"{self.get_nom_display()} - {self.prix_mensuel_usd} USD/mois"

    @property
    def est_illimite(self):
        return self.nom == self.NomPlan.PREMIUM


class Abonnement(models.Model):
    """Abonnement actif d'un agent."""

    class StatutAbonnement(models.TextChoices):
        ESSAI = 'essai', 'Essai gratuit'
        ACTIF = 'actif', 'Actif'
        EXPIRE = 'expire', 'Expiré'
        SUSPENDU = 'suspendu', 'Suspendu'
        ANNULE = 'annule', 'Annulé'

    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='abonnements',
        verbose_name='Agent',
        limit_choices_to={'type_compte': 'agent'},
    )
    plan = models.ForeignKey(
        PlanAbonnement,
        on_delete=models.PROTECT,
        related_name='abonnements',
        verbose_name='Plan',
    )
    statut = models.CharField(
        'Statut', max_length=20, choices=StatutAbonnement.choices,
        default=StatutAbonnement.ESSAI, db_index=True,
    )
    date_debut = models.DateTimeField('Date de début', default=timezone.now)
    date_fin = models.DateTimeField('Date de fin')
    est_essai_gratuit = models.BooleanField('Essai gratuit', default=False)
    renouvellement_auto = models.BooleanField('Renouvellement automatique', default=False)
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)
    date_modification = models.DateTimeField('Date de modification', auto_now=True)

    class Meta:
        verbose_name = 'Abonnement'
        verbose_name_plural = 'Abonnements'
        ordering = ['-date_debut']

    def __str__(self):
        return f"{self.agent} - {self.plan.nom} ({self.statut})"

    @property
    def est_actif_ou_essai(self):
        maintenant = timezone.now()
        return (
            self.statut in [self.StatutAbonnement.ACTIF, self.StatutAbonnement.ESSAI]
            and self.date_debut <= maintenant <= self.date_fin
        )

    def save(self, *args, **kwargs):
        if not self.date_fin:
            self.date_fin = self.date_debut + timedelta(days=30)
        super().save(*args, **kwargs)


class CycleAbonnement(models.Model):
    """Cycle mensuel d'un abonnement, pour le suivi des quotas."""

    abonnement = models.ForeignKey(
        Abonnement,
        on_delete=models.CASCADE,
        related_name='cycles',
        verbose_name='Abonnement',
    )
    date_debut_cycle = models.DateTimeField('Début du cycle')
    date_fin_cycle = models.DateTimeField('Fin du cycle')
    publications_utilisees = models.PositiveIntegerField('Publications utilisées', default=0)
    boosts_utilises = models.PositiveIntegerField('Boosts utilisés', default=0)
    est_actif = models.BooleanField('Cycle actif', default=True)

    class Meta:
        verbose_name = 'Cycle d\'abonnement'
        verbose_name_plural = 'Cycles d\'abonnement'
        ordering = ['-date_debut_cycle']

    def __str__(self):
        return f"Cycle {self.date_debut_cycle.date()} - {self.abonnement}"

    @property
    def publications_restantes(self):
        max_pub = self.abonnement.plan.nombre_publications_max
        if max_pub == 0:
            return float('inf')
        return max(0, max_pub - self.publications_utilisees)

    @property
    def boosts_restants(self):
        max_boosts = self.abonnement.plan.nombre_boosts_inclus
        if max_boosts == 0:
            return float('inf')
        return max(0, max_boosts - self.boosts_utilises)

    def peut_publier(self):
        return self.publications_restantes > 0

    def peut_booster_inclus(self):
        return self.boosts_restants > 0
