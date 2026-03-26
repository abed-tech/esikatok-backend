#!/usr/bin/env bash
# Script de build pour Render — EsikaTok Backend
set -o errexit

# 1. Installer les dépendances Python
pip install --upgrade pip
pip install -r requirements.txt

# 2. Collecter les fichiers statiques (WhiteNoise)
python manage.py collectstatic --noinput

# 3. Appliquer les migrations de base de données
python manage.py migrate --noinput
