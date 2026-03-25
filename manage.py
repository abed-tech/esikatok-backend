#!/usr/bin/env python
"""Utilitaire en ligne de commande Django pour EsikaTok."""
import os
import sys


def main():
    """Point d'entrée principal."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esikatok.settings.local')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Impossible d'importer Django. Vérifiez qu'il est installé "
            "et disponible dans votre variable d'environnement PYTHONPATH. "
            "Avez-vous activé votre environnement virtuel ?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
