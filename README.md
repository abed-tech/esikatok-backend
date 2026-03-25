# EsikaTok — Plateforme Immobilière en Vidéo

Plateforme de vidéos courtes immobilières inspirée de TikTok, dédiée au marché immobilier de Kinshasa (RDC).

---

## Table des matières

1. [Architecture](#architecture)
2. [Structure du projet](#structure-du-projet)
3. [Installation locale](#installation-locale)
4. [Configuration par environnement](#configuration-par-environnement)
5. [Variables d'environnement](#variables-denvironnement)
6. [Déploiement en production](#déploiement-en-production)
7. [Sécurité](#sécurité)
8. [API Endpoints](#api-endpoints-v1)
9. [Comptes de démonstration](#comptes-de-démonstration)
10. [Plans d'abonnement](#plans-dabonnement)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Clients                            │
│  ┌────────────────┐        ┌──────────────────────┐  │
│  │ SPA Utilisateur│        │  SPA Administration  │  │
│  │ (JS + Tailwind)│        │  (JS + Tailwind)     │  │
│  └───────┬────────┘        └──────────┬───────────┘  │
└──────────┼────────────────────────────┼──────────────┘
           │          HTTPS / JWT       │
           ▼                            ▼
┌──────────────────────────────────────────────────────┐
│                Backend API (Django)                    │
│  Django 5 + DRF + SimpleJWT + WhiteNoise              │
│  Gunicorn (WSGI) en production                        │
├──────────────────────────────────────────────────────┤
│  PostgreSQL          │  S3 / CDN (vidéos & médias)    │
└──────────────────────┴───────────────────────────────┘
```

- **Backend** : Django 5 + Django REST Framework + SimpleJWT
- **Frontend Utilisateur** : SPA JavaScript vanilla + Tailwind CSS
- **Frontend Admin** : SPA JavaScript vanilla + Tailwind CSS
- **Base de données** : SQLite (local) / PostgreSQL (production)
- **Stockage vidéo** : Local (dev) / S3-compatible (production)
- **Serveur WSGI** : Gunicorn + WhiteNoise
- **Les 3 services (backend, frontend user, frontend admin) peuvent être déployés séparément**

---

## Structure du projet

```
backend/
├── apps/                         # Applications Django métier
│   ├── comptes/                  # Utilisateurs, agents, admins, permissions
│   ├── localisations/            # Villes, communes, quartiers
│   ├── biens/                    # Biens immobiliers + images
│   ├── videos/                   # Vidéos + stockage abstrait (local/S3)
│   ├── recherche/                # Moteur de recherche pondéré
│   ├── messagerie/               # Conversations liées aux biens
│   ├── abonnements/              # Plans, cycles, essai gratuit
│   ├── paiements/                # Transactions de paiement
│   ├── boosts/                   # Boost de visibilité vidéo
│   ├── moderation/               # Modération de contenu
│   ├── favoris/                  # Favoris utilisateur
│   ├── statistiques/             # Tableau de bord et métriques
│   └── administration/           # Gestion interne admin + permissions RBAC
├── esikatok/                     # Configuration Django
│   ├── settings/
│   │   ├── base.py               # Config commune (secrets via env vars)
│   │   ├── local.py              # Développement (SQLite, debug, CORS ouvert)
│   │   └── production.py         # Production (PostgreSQL, HTTPS, HSTS, logs)
│   ├── urls.py                   # Routes (API v1 + SPAs + health check)
│   ├── wsgi.py                   # Point d'entrée WSGI
│   ├── exceptions.py             # Gestionnaire d'erreurs API
│   ├── throttles.py              # Rate limiting authentification
│   └── sanitization.py           # Nettoyage entrées (anti-XSS)
├── static/
│   ├── utilisateur/js/           # SPA utilisateur (api.js, app.js, pages…)
│   └── administration/js/        # SPA administration (admin-api.js, admin-app.js…)
├── templates/
│   ├── utilisateur/index.html    # Point d'entrée SPA utilisateur
│   └── administration/index.html # Point d'entrée SPA admin
├── .env.example                  # Template des variables d'environnement
├── .gitignore                    # Fichiers exclus du versioning
├── requirements.txt              # Dépendances Python (versions pincées)
├── Procfile                      # Commande de démarrage production
├── gunicorn.conf.py              # Configuration Gunicorn
├── runtime.txt                   # Version Python
└── manage.py                     # CLI Django
```

---

## Installation locale

### Prérequis

- Python 3.11+
- pip

### Étapes

```bash
# 1. Créer et activer l'environnement virtuel
cd EsikaTok/backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire (les défauts conviennent pour le dev)

# 4. Appliquer les migrations
python manage.py migrate

# 5. Charger les localisations (Kinshasa + 24 communes)
python manage.py charger_localisations

# 6. Créer les données de démonstration
python manage.py creer_donnees_demo

# 7. Lancer le serveur
python manage.py runserver
```

### URLs locales

| URL | Description |
|-----|-------------|
| `http://localhost:8000/` | SPA Utilisateur |
| `http://localhost:8000/gestion/EsikaTok` | SPA Administration |
| `http://localhost:8000/api/v1/…` | API REST |
| `http://localhost:8000/api/health/` | Health check |

---

## Configuration par environnement

Le projet utilise un système de settings Django en 3 couches :

| Fichier | Usage | Activé par |
|---------|-------|-----------|
| `base.py` | Config commune, secrets via `python-decouple` | Toujours hérité |
| `local.py` | Dev : SQLite, debug, CORS ouvert, throttle relâché | `DJANGO_SETTINGS_MODULE=esikatok.settings.local` (défaut) |
| `production.py` | Prod : PostgreSQL, HTTPS, HSTS, logs fichiers | `DJANGO_SETTINGS_MODULE=esikatok.settings.production` |

Pour activer la configuration production sur l'hébergeur :

```bash
export DJANGO_SETTINGS_MODULE=esikatok.settings.production
```

---

## Variables d'environnement

Copier `.env.example` vers `.env` et remplir les valeurs.
**Ne jamais commiter `.env` dans le dépôt Git.**

### Obligatoires en production

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Clé secrète Django (unique, longue, aléatoire) | Générer avec `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `ALLOWED_HOSTS` | Domaines autorisés (CSV) | `esikatok.com,www.esikatok.com` |
| `DB_NAME` | Nom de la base PostgreSQL | `esikatok_db` |
| `DB_USER` | Utilisateur PostgreSQL | `esikatok_user` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `********` |
| `DB_HOST` | Hôte PostgreSQL | `localhost` ou URL du service |
| `CORS_ALLOWED_ORIGINS` | Origines CORS autorisées (CSV) | `https://esikatok.com,https://admin.esikatok.com` |

### Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DB_PORT` | Port PostgreSQL | `5432` |
| `STORAGE_BACKEND` | `local` ou `s3` | `local` |
| `VIDEO_S3_BUCKET` | Bucket S3 pour les vidéos | — |
| `VIDEO_S3_ACCESS_KEY` | Clé d'accès S3 | — |
| `VIDEO_S3_SECRET_KEY` | Clé secrète S3 | — |
| `VIDEO_S3_ENDPOINT` | Endpoint S3 (Minio, DigitalOcean, etc.) | — |
| `VIDEO_CDN_URL` | URL publique du CDN vidéo | — |
| `MEDIA_PUBLIC_URL` | URL publique des médias | `/media/` |
| `API_BASE_URL` | URL racine de l'API (vue par les frontends) | `http://localhost:8000` |
| `FRONTEND_URL` | URL du frontend utilisateur | `http://localhost:8000` |
| `ADMIN_FRONTEND_URL` | URL du frontend admin | `http://localhost:8000/gestion/EsikaTok` |
| `ADMIN_PATH` | Chemin URL de l'espace admin | `gestion/EsikaTok` |
| `JWT_ACCESS_LIFETIME_MINUTES` | Durée du token d'accès | `30` |
| `JWT_REFRESH_LIFETIME_DAYS` | Durée du token de rafraîchissement | `7` |
| `EMAIL_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `EMAIL_HOST_USER` | Adresse e-mail SMTP | — |
| `EMAIL_HOST_PASSWORD` | Mot de passe SMTP | — |
| `SECURE_SSL_REDIRECT` | Redirection HTTPS | `True` |

---

## Déploiement en production

### Schéma global de l'architecture déployée

```
┌─────────────────────────┐    HTTPS / JWT     ┌──────────────────────────┐
│   Frontend Utilisateur  │ ◄────────────────► │   Backend API (Django)   │
│   Netlify / Render      │    API REST v1     │   Render Web Service     │
│   esikatok.netlify.app  │                    │   esikatok-api.onrender  │
└─────────────────────────┘                    └────────┬─────┬───────────┘
                                                        │     │
┌─────────────────────────┐    HTTPS / JWT     ┌────────▼──┐  │
│   Frontend Admin        │ ◄────────────────► │ PostgreSQL│  │
│   Netlify / Render      │    API REST v1     │  (Render) │  │
│   esikatok-admin.net... │                    └───────────┘  │
└─────────────────────────┘                                   │
                                                    ┌─────────▼──────────┐
                                                    │  Stockage Vidéo    │
                                                    │  S3 (Wasabi /      │
                                                    │  Backblaze / AWS)  │
                                                    └────────────────────┘
```

**Ce qui relie tout :**

- **CORS** : le backend autorise les requêtes des frontends via `CORS_ALLOWED_ORIGINS`
- **JWT** : le frontend stocke le token et l'envoie dans le header `Authorization: Bearer <token>`
- **Vidéos** : le backend retourne des URLs S3/CDN publiques que le frontend affiche dans les balises `<video>`
- **CSRF** : configuré via `CSRF_TRUSTED_ORIGINS` pour accepter les domaines des frontends

---

### Checklist avant déploiement

1. **Générer une `DJANGO_SECRET_KEY` unique** (ne jamais réutiliser la clé de dev)
2. **Configurer toutes les variables d'environnement** (voir section ci-dessus)
3. **Configurer PostgreSQL** et créer la base/utilisateur avec droits minimaux
4. **Configurer le stockage S3** si vous hébergez les médias sur un CDN
5. **Changer le chemin admin** (`ADMIN_PATH`) pour un chemin non devinable
6. **Pousser le code sur GitHub** (voir étape 1 ci-dessous)

---

### A. Déployer le Backend sur Render (étape par étape)

#### Étape A.1 — Pousser le code sur GitHub

```bash
# Initialiser le dépôt Git si pas encore fait
cd EsikaTok/backend
git init
git add .
git commit -m "Initial commit - Backend EsikaTok"

# Créer un dépôt sur GitHub, puis :
git remote add origin https://github.com/VOTRE-COMPTE/esikatok-backend.git
git branch -M main
git push -u origin main
```

> **Important** : vérifiez que `.env` est bien dans `.gitignore` et n'est jamais commité.

#### Étape A.2 — Créer une base PostgreSQL sur Render

1. Se connecter sur [render.com](https://render.com) → cliquer **New** → **PostgreSQL**
2. Remplir :
   - **Name** : `esikatok-db`
   - **Database** : `esikatok_db`
   - **User** : `esikatok_user`
   - **Region** : `Frankfurt (EU Central)` (ou le plus proche de vos utilisateurs)
   - **Plan** : **Free** (pour tester, 90 jours) ou **Starter** ($7/mois pour la production)
3. Cliquer **Create Database**
4. Une fois créée, aller dans l'onglet **Info** et noter les valeurs suivantes :
   - **Hostname** : ex. `dpg-xxxxx-a.frankfurt-postgres.render.com`
   - **Port** : `5432`
   - **Database** : `esikatok_db`
   - **Username** : `esikatok_user`
   - **Password** : *(affiché une seule fois, le copier !)*

#### Étape A.3 — Créer un Web Service sur Render

1. Cliquer **New** → **Web Service** → **Build and deploy from a Git repository**
2. Connecter votre compte GitHub et sélectionner le dépôt `esikatok-backend`
3. Remplir les paramètres :
   - **Name** : `esikatok-api`
   - **Region** : même région que la base PostgreSQL
   - **Root Directory** : laisser vide si le dépôt contient uniquement le backend, sinon mettre `EsikaTok/backend`
   - **Runtime** : `Python 3`
   - **Build Command** :
     ```bash
     pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput
     ```
   - **Start Command** :
     ```bash
     gunicorn esikatok.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120 --max-requests 1000 --max-requests-jitter 50
     ```
     > Note : cette commande est déjà dans le `Procfile`, Render la détecte automatiquement.
   - **Plan** : **Free** (pour tester) ou **Starter** ($7/mois)
4. **Ne pas cliquer « Create » tout de suite** — configurer d'abord les variables d'environnement (étape suivante).

#### Étape A.4 — Configurer les variables d'environnement sur Render

Dans l'onglet **Environment** du Web Service, ajouter chaque variable :

| Variable | Valeur | Commentaire |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `esikatok.settings.production` | **Obligatoire** — active la config production |
| `DJANGO_SECRET_KEY` | *(générer une clé)* | Exécuter : `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DJANGO_ENV` | `production` | |
| `ALLOWED_HOSTS` | `esikatok-api.onrender.com` | Domaine Render de votre service |
| `DB_NAME` | `esikatok_db` | Depuis l'info PostgreSQL Render |
| `DB_USER` | `esikatok_user` | Depuis l'info PostgreSQL Render |
| `DB_PASSWORD` | *(mot de passe copié)* | Depuis l'info PostgreSQL Render |
| `DB_HOST` | `dpg-xxxxx-a.frankfurt-postgres.render.com` | **Internal Hostname** de la base |
| `DB_PORT` | `5432` | |
| `CORS_ALLOWED_ORIGINS` | `https://esikatok.netlify.app,https://esikatok-admin.netlify.app` | URLs de vos frontends déployés |
| `CSRF_TRUSTED_ORIGINS` | `https://esikatok.netlify.app,https://esikatok-admin.netlify.app,https://esikatok-api.onrender.com` | |
| `API_BASE_URL` | `https://esikatok-api.onrender.com` | |
| `FRONTEND_URL` | `https://esikatok.netlify.app` | |
| `ADMIN_FRONTEND_URL` | `https://esikatok-admin.netlify.app` | |
| `STORAGE_BACKEND` | `s3` | Voir section C (hébergement vidéo) |
| `VIDEO_S3_BUCKET` | *(nom du bucket)* | Voir section C |
| `VIDEO_S3_REGION` | *(région)* | Voir section C |
| `VIDEO_S3_ACCESS_KEY` | *(clé d'accès)* | Voir section C |
| `VIDEO_S3_SECRET_KEY` | *(clé secrète)* | Voir section C |
| `VIDEO_S3_ENDPOINT` | *(endpoint S3)* | Voir section C |
| `VIDEO_CDN_URL` | *(URL publique du bucket)* | Voir section C |
| `SECURE_SSL_REDIRECT` | `true` | |
| `ADMIN_PATH` | *(chemin secret)* | Ex. `gestion/EsikaTok` ou un chemin personnalisé |

5. Cliquer **Create Web Service**. Render va :
   - Cloner le repo
   - Installer les dépendances (`pip install`)
   - Collecter les fichiers statiques (`collectstatic`)
   - Appliquer les migrations (`migrate`)
   - Lancer Gunicorn

#### Étape A.5 — Vérifier le déploiement

Une fois le déploiement terminé (quelques minutes), tester :

```
https://esikatok-api.onrender.com/api/health/
```

Réponse attendue : `{"status": "ok"}`

> **Note Render Free** : le service s'endort après 15 min d'inactivité. Le premier accès après inactivité prend ~30s. Pour la production, utilisez le plan Starter ($7/mois) qui reste toujours actif.

---

### B. Déployer le Frontend sur Netlify (étape par étape)

Le frontend utilisateur est actuellement intégré dans le backend (`templates/utilisateur/index.html` + `static/utilisateur/`). Pour le déployer séparément sur Netlify, il faut l'extraire.

#### Étape B.1 — Créer un dépôt frontend

Créer un nouveau dossier et dépôt Git pour le frontend :

```
esikatok-frontend/
├── index.html                  ← copie de templates/utilisateur/index.html
├── js/                         ← copie de static/utilisateur/js/
│   ├── api.js
│   ├── app.js
│   └── pages/
├── _redirects                  ← fichier Netlify (routing SPA)
└── netlify.toml                ← configuration Netlify
```

```bash
# Créer le dossier
mkdir esikatok-frontend
cd esikatok-frontend

# Copier les fichiers depuis le backend
cp ../backend/templates/utilisateur/index.html .
cp -r ../backend/static/utilisateur/js ./js

# Initialiser le dépôt
git init
git add .
git commit -m "Initial commit - Frontend Utilisateur"
git remote add origin https://github.com/VOTRE-COMPTE/esikatok-frontend.git
git push -u origin main
```

#### Étape B.2 — Configurer l'URL de l'API

Dans le fichier `index.html` du frontend, mettre à jour la balise meta pour pointer vers le backend Render :

```html
<meta name="api-base-url" content="https://esikatok-api.onrender.com">
```

Puis dans le code JavaScript, s'assurer que tous les appels API utilisent cette URL :

```javascript
// Récupérer l'URL de l'API depuis la balise meta
const API_BASE_URL = document.querySelector('meta[name="api-base-url"]')?.content
                     || 'https://esikatok-api.onrender.com';

// Exemple d'appel API
const response = await fetch(`${API_BASE_URL}/api/v1/videos/`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Étape B.3 — Créer le fichier `_redirects`

Ce fichier est nécessaire pour que Netlify redirige toutes les routes vers `index.html` (comportement SPA) :

```
/*    /index.html   200
```

#### Étape B.4 — Créer le fichier `netlify.toml`

```toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Étape B.5 — Déployer sur Netlify

1. Se connecter sur [netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connecter GitHub et sélectionner le dépôt `esikatok-frontend`
3. Paramètres de build :
   - **Branch to deploy** : `main`
   - **Build command** : *(laisser vide — c'est du HTML/JS pur, pas de build)*
   - **Publish directory** : `.`
4. Cliquer **Deploy site**
5. Une fois déployé, Netlify attribue une URL comme `https://random-name.netlify.app`
6. **Renommer le site** : aller dans **Site settings** → **Change site name** → `esikatok`
   - L'URL devient : `https://esikatok.netlify.app`

#### Étape B.6 — Déployer le frontend Admin (même procédure)

Répéter les étapes B.1 à B.5 pour le frontend administration :

```
esikatok-admin/
├── index.html                  ← copie de templates/administration/index.html
├── js/                         ← copie de static/administration/js/
├── _redirects
└── netlify.toml
```

URL finale : `https://esikatok-admin.netlify.app`

#### Alternative : Déployer le frontend sur Render (Static Site)

Si vous préférez tout garder sur Render :

1. **New** → **Static Site** → connecter le repo frontend
2. **Publish Directory** : `.`
3. **Build Command** : *(laisser vide)*
4. Ajouter une règle de rewrite dans les settings : `/*` → `/index.html` (status 200)

---

### C. Héberger les vidéos sur un stockage S3 (étape par étape)

Le backend supporte déjà le stockage S3 via le module `apps/videos/stockage.py`. En production, les vidéos **ne doivent pas** être stockées sur le serveur Render (espace disque limité et éphémère). Il faut utiliser un service de stockage externe compatible S3.

#### Choix du fournisseur

| Fournisseur | Stockage | Bande passante sortante | Prix approx. | Recommandé pour |
|---|---|---|---|---|
| **Wasabi** | $6.99/To/mois | **Gratuit** (inclus) | **Le moins cher** | Budget serré, gros volumes |
| **Backblaze B2** | $6/To/mois | Gratuit via Cloudflare | Très bon rapport qualité/prix | Avec CDN Cloudflare |
| **DigitalOcean Spaces** | $5/250Go | $5/1To sortant | Simple à configurer | Simplicité |
| **AWS S3** | ~$23/To/mois | ~$90/To sortant | Le plus cher | Écosystème AWS existant |

> **Recommandation** : **Wasabi** est le meilleur rapport qualité/prix pour les vidéos (bande passante gratuite). **Backblaze B2 + Cloudflare** est une excellente alternative gratuite pour la bande passante.

#### Option 1 : Wasabi (recommandé)

**1. Créer un compte**
- Aller sur [wasabi.com](https://wasabi.com) → **Start Free Trial** (1 To gratuit pendant 30 jours)
- Confirmer l'e-mail et se connecter à la console

**2. Créer un bucket**
- Console Wasabi → **Buckets** → **Create Bucket**
- **Bucket Name** : `esikatok-videos`
- **Region** : `eu-central-1` (Francfort) ou `eu-central-2` (Amsterdam)
- **Properties** : laisser par défaut
- Cliquer **Create Bucket**

**3. Configurer l'accès public en lecture (pour les vidéos)**
- Sélectionner le bucket → **Properties** → **Bucket Policy**
- Ajouter cette politique pour permettre la lecture publique :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::esikatok-videos/*"
    }
  ]
}
```

**4. Créer des Access Keys**
- Console Wasabi → **Access Keys** → **Create Access Key**
- Copier l'**Access Key** et le **Secret Key** (affichés une seule fois !)

**5. Configurer les variables d'environnement sur Render**

| Variable | Valeur |
|---|---|
| `STORAGE_BACKEND` | `s3` |
| `VIDEO_S3_BUCKET` | `esikatok-videos` |
| `VIDEO_S3_REGION` | `eu-central-1` |
| `VIDEO_S3_ACCESS_KEY` | *(votre Access Key)* |
| `VIDEO_S3_SECRET_KEY` | *(votre Secret Key)* |
| `VIDEO_S3_ENDPOINT` | `https://s3.eu-central-1.wasabisys.com` |
| `VIDEO_CDN_URL` | `https://s3.eu-central-1.wasabisys.com/esikatok-videos` |

#### Option 2 : Backblaze B2 + Cloudflare CDN

**1. Créer un compte Backblaze**
- [backblaze.com](https://www.backblaze.com/b2/cloud-storage.html) → **Sign Up** (10 Go gratuits)

**2. Créer un bucket**
- **Buckets** → **Create a Bucket**
- **Name** : `esikatok-videos`
- **Files in Bucket are** : **Public**
- Copier le **Endpoint** : ex. `s3.us-west-004.backblazeb2.com`

**3. Créer des Application Keys**
- **App Keys** → **Add a New Application Key**
- Copier le **keyID** (= Access Key) et **applicationKey** (= Secret Key)

**4. Ajouter Cloudflare CDN (bande passante gratuite)**
- Créer un compte [Cloudflare](https://cloudflare.com) (plan gratuit)
- Ajouter un domaine ou sous-domaine (ex. `cdn.esikatok.com`)
- Créer un **CNAME** pointant vers `f004.backblazeb2.com` (selon votre endpoint)
- Activer le **proxy Cloudflare** (nuage orange) → le trafic passe par Cloudflare gratuitement

**5. Variables d'environnement**

| Variable | Valeur |
|---|---|
| `STORAGE_BACKEND` | `s3` |
| `VIDEO_S3_BUCKET` | `esikatok-videos` |
| `VIDEO_S3_REGION` | `us-west-004` |
| `VIDEO_S3_ACCESS_KEY` | *(votre keyID)* |
| `VIDEO_S3_SECRET_KEY` | *(votre applicationKey)* |
| `VIDEO_S3_ENDPOINT` | `https://s3.us-west-004.backblazeb2.com` |
| `VIDEO_CDN_URL` | `https://cdn.esikatok.com/file/esikatok-videos` |

#### Comment ça fonctionne dans le code

Le fichier `esikatok/settings/base.py` détecte automatiquement le backend de stockage :

```python
# Si STORAGE_BACKEND=s3, utilise StockageExterneS3
# Si STORAGE_BACKEND=local, utilise StockageLocal (dev uniquement)
_storage_backend = config('STORAGE_BACKEND', default='local')
if _storage_backend == 's3':
    STOCKAGE_VIDEO = {
        'BACKEND': 'apps.videos.stockage.StockageExterneS3',
        'OPTIONS': { ... }  # Rempli depuis les variables d'environnement
    }
```

Quand un agent upload une vidéo :
1. Le fichier est envoyé au backend via l'API `POST /api/v1/biens/creer/`
2. Le backend l'envoie vers S3 via `StockageExterneS3.sauvegarder()`
3. L'URL publique S3/CDN est stockée en base de données
4. Le frontend récupère l'URL et l'affiche dans une balise `<video src="https://...">`

---

### D. Garder tout connecté — Récapitulatif

#### 1. Mettre à jour CORS côté backend

Les variables `CORS_ALLOWED_ORIGINS` et `CSRF_TRUSTED_ORIGINS` doivent contenir les domaines exacts de vos frontends :

```
CORS_ALLOWED_ORIGINS=https://esikatok.netlify.app,https://esikatok-admin.netlify.app
CSRF_TRUSTED_ORIGINS=https://esikatok.netlify.app,https://esikatok-admin.netlify.app,https://esikatok-api.onrender.com
```

#### 2. Mettre à jour l'URL API côté frontend

Dans chaque `index.html` frontend :

```html
<meta name="api-base-url" content="https://esikatok-api.onrender.com">
```

#### 3. Les vidéos sont servies directement depuis S3/CDN

Le frontend ne passe **pas** par le backend pour lire les vidéos. Il utilise directement l'URL S3/CDN retournée par l'API. Cela réduit la charge sur le backend et accélère le chargement.

#### 4. Flux complet d'un utilisateur

```
1. L'utilisateur ouvre https://esikatok.netlify.app
2. Le frontend charge index.html depuis Netlify (rapide, CDN mondial)
3. Le JS appelle https://esikatok-api.onrender.com/api/v1/biens/fil/
4. Le backend répond avec la liste des biens + URLs vidéo S3
5. Le frontend affiche les vidéos directement depuis S3/CDN
6. L'utilisateur se connecte → le JWT est stocké en mémoire
7. Les appels authentifiés envoient le JWT dans le header Authorization
```

---

### E. Checklist finale de déploiement

- [ ] **Code poussé sur GitHub** (backend + frontend en repos séparés)
- [ ] **Base PostgreSQL créée sur Render** et infos notées
- [ ] **Web Service backend créé sur Render** avec toutes les variables d'environnement
- [ ] **Health check OK** : `https://esikatok-api.onrender.com/api/health/` → `{"status": "ok"}`
- [ ] **Bucket S3 créé** (Wasabi ou Backblaze) avec accès public en lecture
- [ ] **Variables S3 configurées** sur Render (`STORAGE_BACKEND=s3`, etc.)
- [ ] **Frontend utilisateur déployé sur Netlify** avec `api-base-url` pointant vers Render
- [ ] **Frontend admin déployé sur Netlify** avec `api-base-url` pointant vers Render
- [ ] **CORS et CSRF configurés** côté backend avec les domaines Netlify
- [ ] **Test complet** : inscription → connexion → upload vidéo → lecture vidéo → messagerie

---

### F. Déploiement alternatif sur VPS (Ubuntu + Nginx)

Si vous préférez un VPS au lieu de Render :

```bash
# 1. Cloner le dépôt et installer les dépendances
git clone <repo> /var/www/esikatok
cd /var/www/esikatok/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Configurer .env
cp .env.example .env
nano .env  # Remplir les valeurs production

# 3. Migrations et collectstatic
export DJANGO_SETTINGS_MODULE=esikatok.settings.production
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# 4. Lancer Gunicorn (avec systemd ou supervisord)
gunicorn -c gunicorn.conf.py esikatok.wsgi:application
```

**Configuration Nginx recommandée :**

```nginx
server {
    listen 443 ssl http2;
    server_name esikatok.com;

    ssl_certificate     /etc/ssl/certs/esikatok.pem;
    ssl_certificate_key /etc/ssl/private/esikatok.key;

    # Fichiers statiques (servis par Nginx)
    location /static/ {
        alias /var/www/esikatok/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Médias (si stockage local)
    location /media/ {
        alias /var/www/esikatok/backend/media/;
        expires 30d;
    }

    # API et SPA → Gunicorn
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 120M;
    }
}
```

### Sauvegarde base de données

```bash
# Dump PostgreSQL
pg_dump -U esikatok_user esikatok_db > backup_$(date +%Y%m%d).sql

# Restauration
psql -U esikatok_user esikatok_db < backup_20250101.sql
```

---

## Sécurité

### Authentification & Autorisation

- **JWT** avec rotation des tokens (access: 30 min, refresh: 7 jours)
- **Blacklist** automatique des refresh tokens après rotation
- **Rate limiting** sur les endpoints d'authentification (10 req/min par IP)
- **Permissions RBAC** : utilisateur simple, agent, modérateur, gestionnaire, directeur
- **Logging sécurité** : tous les échecs de connexion sont journalisés (IP, email/matricule)
- **Mots de passe** : minimum 8 caractères, validation complexité Django

### Protection des entrées

- **Sanitisation HTML** (bleach) sur tous les champs texte libres soumis par les utilisateurs
- **Validation MIME + taille** sur les uploads vidéo (MP4/WebM/MOV, 100 Mo max) et images (JPEG/PNG/WEBP, 10 Mo max)
- **E-mails jetables** bloqués à l'inscription (16 domaines blacklistés)
- **Throttling global** : 60 req/min anonyme, 120 req/min authentifié

### Sécurité HTTP (production)

- **HTTPS forcé** (`SECURE_SSL_REDIRECT`)
- **HSTS** (1 an, sous-domaines inclus, preload)
- **X-Frame-Options: DENY** (anti-clickjacking)
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy: strict-origin-when-cross-origin**
- **Cookies sécurisés** (Secure, HttpOnly, SameSite=Lax)
- **Proxy SSL header** (`X-Forwarded-Proto`) pris en charge
- **CORS strict** avec origines explicites en production

### Sécurité frontend

- **XSS** : fonction `echapperHtml()` pour échapper le contenu utilisateur rendu dans le DOM
- **API URL configurable** : `<meta name="api-base-url">` ou `window.__ESIKATOK_CONFIG__`
- **Admin protégé** : `<meta name="robots" content="noindex, nofollow">`, chemin configurable

### Gestion des erreurs

- **Exception handler personnalisé** : jamais de stacktrace ou détail interne exposé au client
- **Erreurs 500** : message générique côté client, détails complets dans les logs serveur
- **Erreurs 429** : rate limit loggé avec IP

### Logging

- **Console** (tous environnements) : erreurs Django, activité app, alertes sécurité
- **Fichiers rotatifs** (production) :
  - `logs/esikatok.log` — activité applicative (10 Mo, 5 rotations)
  - `logs/securite.log` — événements sécurité (10 Mo, 10 rotations)

---

## API Endpoints (v1)

### Health check
- `GET /api/health/` — Vérification de l'état du serveur (monitoring, load balancer)

### Authentification
- `POST /api/v1/auth/inscription/` — Inscription utilisateur
- `POST /api/v1/auth/inscription-agent/` — Inscription agent
- `POST /api/v1/auth/connexion/` — Connexion (email + mot de passe)
- `POST /api/v1/auth/connexion-admin/` — Connexion admin (matricule + mot de passe)
- `POST /api/v1/auth/deconnexion/` — Déconnexion (blacklist du refresh token)
- `POST /api/v1/auth/token/rafraichir/` — Rafraîchir le token JWT

### Biens immobiliers
- `GET /api/v1/biens/fil/` — Fil principal de vidéos (public)
- `GET /api/v1/biens/<id>/` — Détail d'un bien (public)
- `POST /api/v1/biens/creer/` — Créer un bien (agent, avec quota)
- `PATCH /api/v1/biens/<id>/modifier/` — Modifier un brouillon (agent)
- `POST /api/v1/biens/<id>/soumettre/` — Soumettre pour modération (agent)
- `GET /api/v1/biens/mes-biens/` — Mes biens (agent)

### Recherche
- `GET /api/v1/recherche/?ville=&commune=&type_bien=&prix_max=` — Recherche pondérée

### Messagerie
- `GET /api/v1/messagerie/conversations/` — Mes conversations
- `POST /api/v1/messagerie/conversations/creer/` — Nouvelle conversation
- `GET /api/v1/messagerie/conversations/<id>/messages/` — Messages d'une conversation
- `POST /api/v1/messagerie/conversations/<id>/envoyer/` — Envoyer un message

### Abonnements & Paiements
- `GET /api/v1/abonnements/plans/` — Plans disponibles
- `GET /api/v1/abonnements/mon-abonnement/` — Mon abonnement actuel
- `POST /api/v1/abonnements/souscrire/` — Souscrire à un plan
- `GET /api/v1/paiements/transactions/` — Historique des transactions

### Boosts & Favoris
- `POST /api/v1/boosts/abonnement/` — Utiliser un boost inclus
- `POST /api/v1/boosts/acheter/` — Acheter un boost unitaire
- `GET /api/v1/favoris/` — Mes favoris
- `POST /api/v1/favoris/ajouter/` — Ajouter en favori

### Administration (accès authentifié + rôle requis)
- `GET /api/v1/administration/tableau-de-bord/` — Tableau de bord dynamique par rôle
- `GET /api/v1/administration/permissions/` — Mes permissions
- `GET /api/v1/administration/badges/` — Compteurs badges sidebar
- `GET /api/v1/administration/utilisateurs/` — Liste des utilisateurs
- `GET /api/v1/administration/agents/` — Liste des agents
- `GET /api/v1/administration/admins/` — Liste des administrateurs
- `GET /api/v1/moderation/soumissions/` — Soumissions en attente
- `POST /api/v1/moderation/soumissions/<id>/traiter/` — Approuver/refuser

---

## Comptes de démonstration

### Administrateurs (connexion par matricule)

| Rôle | Matricule | Mot de passe |
|------|-----------|-------------|
| Directeur (Super Admin) | `DG19032004CEO` | `Ma_societe_CE0` |
| Gestionnaire | `GES-001` | `EsikaTok2024!` |
| Modérateur | `MOD-001` | `EsikaTok2024!` |

### Utilisateurs (connexion par email)

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Agent 1 | `agent1@esikatok.com` | `EsikaTok2024!` |
| Agent 2 | `agent2@esikatok.com` | `EsikaTok2024!` |
| Utilisateur | `utilisateur@esikatok.com` | `EsikaTok2024!` |

---

## Plans d'abonnement

| Plan | Prix | Publications/mois | Boosts/mois |
|------|------|-------------------|-------------|
| Standard | 10 USD | 10 | 2 |
| Pro | 15 USD | 30 | 5 |
| Premium | 20 USD | Illimité | Illimité |

- Essai gratuit Premium de 30 jours pour tout nouvel agent.
- Prix d'un boost unitaire hors abonnement : 1 USD (durée : 7 jours).

---

## Licence

Propriétaire — Tous droits réservés.
