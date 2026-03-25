/**
 * Module API centralisé pour EsikaTok - Frontend Utilisateur.
 * Gère tous les appels REST vers le backend.
 * L'URL de base est configurable via :
 *   1. window.__ESIKATOK_CONFIG__.API_BASE_URL (injection côté serveur)
 *   2. <meta name="api-base-url"> dans le HTML
 *   3. Fallback : '/api/v1' (même domaine)
 */
const ApiEsikaTok = (() => {
    const _cfg = window.__ESIKATOK_CONFIG__ || {};
    const _meta = document.querySelector('meta[name="api-base-url"]');
    const BASE_URL = (_cfg.API_BASE_URL || (_meta && _meta.content) || '').replace(/\/$/, '') + '/api/v1';

    /* --- Gestion des tokens JWT --- */
    function obtenirToken() {
        return localStorage.getItem('esikatok_access_token');
    }

    function definirTokens(access, refresh) {
        localStorage.setItem('esikatok_access_token', access);
        localStorage.setItem('esikatok_refresh_token', refresh);
    }

    function supprimerTokens() {
        localStorage.removeItem('esikatok_access_token');
        localStorage.removeItem('esikatok_refresh_token');
        localStorage.removeItem('esikatok_utilisateur');
    }

    async function rafraichirToken() {
        const refresh = localStorage.getItem('esikatok_refresh_token');
        if (!refresh) return false;
        try {
            const reponse = await fetch(`${BASE_URL}/auth/token/rafraichir/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
            if (reponse.ok) {
                const donnees = await reponse.json();
                localStorage.setItem('esikatok_access_token', donnees.access);
                if (donnees.refresh) localStorage.setItem('esikatok_refresh_token', donnees.refresh);
                return true;
            }
        } catch (e) { /* silencieux */ }
        supprimerTokens();
        EtatApp.deconnecter();
        return false;
    }

    /* --- Requête HTTP générique avec gestion JWT --- */
    async function requete(url, options = {}) {
        const headers = options.headers || {};
        const token = obtenirToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }

        let reponse = await fetch(`${BASE_URL}${url}`, { ...options, headers });

        // Si 401, tenter de rafraîchir le token
        if (reponse.status === 401) {
            const rafraichi = await rafraichirToken();
            if (rafraichi) {
                headers['Authorization'] = `Bearer ${obtenirToken()}`;
                reponse = await fetch(`${BASE_URL}${url}`, { ...options, headers });
            }
        }

        return reponse;
    }

    async function get(url) {
        const r = await requete(url);
        if (!r.ok) throw await r.json().catch(() => ({ erreur: 'Erreur réseau' }));
        return r.json();
    }

    async function post(url, donnees) {
        const estFormData = donnees instanceof FormData;
        const r = await requete(url, {
            method: 'POST',
            body: estFormData ? donnees : JSON.stringify(donnees),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw json;
        return json;
    }

    async function patch(url, donnees) {
        const estFormData = donnees instanceof FormData;
        const r = await requete(url, {
            method: 'PATCH',
            body: estFormData ? donnees : JSON.stringify(donnees),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw json;
        return json;
    }

    async function supprimer(url) {
        const r = await requete(url, { method: 'DELETE' });
        if (!r.ok && r.status !== 204) throw await r.json().catch(() => ({}));
        return r.status === 204 ? {} : r.json().catch(() => ({}));
    }

    /* --- API Authentification --- */
    const auth = {
        async inscription(donnees) {
            const r = await post('/auth/inscription/', donnees);
            definirTokens(r.tokens.access, r.tokens.refresh);
            localStorage.setItem('esikatok_utilisateur', JSON.stringify(r.utilisateur));
            return r;
        },
        async inscriptionAgent(donnees) {
            const r = await post('/auth/inscription-agent/', donnees);
            definirTokens(r.tokens.access, r.tokens.refresh);
            localStorage.setItem('esikatok_utilisateur', JSON.stringify(r.utilisateur));
            return r;
        },
        async connexion(email, mot_de_passe) {
            const r = await post('/auth/connexion/', { email, mot_de_passe });
            definirTokens(r.tokens.access, r.tokens.refresh);
            localStorage.setItem('esikatok_utilisateur', JSON.stringify(r.utilisateur));
            return r;
        },
        async deconnexion() {
            const refresh = localStorage.getItem('esikatok_refresh_token');
            try { await post('/auth/deconnexion/', { refresh }); } catch(e) {}
            supprimerTokens();
        },
    };

    /* --- API Biens --- */
    const biens = {
        fil: (page = 1) => get(`/biens/fil/?page=${page}`),
        detail: (id) => get(`/biens/${id}/`),
        creer: (formData) => post('/biens/creer/', formData),
        modifier: (id, formData) => patch(`/biens/${id}/modifier/`, formData),
        soumettre: (id, commentaire = '') => post(`/biens/${id}/soumettre/`, { commentaire }),
        mesBiens: () => get('/biens/mes-biens/'),
    };

    /* --- API Recherche --- */
    const recherche = {
        chercher: (params, page = 1) => {
            const p = { ...params };
            if (page > 1) p.page = page;
            const query = new URLSearchParams(p).toString();
            return get(`/recherche/?${query}`);
        },
        boostes: () => get('/recherche/boostes/'),
    };

    /* --- API Messagerie --- */
    const messagerie = {
        conversations: () => get('/messagerie/conversations/'),
        creerConversation: (bien_id, message_initial) => post('/messagerie/conversations/creer/', { bien_id, message_initial }),
        messages: (convId) => get(`/messagerie/conversations/${convId}/messages/`),
        envoyer: (convId, contenu) => post(`/messagerie/conversations/${convId}/envoyer/`, { contenu }),
        nonLus: () => get('/messagerie/non-lus/'),
    };

    /* --- API Favoris --- */
    const favoris = {
        liste: () => get('/favoris/'),
        ajouter: (bien_id) => post('/favoris/ajouter/', { bien: bien_id }),
        supprimer: (bien_id) => supprimer(`/favoris/supprimer/${bien_id}/`),
    };

    /* --- API Localisations --- */
    const localisations = {
        villes: () => get('/localisations/villes/'),
        communes: (villeId) => get(`/localisations/villes/${villeId}/communes/`),
        quartiers: (communeId) => get(`/localisations/communes/${communeId}/quartiers/`),
    };

    /* --- API Abonnements --- */
    const abonnements = {
        plans: () => get('/abonnements/plans/'),
        monAbonnement: () => get('/abonnements/mon-abonnement/'),
        souscrire: (donnees) => post('/abonnements/souscrire/', donnees),
        historique: () => get('/abonnements/historique/'),
    };

    /* --- API Boosts --- */
    const boosts = {
        mesBoosts: () => get('/boosts/mes-boosts/'),
        boosterAbonnement: (video_id) => post('/boosts/abonnement/', { video_id }),
        acheter: (donnees) => post('/boosts/acheter/', donnees),
    };

    /* --- API Vidéos --- */
    const videos = {
        mesVideos: () => get('/videos/mes-videos/'),
        enregistrerLecture: (id, duree) => post(`/videos/${id}/lecture/`, { duree_visionnage: duree }),
    };

    /* --- API Badges --- */
    const badges = {
        compteurs: () => get('/comptes/badges/'),
    };

    /* --- API Profil --- */
    const profil = {
        obtenir: () => get('/comptes/profil/'),
        modifier: (donnees) => patch('/comptes/profil/', donnees),
        modifierAgent: (donnees) => patch('/comptes/profil-agent/', donnees),
        agentPublic: (id) => get(`/comptes/agent/${id}/`),
        uploaderPhoto: (formData) => post('/comptes/photo-profil/', formData),
        supprimerPhoto: () => supprimer('/comptes/photo-profil/'),
    };

    /* --- API Annonces (lecture seule, aucune réponse) --- */
    const annonces = {
        liste: () => get('/comptes/annonces/'),
    };

    /* --- API Aide / Préoccupations --- */
    const aide = {
        mesPreoccupations: () => get('/comptes/aide/preoccupations/'),
        envoyerQuestion: (donnees) => post('/comptes/aide/preoccupations/', donnees),
    };

    /* --- API Statistiques agent --- */
    const statistiques = {
        agent: () => get('/statistiques/agent/'),
    };

    /* --- API Paiements --- */
    const paiements = {
        transactions: () => get('/paiements/transactions/'),
    };

    /**
     * Échappe le HTML pour éviter les injections XSS
     * lors de l'insertion de contenu utilisateur dans le DOM.
     */
    function echapperHtml(texte) {
        if (!texte) return '';
        const div = document.createElement('div');
        div.textContent = texte;
        return div.innerHTML;
    }

    return {
        obtenirToken, definirTokens, supprimerTokens, echapperHtml,
        auth, biens, recherche, messagerie, favoris,
        localisations, abonnements, boosts, videos, badges,
        profil, statistiques, paiements, annonces, aide,
    };
})();
