/**
 * Module principal de l'application EsikaTok - Frontend Utilisateur.
 * Routeur SPA avec support paramétrique, cycle de vie des pages, actions globales.
 */
const EsikaTok = (() => {

    /* --- Définition des routes ---
       nav: true = navigation basse visible
       module: objet avec afficher(params), initialiser(params), [detruire()] */
    const ROUTES = {
        'accueil':             { module: PageFeed,      nav: true,  url: () => '/' },
        'recherche':           { module: PageRecherche,  nav: true,  url: () => '/recherche' },
        'publier':             { module: PagePublier,    nav: true,  url: () => '/publier' },
        'messages':            { module: PageInbox,      nav: true,  url: () => '/messages' },
        'profil':              { module: PageProfil,     nav: true,  url: () => '/profil' },
        'detail':              { module: PageDetail,     nav: false, url: (p) => `/bien/${p.id}` },
        'message':             { module: PageMessage,    nav: false, url: (p) => `/conversation/${p.id}` },
        'favoris':             { module: PageFavoris,    nav: false, url: () => '/favoris' },
        'carte':               { module: PageCarte,      nav: false, url: (p) => `/carte/${p.id}` },
        'agent':               { module: { afficher: PageAgent.afficherPublic, initialiser: PageAgent.initialiserPublic }, nav: false, url: (p) => `/agent/${p.id}` },
        'agent-espace':        { module: { afficher: PageAgent.afficherEspace, initialiser: PageAgent.initialiserEspace }, nav: false, url: () => '/espace-agent' },
        'agent-publications':  { module: { afficher: PageAgent.afficherPublications, initialiser: PageAgent.initialiserPublications }, nav: false, url: () => '/mes-publications' },
        'agent-abonnement':    { module: { afficher: PageAgent.afficherAbonnement, initialiser: PageAgent.initialiserAbonnement }, nav: false, url: () => '/abonnement' },
        'agent-boosts':        { module: { afficher: PageAgent.afficherBoosts, initialiser: PageAgent.initialiserBoosts }, nav: false, url: () => '/mes-boosts' },
        'agent-paiements':     { module: { afficher: PageAgent.afficherPaiements, initialiser: PageAgent.initialiserPaiements }, nav: false, url: () => '/paiements' },
        'feed-recherche':      { module: PageFeedRecherche, nav: false, url: () => '/recherche/feed' },
        'aide':                { module: PageAide,        nav: false, url: () => '/aide' },
        'connexion':           { module: PageConnexion,  nav: false, url: () => '/connexion' },
    };

    let _pageActuelle = null;
    let _historique = [];

    /* --- Routeur SPA --- */
    function naviguer(page, params = {}) {
        const route = ROUTES[page];
        if (!route) return console.warn('Route inconnue:', page);

        /* Détruire la page précédente si elle a un cycle de vie */
        if (_pageActuelle) {
            const ancienModule = ROUTES[_pageActuelle]?.module;
            if (ancienModule?.detruire) ancienModule.detruire();
        }

        /* Arrêter les vidéos en lecture */
        document.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });

        /* Historique interne pour le bouton retour */
        if (_pageActuelle) _historique.push({ page: _pageActuelle, params: EtatApp.obtenir('pageParams') || {} });

        _pageActuelle = page;
        EtatApp.definir('pageActive', page);
        EtatApp.definir('pageParams', params);

        /* Rendu HTML */
        const contenu = document.getElementById('contenu-principal');
        contenu.innerHTML = route.module.afficher(params);
        contenu.className = 'flex-1 overflow-hidden fondu-entree';

        /* Navigation basse */
        const nav = document.getElementById('nav-basse');
        nav.classList.toggle('hidden', !route.nav);

        /* État actif de la nav */
        if (route.nav) {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                const cible = btn.getAttribute('data-nav');
                btn.classList.toggle('text-primaire-400', cible === page);
                btn.classList.toggle('text-sombre-200', cible !== page);
            });
        }

        /* Initialiser la page */
        if (route.module.initialiser) {
            setTimeout(() => route.module.initialiser(params), 50);
        }

        /* Mettre à jour l'URL sans rechargement */
        const url = route.url ? route.url(params) : `/${page}`;
        history.pushState({ page, params }, '', url);

        /* Scroll en haut */
        contenu.scrollTop = 0;
    }

    /* --- Navigation retour --- */
    function retour() {
        if (_historique.length > 0) {
            const precedent = _historique.pop();
            _pageActuelle = null; // Éviter double push dans l'historique
            naviguer(precedent.page, precedent.params);
            _historique.pop(); // Retirer le push ajouté par naviguer
        } else {
            naviguer('accueil');
        }
    }

    /* --- Actions globales --- */
    async function toggleFavori(bienId, btnElement) {
        if (!EtatApp.estConnecte()) {
            Composants.afficherToast('Connectez-vous pour ajouter en favori.', 'attention');
            return naviguer('connexion', { action: 'ajouter un favori' });
        }
        try {
            await ApiEsikaTok.favoris.ajouter(bienId);
            Composants.afficherToast('Ajouté aux favoris !', 'succes');
            if (btnElement) {
                const svg = btnElement.querySelector('svg');
                if (svg) { svg.classList.add('text-red-500', 'fill-current'); svg.classList.remove('text-white'); svg.setAttribute('fill', 'currentColor'); }
            }
        } catch (e) {
            try {
                await ApiEsikaTok.favoris.supprimer(bienId);
                Composants.afficherToast('Retiré des favoris.', 'info');
                if (btnElement) {
                    const svg = btnElement.querySelector('svg');
                    if (svg) { svg.classList.remove('text-red-500', 'fill-current'); svg.classList.add('text-white'); svg.setAttribute('fill', 'none'); }
                }
            } catch (e2) {
                Composants.afficherToast(e.erreur || 'Erreur.', 'erreur');
            }
        }
    }

    function contacterAgent(bienId) {
        if (!EtatApp.estConnecte()) {
            Composants.afficherToast("Connectez-vous pour contacter l'agent.", 'attention');
            return naviguer('connexion', { action: "contacter l'agent" });
        }
        const contenu = `
        <div class="space-y-3">
            <p class="text-sm text-sombre-200">Envoyez un message à l'agent concernant ce bien</p>
            ${Composants.champFormulaire('msg-contact', 'Votre message', 'textarea', {
                obligatoire: true, placeholder: 'Bonjour, je suis intéressé(e) par ce bien...', lignes: 4,
            })}
            ${Composants.bouton('Envoyer le message', `EsikaTok.envoyerContact(${bienId})`, { variante:'primaire', plein:true })}
        </div>`;
        Composants.ouvrirModal(contenu, { titre: "Contacter l'agent" });
    }

    async function envoyerContact(bienId) {
        const message = document.getElementById('msg-contact')?.value?.trim();
        if (!message) return Composants.afficherToast('Écrivez un message.', 'attention');
        try {
            const r = await ApiEsikaTok.messagerie.creerConversation(bienId, message);
            Composants.afficherToast('Message envoyé !', 'succes');
            Composants.fermerModal();
            /* Ouvrir la conversation créée */
            if (r.id) naviguer('message', { id: r.id });
        } catch (e) {
            Composants.afficherToast(e.erreur || 'Erreur.', 'erreur');
        }
    }

    function voirDetail(bienId) {
        naviguer('detail', { id: bienId });
    }

    function voirAgent(agentId) {
        naviguer('agent', { id: agentId });
    }

    function toggleMute(btnElement) {
        const estMute = EtatApp.obtenir('feedMute') !== false;
        const nouveauMute = !estMute;
        EtatApp.definir('feedMute', nouveauMute);
        /* Appliquer à toutes les vidéos en cours */
        document.querySelectorAll('.video-lecteur').forEach(v => { v.muted = nouveauMute; });
        /* Mettre à jour toutes les icônes mute */
        document.querySelectorAll('.icone-mute').forEach(svg => {
            if (nouveauMute) {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>';
            } else {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>';
            }
        });
    }

    async function partagerBien(bienId, titre) {
        const url = `${window.location.origin}/bien/${bienId}`;
        if (navigator.share) {
            try { await navigator.share({ title: `EsikaTok - ${decodeURIComponent(titre)}`, url }); } catch (e) {}
        } else {
            try {
                await navigator.clipboard.writeText(url);
                Composants.afficherToast('Lien copié !', 'succes');
            } catch (e) {
                Composants.afficherToast('Impossible de copier le lien.', 'erreur');
            }
        }
    }

    async function deconnecter() {
        BadgeManager.arreter();
        await ApiEsikaTok.auth.deconnexion();
        EtatApp.deconnecter();
        _historique = [];
        BadgeManager.majBadgeNav(0);
        BadgeManager.majBadgeProfil(0);
        Composants.afficherToast('Déconnexion réussie.', 'info');
        naviguer('accueil');
    }

    /* --- Résolution URL → route (pour popstate et deep links) --- */
    function resoudreUrl(pathname) {
        if (pathname === '/' || pathname === '') return { page: 'accueil', params: {} };
        const segments = pathname.replace(/^\//, '').split('/');
        const carte = {
            'recherche': 'recherche', 'publier': 'publier', 'messages': 'messages',
            'profil': 'profil', 'favoris': 'favoris', 'connexion': 'connexion',
            'espace-agent': 'agent-espace', 'mes-publications': 'agent-publications',
            'abonnement': 'agent-abonnement', 'mes-boosts': 'agent-boosts', 'paiements': 'agent-paiements',
        };
        if (segments[0] === 'recherche' && segments[1] === 'feed') return { page: 'feed-recherche', params: { filtres: {} } };
        if (carte[segments[0]]) return { page: carte[segments[0]], params: {} };
        if (segments[0] === 'bien' && segments[1]) return { page: 'detail', params: { id: parseInt(segments[1]) } };
        if (segments[0] === 'conversation' && segments[1]) return { page: 'message', params: { id: parseInt(segments[1]) } };
        if (segments[0] === 'agent' && segments[1]) return { page: 'agent', params: { id: parseInt(segments[1]) } };
        if (segments[0] === 'carte' && segments[1]) return { page: 'carte', params: { id: parseInt(segments[1]) } };
        return { page: 'accueil', params: {} };
    }

    /* --- Initialisation --- */
    function initialiser() {
        EtatApp.initialiser();

        /* Démarrer le polling des badges si connecté */
        if (EtatApp.estConnecte()) BadgeManager.demarrer();

        /* Gestion du bouton retour navigateur */
        window.addEventListener('popstate', (e) => {
            if (e.state?.page) {
                _pageActuelle = null;
                naviguer(e.state.page, e.state.params || {});
            } else {
                const { page, params } = resoudreUrl(location.pathname);
                _pageActuelle = null;
                naviguer(page, params);
            }
        });

        /* Déterminer la page initiale depuis l'URL */
        const { page, params } = resoudreUrl(location.pathname);
        naviguer(page, params);
    }

    document.addEventListener('DOMContentLoaded', initialiser);

    return {
        naviguer, retour, toggleFavori, contacterAgent, envoyerContact,
        voirDetail, voirAgent, partagerBien, toggleMute, deconnecter,
    };
})();
