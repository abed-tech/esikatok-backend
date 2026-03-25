"""
Modèles de favoris pour EsikaTok.
Permet aux utilisateurs de sauvegarder des biens.
"""
from django.db import models
from django.conf import settings


class Favori(models.Model):
    """Bien ajouté en favori par un utilisateur."""

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favoris',
        verbose_name='Utilisateur',
    )
    bien = models.ForeignKey(
        'biens.BienImmobilier',
        on_delete=models.CASCADE,
        related_name='favoris',
        verbose_name='Bien',
    )
    date_ajout = models.DateTimeField('Date d\'ajout', auto_now_add=True)

    class Meta:
        verbose_name = 'Favori'
        verbose_name_plural = 'Favoris'
        unique_together = [('utilisateur', 'bien')]
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.utilisateur} ♥ {self.bien.titre}"
