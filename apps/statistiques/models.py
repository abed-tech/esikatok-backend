"""
Modèles de statistiques pour EsikaTok.
Suivi des vues, engagements et métriques de performance.
"""
from django.db import models
from django.conf import settings


class VueBien(models.Model):
    """Enregistrement d'une vue sur un bien."""

    bien = models.ForeignKey(
        'biens.BienImmobilier',
        on_delete=models.CASCADE,
        related_name='vues',
        verbose_name='Bien',
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vues_biens',
        verbose_name='Utilisateur',
    )
    adresse_ip = models.GenericIPAddressField('Adresse IP', null=True, blank=True)
    duree_visionnage_sec = models.PositiveIntegerField('Durée de visionnage (sec)', default=0)
    est_lecture_complete = models.BooleanField('Lecture complète', default=False)
    source = models.CharField('Source', max_length=50, blank=True, default='fil')
    date_vue = models.DateTimeField('Date de vue', auto_now_add=True)

    class Meta:
        verbose_name = 'Vue de bien'
        verbose_name_plural = 'Vues de biens'
        ordering = ['-date_vue']

    def __str__(self):
        return f"Vue sur {self.bien.titre} - {self.date_vue}"


class StatistiqueJournaliere(models.Model):
    """Statistiques agrégées par jour pour le tableau de bord admin."""

    date = models.DateField('Date', unique=True, db_index=True)
    nombre_inscriptions = models.PositiveIntegerField('Inscriptions', default=0)
    nombre_nouveaux_agents = models.PositiveIntegerField('Nouveaux agents', default=0)
    nombre_biens_publies = models.PositiveIntegerField('Biens publiés', default=0)
    nombre_vues_total = models.PositiveIntegerField('Vues total', default=0)
    nombre_messages = models.PositiveIntegerField('Messages', default=0)
    nombre_favoris = models.PositiveIntegerField('Favoris', default=0)
    revenus_abonnements_usd = models.DecimalField(
        'Revenus abonnements (USD)', max_digits=10, decimal_places=2, default=0,
    )
    revenus_boosts_usd = models.DecimalField(
        'Revenus boosts (USD)', max_digits=10, decimal_places=2, default=0,
    )
    nombre_boosts_actifs = models.PositiveIntegerField('Boosts actifs', default=0)

    class Meta:
        verbose_name = 'Statistique journalière'
        verbose_name_plural = 'Statistiques journalières'
        ordering = ['-date']

    def __str__(self):
        return f"Stats {self.date}"
