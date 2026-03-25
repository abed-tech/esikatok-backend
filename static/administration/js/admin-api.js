/**
 * Module API pour EsikaTok - Frontend Administration.
 * Gestion centralisée des requêtes, tokens JWT, pagination, recherche, filtres et tri.
 * L'URL de base est configurable via window.__ESIKATOK_CONFIG__.API_BASE_URL ou <meta name="api-base-url">.
 */
const AdminApi = (() => {
    const _cfg = window.__ESIKATOK_CONFIG__ || {};
    const _meta = document.querySelector('meta[name="api-base-url"]');
    const BASE_URL = (_cfg.API_BASE_URL || (_meta && _meta.content) || '').replace(/\/$/, '') + '/api/v1';
    let _enCoursDeRafraichissement = false;
    let _fileAttenteRafraichissement = [];
    let _enCoursDeDeconnexion = false;

    // --- Gestion des tokens JWT ---
    function obtenirToken() { return localStorage.getItem('esikatok_admin_token'); }

    function definirTokens(access, refresh) {
        localStorage.setItem('esikatok_admin_token', access);
        localStorage.setItem('esikatok_admin_refresh', refresh);
    }

    function supprimerTokens() {
        localStorage.removeItem('esikatok_admin_token');
        localStorage.removeItem('esikatok_admin_refresh');
        localStorage.removeItem('esikatok_admin_utilisateur');
    }

    function obtenirUtilisateur() {
        try { return JSON.parse(localStorage.getItem('esikatok_admin_utilisateur')); }
        catch (e) { return null; }
    }

    async function rafraichirToken() {
        if (_enCoursDeRafraichissement) {
            return new Promise((resolve) => { _fileAttenteRafraichissement.push(resolve); });
        }
        _enCoursDeRafraichissement = true;
        const refresh = localStorage.getItem('esikatok_admin_refresh');
        if (!refresh) { _enCoursDeRafraichissement = false; return false; }
        try {
            const r = await fetch(`${BASE_URL}/auth/token/rafraichir/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
            if (r.ok) {
                const d = await r.json();
                localStorage.setItem('esikatok_admin_token', d.access);
                if (d.refresh) localStorage.setItem('esikatok_admin_refresh', d.refresh);
                _enCoursDeRafraichissement = false;
                _fileAttenteRafraichissement.forEach(cb => cb(true));
                _fileAttenteRafraichissement = [];
                return true;
            }
        } catch (e) {}
        _enCoursDeRafraichissement = false;
        _fileAttenteRafraichissement.forEach(cb => cb(false));
        _fileAttenteRafraichissement = [];
        supprimerTokens();
        return false;
    }

    // --- Construction de query string ---
    function construireParams(params = {}) {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') qs.append(k, v);
        });
        const str = qs.toString();
        return str ? `?${str}` : '';
    }

    // --- Requêtes HTTP génériques ---
    async function requete(url, options = {}) {
        const ctrl = options._abortController;
        const headers = { ...(options.headers || {}) };
        const token = obtenirToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }
        const fetchOpts = { ...options, headers };
        if (ctrl) fetchOpts.signal = ctrl.signal;
        delete fetchOpts._abortController;

        let r;
        try {
            r = await fetch(`${BASE_URL}${url}`, fetchOpts);
        } catch (e) {
            if (e.name === 'AbortError') throw { annule: true, erreur: 'Requête annulée' };
            throw { erreur: 'Erreur réseau. Vérifiez votre connexion.' };
        }

        if (r.status === 401) {
            const ok = await rafraichirToken();
            if (ok) {
                headers['Authorization'] = `Bearer ${obtenirToken()}`;
                try {
                    r = await fetch(`${BASE_URL}${url}`, { ...fetchOpts, headers });
                } catch (e) {
                    if (e.name === 'AbortError') throw { annule: true, erreur: 'Requête annulée' };
                    throw { erreur: 'Erreur réseau. Vérifiez votre connexion.' };
                }
            } else {
                if (!_enCoursDeDeconnexion && typeof AdminApp !== 'undefined') {
                    _enCoursDeDeconnexion = true;
                    try { AdminApp.deconnexion?.(); } finally { _enCoursDeDeconnexion = false; }
                }
                throw { erreur: 'Session expirée. Veuillez vous reconnecter.', sessionExpiree: true };
            }
        }

        if (r.status === 403) throw { erreur: 'Accès non autorisé pour cette action.', interdit: true };
        if (r.status === 404) throw { erreur: 'Ressource introuvable.', introuvable: true };
        if (r.status >= 500) throw { erreur: 'Erreur serveur. Réessayez plus tard.', serveur: true };

        return r;
    }

    async function get(url, options = {}) {
        const r = await requete(url, options);
        if (!r.ok) {
            const json = await r.json().catch(() => ({}));
            throw { erreur: json.detail || json.erreur || `Erreur ${r.status}`, code: r.status, ...json };
        }
        return r.json();
    }

    async function post(url, donnees, options = {}) {
        const r = await requete(url, {
            ...options,
            method: 'POST',
            body: donnees instanceof FormData ? donnees : JSON.stringify(donnees),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw { erreur: json.detail || json.erreur || `Erreur ${r.status}`, code: r.status, ...json };
        return json;
    }

    async function patch(url, donnees, options = {}) {
        const r = await requete(url, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(donnees),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw { erreur: json.detail || json.erreur || `Erreur ${r.status}`, code: r.status, ...json };
        return json;
    }

    async function supprimer(url, donnees = null, options = {}) {
        const opts = { ...options, method: 'DELETE' };
        if (donnees) opts.body = JSON.stringify(donnees);
        const r = await requete(url, opts);
        if (r.status === 204) return {};
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw { erreur: json.detail || json.erreur || `Erreur ${r.status}`, code: r.status, ...json };
        return json;
    }

    // --- Utilitaire : normalise la réponse paginée ou liste brute ---
    function normaliserListe(donnees) {
        if (donnees && typeof donnees === 'object' && Array.isArray(donnees.results)) {
            return {
                resultats: donnees.results,
                total: donnees.count || donnees.results.length,
                suivant: donnees.next || null,
                precedent: donnees.previous || null,
            };
        }
        if (Array.isArray(donnees)) {
            return { resultats: donnees, total: donnees.length, suivant: null, precedent: null };
        }
        return { resultats: [], total: 0, suivant: null, precedent: null };
    }

    // --- Authentification ---
    const auth = {
        async connexion(matricule, mot_de_passe) {
            const r = await post('/auth/connexion-admin/', { matricule, mot_de_passe });
            definirTokens(r.tokens.access, r.tokens.refresh);
            localStorage.setItem('esikatok_admin_utilisateur', JSON.stringify(r.utilisateur));
            return r;
        },
        async deconnexion() {
            const refresh = localStorage.getItem('esikatok_admin_refresh');
            try {
                await fetch(`${BASE_URL}/auth/deconnexion/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh }),
                });
            } catch(e) {}
            supprimerTokens();
        },
    };

    // --- Permissions / Session ---
    const session = {
        mesPermissions: (opts) => get('/administration/mes-permissions/', opts),
        badges: (opts) => get('/administration/badges/', opts),
    };

    // --- Tableau de bord ---
    const tableauDeBord = {
        stats: (opts) => get('/statistiques/tableau-de-bord/', opts),
        parRole: (opts) => get('/administration/tableau-de-bord/', opts),
    };

    // --- Utilisateurs ---
    const utilisateurs = {
        liste: (params = {}, opts) => get(`/administration/utilisateurs/${construireParams(params)}`, opts),
        detail: (id, opts) => get(`/administration/utilisateurs/${id}/`, opts),
        changerStatut: (id, action) => post(`/administration/utilisateurs/${id}/statut/`, { action }),
        supprimerUtilisateur: (id) => supprimer(`/administration/utilisateurs/${id}/supprimer/`),
    };

    // --- Agents ---
    const agents = {
        liste: (params = {}, opts) => get(`/administration/agents/${construireParams(params)}`, opts),
        detail: (id, opts) => get(`/administration/agents/${id}/`, opts),
        action: (id, action) => post(`/administration/agents/${id}/action/`, { action }),
    };

    // --- Administrateurs ---
    const admins = {
        liste: (params = {}, opts) => get(`/administration/admins/${construireParams(params)}`, opts),
        detail: (id, opts) => get(`/administration/admins/${id}/`, opts),
        creer: (donnees) => post('/comptes/creer-admin/', donnees),
        modifierRole: (id, role_admin) => patch(`/administration/admins/${id}/role/`, { role_admin }),
        supprimerAdmin: (id) => supprimer(`/administration/admins/${id}/supprimer/`),
    };

    // --- Modération ---
    const moderation = {
        soumissions: (params = {}, opts) => get(`/moderation/soumissions/${construireParams(params)}`, opts),
        detail: (id, opts) => get(`/moderation/soumissions/${id}/`, opts),
        traiter: (id, donnees) => post(`/moderation/soumissions/${id}/traiter/`, donnees),
        statistiques: (opts) => get('/moderation/statistiques/', opts),
    };

    // --- Vidéos (admin) ---
    const videos = {
        supprimer: (id, motif = '') => post(`/administration/videos/${id}/supprimer/`, { motif }),
        historiqueSuppressions: (params = {}, opts) => get(`/administration/videos/suppressions/${construireParams(params)}`, opts),
    };

    // --- Biens (admin) ---
    const biens = {
        liste: (params = {}, opts) => get(`/administration/biens/${construireParams(params)}`, opts),
        retirer: (id, motif) => post(`/administration/biens/${id}/retirer/`, { motif }),
        supprimerBien: (id) => supprimer(`/administration/biens/${id}/supprimer/`),
    };

    // --- Abonnements ---
    const abonnements = {
        liste: (params = {}, opts) => get(`/administration/abonnements/${construireParams(params)}`, opts),
        action: (id, donnees) => post(`/administration/abonnements/${id}/action/`, donnees),
    };

    // --- Boosts ---
    const boostsAdmin = {
        liste: (params = {}, opts) => get(`/administration/boosts/${construireParams(params)}`, opts),
        action: (id, action) => post(`/administration/boosts/${id}/action/`, { action }),
    };

    // --- Transactions ---
    const transactions = {
        liste: (params = {}, opts) => get(`/administration/transactions/${construireParams(params)}`, opts),
    };

    // --- Messagerie ---
    const messagerie = {
        conversations: (params = {}, opts) => get(`/administration/messagerie/conversations/${construireParams(params)}`, opts),
        messages: (convId, params = {}, opts) => get(`/administration/messagerie/conversations/${convId}/messages/${construireParams(params)}`, opts),
        supprimerMessage: (msgId) => supprimer(`/administration/messagerie/messages/${msgId}/supprimer/`),
    };

    // --- Logs / Activités ---
    const logs = {
        connexions: (params = {}, opts) => get(`/administration/logs/connexions/${construireParams(params)}`, opts),
        activites: (params = {}, opts) => get(`/administration/logs/activites/${construireParams(params)}`, opts),
    };

    // --- Finances ---
    const finances = {
        resume: (opts) => get('/administration/finances/', opts),
    };

    // --- Paramètres ---
    const parametres = {
        liste: (opts) => get('/administration/parametres/', opts),
        enregistrer: (donnees) => post('/administration/parametres/', donnees),
        supprimerParam: (cle) => supprimer('/administration/parametres/', { cle }),
    };

    // --- Fiches de travail ---
    const fichesTravail = {
        liste: (params = {}, opts) => get(`/administration/fiches-travail/${construireParams(params)}`, opts),
        creer: (donnees) => post('/administration/fiches-travail/', donnees),
    };

    // --- Annonces (Plateforme → Utilisateurs) ---
    const annonces = {
        liste: (opts) => get('/administration/annonces/', opts),
        creer: (donnees) => post('/administration/annonces/', donnees),
        supprimerAnnonce: (id) => supprimer(`/administration/annonces/${id}/supprimer/`),
    };

    // --- Préoccupations (Questions utilisateurs) ---
    const preoccupations = {
        liste: (params = {}, opts) => get(`/administration/preoccupations/${construireParams(params)}`, opts),
        traiter: (id, donnees) => post(`/administration/preoccupations/${id}/traiter/`, donnees),
    };

    return {
        obtenirToken, supprimerTokens, obtenirUtilisateur,
        construireParams, normaliserListe,
        auth, session, tableauDeBord, utilisateurs, agents, admins, moderation, videos, biens,
        abonnements, boostsAdmin, transactions, messagerie,
        logs, finances, parametres, fichesTravail, annonces, preoccupations,
    };
})();
