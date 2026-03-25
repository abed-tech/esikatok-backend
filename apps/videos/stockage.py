"""
Couche d'abstraction pour le stockage des vidéos.
En local : stockage sur le système de fichiers.
En production : stockage sur un service externe (S3, Wasabi, etc.).
"""
import os
import uuid
from abc import ABC, abstractmethod
from django.conf import settings


class StockageVideoBase(ABC):
    """Interface de base pour le stockage vidéo."""

    @abstractmethod
    def sauvegarder(self, fichier, nom_fichier=None):
        """Sauvegarde un fichier vidéo. Retourne la clé/chemin de stockage."""
        pass

    @abstractmethod
    def obtenir_url(self, cle_stockage):
        """Retourne l'URL de lecture pour une clé de stockage donnée."""
        pass

    @abstractmethod
    def supprimer(self, cle_stockage):
        """Supprime un fichier vidéo par sa clé de stockage."""
        pass

    def generer_nom_fichier(self, nom_original):
        """Génère un nom de fichier unique pour éviter les collisions."""
        extension = os.path.splitext(nom_original)[1] if nom_original else '.mp4'
        return f"{uuid.uuid4().hex}{extension}"


class StockageLocal(StockageVideoBase):
    """Stockage vidéo local sur le système de fichiers."""

    def __init__(self, **options):
        self.repertoire = options.get('repertoire', os.path.join(settings.MEDIA_ROOT, 'videos'))
        os.makedirs(self.repertoire, exist_ok=True)

    def sauvegarder(self, fichier, nom_fichier=None):
        nom = nom_fichier or self.generer_nom_fichier(fichier.name)
        chemin_complet = os.path.join(self.repertoire, nom)
        with open(chemin_complet, 'wb+') as destination:
            for morceau in fichier.chunks():
                destination.write(morceau)
        return nom

    def obtenir_url(self, cle_stockage):
        return f"{settings.MEDIA_URL}videos/{cle_stockage}"

    def supprimer(self, cle_stockage):
        chemin = os.path.join(self.repertoire, cle_stockage)
        if os.path.exists(chemin):
            os.remove(chemin)


class StockageExterneS3(StockageVideoBase):
    """
    Stockage vidéo sur un service compatible S3.
    Prévu pour AWS S3, Wasabi, DigitalOcean Spaces, etc.
    """

    def __init__(self, **options):
        self.bucket = options.get('bucket', '')
        self.region = options.get('region', '')
        self.access_key = options.get('access_key', '')
        self.secret_key = options.get('secret_key', '')
        self.endpoint_url = options.get('endpoint_url', '')
        self.cdn_url = options.get('cdn_url', '')
        self._client = None

    @property
    def client(self):
        """Initialise le client S3 à la première utilisation."""
        if self._client is None:
            import boto3
            params = {
                'aws_access_key_id': self.access_key,
                'aws_secret_access_key': self.secret_key,
                'region_name': self.region,
            }
            if self.endpoint_url:
                params['endpoint_url'] = self.endpoint_url
            self._client = boto3.client('s3', **params)
        return self._client

    def sauvegarder(self, fichier, nom_fichier=None):
        nom = nom_fichier or self.generer_nom_fichier(fichier.name)
        cle = f"videos/{nom}"
        self.client.upload_fileobj(
            fichier,
            self.bucket,
            cle,
            ExtraArgs={'ContentType': getattr(fichier, 'content_type', 'video/mp4')},
        )
        return cle

    def obtenir_url(self, cle_stockage):
        if self.cdn_url:
            return f"{self.cdn_url.rstrip('/')}/{cle_stockage}"
        return self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': cle_stockage},
            ExpiresIn=3600,
        )

    def supprimer(self, cle_stockage):
        self.client.delete_object(Bucket=self.bucket, Key=cle_stockage)


def obtenir_backend_stockage():
    """Retourne une instance du backend de stockage configuré."""
    config = getattr(settings, 'STOCKAGE_VIDEO', {})
    backend_path = config.get('BACKEND', 'apps.videos.stockage.StockageLocal')
    options = config.get('OPTIONS', {})

    # Résolution dynamique de la classe
    parties = backend_path.rsplit('.', 1)
    module_path, nom_classe = parties[0], parties[1]

    import importlib
    module = importlib.import_module(module_path)
    classe = getattr(module, nom_classe)
    return classe(**options)
