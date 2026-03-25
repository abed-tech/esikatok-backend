"""
Modèles de biens immobiliers pour EsikaTok.
Gère les annonces, images et métadonnées des biens.
"""
from django.db import models
from django.conf import settings


class TypeBien(models.TextChoices):
    """Types de biens immobiliers disponibles."""
    APPARTEMENT = 'appartement', 'Appartement'
    MAISON = 'maison', 'Maison'
    TERRAIN = 'terrain', 'Terrain'
    BUREAU = 'bureau', 'Bureau / Commerce'
    STUDIO = 'studio', 'Studio'
    DUPLEX = 'duplex', 'Duplex'
    VILLA = 'villa', 'Villa'
    IMMEUBLE = 'immeuble', 'Immeuble'
    ENTREPOT = 'entrepot', 'Entrepôt'
    AUTRE = 'autre', 'Autre'


class TypeOffre(models.TextChoices):
    """Types d'offres possibles."""
    VENTE = 'vente', 'Vente'
    LOCATION = 'location', 'Location'
    COLOCATION = 'colocation', 'Colocation'
    LOCATION_MEUBLEE = 'location_meublee', 'Location meublée'
    VENTE_TERRAIN = 'vente_terrain', 'Vente de terrain'


class StatutBien(models.TextChoices):
    """Statuts possibles d'un bien."""
    BROUILLON = 'brouillon', 'Brouillon'
    EN_ATTENTE = 'en_attente', 'En attente de validation'
    APPROUVE = 'approuve', 'Approuvé'
    REFUSE = 'refuse', 'Refusé'
    PUBLIE = 'publie', 'Publié'
    SUSPENDU = 'suspendu', 'Suspendu'
    ARCHIVE = 'archive', 'Archivé'


class BienImmobilier(models.Model):
    """Modèle principal d'un bien immobilier."""

    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='biens',
        verbose_name='Agent',
        limit_choices_to={'type_compte': 'agent'},
    )

    # --- Informations générales ---
    titre = models.CharField('Titre', max_length=200)
    description = models.TextField('Description')
    type_bien = models.CharField('Type de bien', max_length=30, choices=TypeBien.choices)
    type_offre = models.CharField('Type d\'offre', max_length=30, choices=TypeOffre.choices)
    prix = models.DecimalField('Prix (USD)', max_digits=12, decimal_places=2)
    devise = models.CharField('Devise', max_length=5, default='USD')

    # --- Caractéristiques ---
    nombre_chambres = models.PositiveSmallIntegerField('Nombre de chambres', default=0)
    nombre_salles_bain = models.PositiveSmallIntegerField('Nombre de salles de bain', default=0)
    surface_m2 = models.DecimalField('Surface (m²)', max_digits=10, decimal_places=2, null=True, blank=True)

    # --- Localisation ---
    ville = models.ForeignKey(
        'localisations.Ville', on_delete=models.PROTECT, verbose_name='Ville',
        related_name='biens',
    )
    commune = models.ForeignKey(
        'localisations.Commune', on_delete=models.PROTECT, verbose_name='Commune',
        related_name='biens',
    )
    quartier = models.ForeignKey(
        'localisations.Quartier', on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name='Quartier', related_name='biens',
    )
    quartier_texte = models.CharField('Quartier (texte libre)', max_length=150, blank=True, default='')
    avenue = models.CharField('Avenue / Rue', max_length=200, blank=True, default='')
    numero_adresse = models.CharField('Numéro', max_length=20, blank=True, default='')
    latitude = models.DecimalField('Latitude', max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField('Longitude', max_digits=10, decimal_places=7, null=True, blank=True)

    # --- Statut ---
    statut = models.CharField(
        'Statut', max_length=20, choices=StatutBien.choices,
        default=StatutBien.BROUILLON, db_index=True,
    )
    est_booste = models.BooleanField('Est boosté', default=False, db_index=True)

    # --- Dates ---
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)
    date_modification = models.DateTimeField('Date de modification', auto_now=True)
    date_publication = models.DateTimeField('Date de publication', null=True, blank=True)

    # --- Compteurs ---
    nombre_vues = models.PositiveIntegerField('Nombre de vues', default=0)
    nombre_favoris = models.PositiveIntegerField('Nombre de favoris', default=0)
    nombre_partages = models.PositiveIntegerField('Nombre de partages', default=0)
    nombre_contacts = models.PositiveIntegerField('Nombre de contacts', default=0)

    class Meta:
        verbose_name = 'Bien immobilier'
        verbose_name_plural = 'Biens immobiliers'
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['statut', 'est_booste', '-date_creation']),
            models.Index(fields=['type_bien', 'type_offre']),
            models.Index(fields=['ville', 'commune']),
            models.Index(fields=['prix']),
        ]

    def __str__(self):
        return f"{self.titre} - {self.type_offre} ({self.commune})"


class ImageBien(models.Model):
    """Images complémentaires d'un bien immobilier."""

    bien = models.ForeignKey(
        BienImmobilier, on_delete=models.CASCADE,
        related_name='images', verbose_name='Bien',
    )
    image = models.ImageField('Image', upload_to='biens/images/')
    legende = models.CharField('Légende', max_length=200, blank=True, default='')
    ordre = models.PositiveSmallIntegerField('Ordre d\'affichage', default=0)
    date_ajout = models.DateTimeField('Date d\'ajout', auto_now_add=True)

    class Meta:
        verbose_name = 'Image de bien'
        verbose_name_plural = 'Images de biens'
        ordering = ['ordre']

    def __str__(self):
        return f"Image {self.ordre} - {self.bien.titre}"
