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

# 4. Charger les données initiales (Kinshasa + 24 communes)
#    get_or_create → safe à relancer plusieurs fois, pas de doublons
python manage.py charger_localisations

# 5. Créer les comptes de démonstration (agents, admins, utilisateurs)
#    get_or_create → safe à relancer plusieurs fois
python manage.py creer_donnees_demo
