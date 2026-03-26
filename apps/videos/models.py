"""
Modèles de gestion des vidéos pour EsikaTok.
Gère le stockage, les métadonnées et le cycle de vie des vidéos.
"""
from django.db import models
from django.conf import settings


class VideoVisibleManager(models.Manager):
    """Manager par défaut : exclut les vidéos supprimées (soft-delete)."""
    def get_queryset(self):
        return super().get_queryset().filter(est_supprime=False)


class Video(models.Model):
    """Vidéo associée à un bien immobilier."""

    bien = models.OneToOneField(
        'biens.BienImmobilier',
        on_delete=models.CASCADE,
        related_name='video',
        verbose_name='Bien immobilier',
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='videos',
        verbose_name='Agent',
    )

    # --- Fichier vidéo ---
    fichier_video = models.FileField('Fichier vidéo', upload_to='videos/', blank=True, null=True)
    url_externe = models.URLField('URL vidéo externe', blank=True, default='')
    cle_stockage = models.CharField('Clé de stockage externe', max_length=500, blank=True, default='')
    miniature = models.ImageField('Miniature', upload_to='videos/miniatures/', blank=True, null=True)

    # --- Métadonnées ---
    duree_secondes = models.PositiveIntegerField('Durée (secondes)', default=0)
    taille_octets = models.PositiveBigIntegerField('Taille (octets)', default=0)
    format_video = models.CharField('Format', max_length=20, blank=True, default='mp4')
    resolution = models.CharField('Résolution', max_length=20, blank=True, default='')
    est_verticale = models.BooleanField('Vidéo verticale', default=True)

    # --- Compteurs ---
    nombre_lectures = models.PositiveIntegerField('Nombre de lectures', default=0)
    nombre_lectures_completes = models.PositiveIntegerField('Lectures complètes', default=0)
    duree_visionnage_totale = models.PositiveBigIntegerField('Durée visionnage totale (sec)', default=0)

    # --- Soft-delete ---
    est_supprime = models.BooleanField('Supprimé', default=False, db_index=True)
    date_suppression = models.DateTimeField('Date de suppression', null=True, blank=True)
    supprime_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='videos_supprimees',
        verbose_name='Supprimé par',
    )
    motif_suppression = models.TextField('Motif de suppression', blank=True, default='')

    # --- Dates ---
    date_upload = models.DateTimeField('Date d\'upload', auto_now_add=True)
    date_modification = models.DateTimeField('Date de modification', auto_now=True)

    # --- Managers ---
    objects = VideoVisibleManager()
    all_objects = models.Manager()

    class Meta:
        verbose_name = 'Vidéo'
        verbose_name_plural = 'Vidéos'
        ordering = ['-date_upload']

    def __str__(self):
        return f"Vidéo: {self.bien.titre}"

    @property
    def url_lecture(self):
        """Retourne l'URL de lecture de la vidéo (presigned S3 ou locale)."""
        # Priorité 1 : générer une URL pré-signée S3 via la clé de stockage
        if self.cle_stockage:
            try:
                from apps.videos.stockage import obtenir_backend_stockage
                backend = obtenir_backend_stockage()
                return backend.obtenir_url(self.cle_stockage)
            except Exception:
                pass
        # Priorité 2 : URL externe statique (fallback)
        if self.url_externe:
            return self.url_externe
        # Priorité 3 : fichier local (dev uniquement)
        if self.fichier_video:
            return self.fichier_video.url
        return ''

    def supprimer_logiquement(self, admin, motif=''):
        """Effectue un soft-delete de la vidéo."""
        from django.utils import timezone
        self.est_supprime = True
        self.date_suppression = timezone.now()
        self.supprime_par = admin
        self.motif_suppression = motif
        self.save(update_fields=[
            'est_supprime', 'date_suppression', 'supprime_par', 'motif_suppression',
        ])
