"""
Modèles de localisation géographique pour EsikaTok.
Hiérarchie : Ville → Commune → Quartier
Données de base : Kinshasa et ses 24 communes.
"""
from django.db import models


class Ville(models.Model):
    """Ville (ex: Kinshasa)."""
    nom = models.CharField('Nom de la ville', max_length=100, unique=True)
    code = models.CharField('Code ville', max_length=10, unique=True)
    pays = models.CharField('Pays', max_length=100, default='République Démocratique du Congo')
    latitude = models.DecimalField('Latitude', max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField('Longitude', max_digits=10, decimal_places=7, null=True, blank=True)
    est_active = models.BooleanField('Active', default=True)

    class Meta:
        verbose_name = 'Ville'
        verbose_name_plural = 'Villes'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Commune(models.Model):
    """Commune rattachée à une ville."""
    ville = models.ForeignKey(
        Ville, on_delete=models.CASCADE, related_name='communes', verbose_name='Ville'
    )
    nom = models.CharField('Nom de la commune', max_length=100)
    code = models.CharField('Code commune', max_length=20, unique=True)
    latitude = models.DecimalField('Latitude', max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField('Longitude', max_digits=10, decimal_places=7, null=True, blank=True)
    est_active = models.BooleanField('Active', default=True)

    class Meta:
        verbose_name = 'Commune'
        verbose_name_plural = 'Communes'
        ordering = ['nom']
        unique_together = [('ville', 'nom')]

    def __str__(self):
        return f"{self.nom} ({self.ville.nom})"


class Quartier(models.Model):
    """Quartier rattaché à une commune."""
    commune = models.ForeignKey(
        Commune, on_delete=models.CASCADE, related_name='quartiers', verbose_name='Commune'
    )
    nom = models.CharField('Nom du quartier', max_length=100)
    code = models.CharField('Code quartier', max_length=30, blank=True, default='')
    latitude = models.DecimalField('Latitude', max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField('Longitude', max_digits=10, decimal_places=7, null=True, blank=True)
    est_actif = models.BooleanField('Actif', default=True)

    class Meta:
        verbose_name = 'Quartier'
        verbose_name_plural = 'Quartiers'
        ordering = ['nom']
        unique_together = [('commune', 'nom')]

    def __str__(self):
        return f"{self.nom} ({self.commune.nom})"
