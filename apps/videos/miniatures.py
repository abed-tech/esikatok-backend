"""
Génération automatique de miniatures à partir des vidéos uploadées.
Utilise ffmpeg (disponible sur Render) pour extraire une frame.
"""
import logging
import os
import subprocess
import tempfile
import uuid

logger = logging.getLogger(__name__)


def generer_miniature_depuis_video(fichier_video):
    """
    Extrait une frame de la vidéo pour créer une miniature JPEG.

    Args:
        fichier_video: Fichier uploadé Django (InMemoryUploadedFile ou TemporaryUploadedFile).

    Returns:
        tuple (chemin_miniature, nom_fichier) ou (None, None) si échec.
        L'appelant est responsable de supprimer le fichier temporaire.
    """
    tmp_video_path = None
    tmp_thumb_path = None

    try:
        # 1. Sauvegarder la vidéo dans un fichier temporaire
        suffix = os.path.splitext(fichier_video.name)[1] if fichier_video.name else '.mp4'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_video:
            if hasattr(fichier_video, 'seek'):
                fichier_video.seek(0)
            for chunk in fichier_video.chunks():
                tmp_video.write(chunk)
            tmp_video_path = tmp_video.name

        # 2. Générer le chemin de sortie
        nom_miniature = f"{uuid.uuid4().hex}.jpg"
        tmp_thumb_path = os.path.join(tempfile.gettempdir(), nom_miniature)

        # 3. Extraire une frame avec ffmpeg
        #    -ss 1 : sauter à 1 seconde (éviter les frames noires)
        #    -frames:v 1 : extraire 1 seule frame
        #    -vf scale=480:-2 : largeur 480px, hauteur auto (pair)
        #    -q:v 2 : bonne qualité JPEG
        result = subprocess.run(
            [
                'ffmpeg', '-y',
                '-ss', '1',
                '-i', tmp_video_path,
                '-frames:v', '1',
                '-vf', 'scale=480:-2',
                '-q:v', '2',
                tmp_thumb_path,
            ],
            capture_output=True,
            timeout=30,
        )

        # Si -ss 1 échoue (vidéo < 1s), réessayer à 0s
        if result.returncode != 0 or not os.path.exists(tmp_thumb_path):
            subprocess.run(
                [
                    'ffmpeg', '-y',
                    '-i', tmp_video_path,
                    '-frames:v', '1',
                    '-vf', 'scale=480:-2',
                    '-q:v', '2',
                    tmp_thumb_path,
                ],
                capture_output=True,
                timeout=30,
            )

        # 4. Vérifier que la miniature a été créée
        if os.path.exists(tmp_thumb_path) and os.path.getsize(tmp_thumb_path) > 0:
            logger.info(f"Miniature générée: {tmp_thumb_path} ({os.path.getsize(tmp_thumb_path)} octets)")
            # Rembobiner la vidéo pour un éventuel usage ultérieur
            if hasattr(fichier_video, 'seek'):
                fichier_video.seek(0)
            return tmp_thumb_path, nom_miniature
        else:
            logger.warning("ffmpeg n'a pas pu générer de miniature.")
            return None, None

    except FileNotFoundError:
        logger.warning("ffmpeg non trouvé sur ce système. Miniature non générée.")
        return None, None
    except subprocess.TimeoutExpired:
        logger.warning("Timeout ffmpeg lors de la génération de miniature.")
        return None, None
    except Exception as e:
        logger.error(f"Erreur génération miniature: {e}")
        return None, None
    finally:
        # Nettoyage du fichier vidéo temporaire (pas la miniature — l'appelant la supprime)
        if tmp_video_path and os.path.exists(tmp_video_path):
            try:
                os.unlink(tmp_video_path)
            except OSError:
                pass


def nettoyer_miniature_temp(chemin):
    """Supprime un fichier miniature temporaire."""
    if chemin and os.path.exists(chemin):
        try:
            os.unlink(chemin)
        except OSError:
            pass
