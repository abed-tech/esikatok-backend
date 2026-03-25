/**
 * Module principal SPA pour EsikaTok - Frontend Administration.
 * Routeur, sidebar dynamique par rôle, header avec profil, navigation.
 * Permissions pilotées par la matrice backend (RBAC strict).
 */
const AdminApp = (() => {
    let pageActuelle = 'tableau-de-bord';
    let utilisateurConnecte = null;
    let roleAdmin = '';
    let roleLabel = '';
    let _permissions = {};   // { module: ['lire','creer','modifier','supprimer'] }
    let _pagesAutorisees = []; // ['tableau-de-bord', 'moderation', ...]
    let _badges = {};          // { preoccupations_en_attente: N, messages_non_lus: N, moderation_en_attente: N }
    let _badgeIntervalId = null;
    const BADGE_INTERVALLE_MS = 20000; // 20 secondes

    // Mapping module backend badge key → sidebar page id
    const BADGE_MAP = {
        'preoccupations_en_attente': 'preoccupations',
        'messages_non_lus': 'messagerie',
        'moderation_en_attente': 'moderation',
        'utilisateurs_nouveaux': 'utilisateurs',
        'agents_nouveaux': 'agents',
        'abonnements_expirants': 'abonnements',
        'boosts_actifs': 'boosts',
        'biens_en_attente': 'biens',
    };

    // --- Définition des pages (UI uniquement, accès piloté par le backend) ---
    const PAGES = [
        {
            id: 'tableau-de-bord', label: 'Tableau de bord', module: 'tableau_de_bord',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
            section: 'principal',
        },
        {
            id: 'moderation', label: 'Vidéos', module: 'moderation',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
            section: 'contenu',
        },
        {
            id: 'utilisateurs', label: 'Utilisateurs', module: 'utilisateurs',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
            section: 'contenu',
        },
        {
            id: 'agents', label: 'Agents', module: 'agents',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
            section: 'contenu',
        },
        {
            id: 'biens', label: 'Biens immobiliers', module: 'biens',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg>',
            section: 'contenu',
        },
        {
            id: 'abonnements', label: 'Abonnements', module: 'abonnements',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.157.733.514 1.4 1.023 1.946a3.42 3.42 0 010 4.438c-.509.546-.866 1.213-1.023 1.946a3.42 3.42 0 01-3.138 3.138c-.733.157-1.4.514-1.946 1.023a3.42 3.42 0 01-4.438 0c-.546-.509-1.213-.866-1.946-1.023a3.42 3.42 0 01-3.138-3.138c-.157-.733-.514-1.4-1.023-1.946a3.42 3.42 0 010-4.438c.509-.546.866-1.213 1.023-1.946a3.42 3.42 0 013.138-3.138z"/></svg>',
            section: 'gestion',
        },
        {
            id: 'boosts', label: 'Boosts', module: 'boosts',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
            section: 'gestion',
        },
        {
            id: 'messagerie', label: 'Messagerie', module: 'messagerie',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
            section: 'gestion',
        },
        {
            id: 'annonces', label: 'Annonces', module: 'annonces',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>',
            section: 'gestion',
        },
        {
            id: 'preoccupations', label: 'Préoccupations', module: 'preoccupations',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            section: 'gestion',
        },
        {
            id: 'administrateurs', label: 'Administrateurs', module: 'administrateurs',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
            section: 'systeme',
        },
        {
            id: 'activites', label: 'Activités', module: 'activites',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            section: 'systeme',
        },
        {
            id: 'finances', label: 'Finances', module: 'finances',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            section: 'systeme',
        },
        {
            id: 'parametres', label: 'Paramètres', module: 'parametres',
            icone: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
            section: 'systeme',
        },
    ];

    const SECTIONS = [
        { id: 'principal', label: '' },
        { id: 'contenu', label: 'Contenu' },
        { id: 'gestion', label: 'Gestion' },
        { id: 'systeme', label: 'Système' },
    ];

    // Mapping module backend → page id frontend
    const MODULE_VERS_PAGE = {
        'tableau_de_bord': 'tableau-de-bord',
        'moderation':      'moderation',
        'utilisateurs':    'utilisateurs',
        'agents':          'agents',
        'biens':           'biens',
        'abonnements':     'abonnements',
        'boosts':          'boosts',
        'messagerie':      'messagerie',
        'annonces':        'annonces',
        'preoccupations':  'preoccupations',
        'administrateurs': 'administrateurs',
        'activites':       'activites',
        'finances':        'finances',
        'parametres':      'parametres',
    };

    // --- Permissions (pilotées par le backend) ---

    /**
     * Vérifie si l'admin connecté a la permission (module, action).
     * Utilisable par tous les modules page : AdminApp.aPermission('videos', 'supprimer')
     */
    function aPermission(module, action = 'lire') {
        const actions = _permissions[module];
        if (!actions) return false;
        return actions.includes(action);
    }

    function aAccesPage(page) {
        return _pagesAutorisees.includes(page.id);
    }

    function pagesAccessibles() {
        return PAGES.filter(p => aAccesPage(p));
    }

    /**
     * Charge les permissions depuis le backend et les stocke.
     * Appelé après connexion et lors de la réinitialisation.
     */
    async function chargerPermissions() {
        try {
            const data = await AdminApi.session.mesPermissions();
            _permissions = data.permissions || {};
            _pagesAutorisees = (data.pages || []);
            // Toujours inclure le tableau de bord
            if (!_pagesAutorisees.includes('tableau-de-bord')) {
                _pagesAutorisees.unshift('tableau-de-bord');
            }
            roleAdmin = data.role || '';
            roleLabel = data.role_label || '';
            // Persister en local pour affichage instantané au refresh
            localStorage.setItem('esikatok_admin_permissions', JSON.stringify({
                permissions: _permissions,
                pages: _pagesAutorisees,
                role: roleAdmin,
                role_label: roleLabel,
            }));
            return data;
        } catch (e) {
            // Fallback : charger depuis le cache local
            chargerPermissionsLocales();
            return null;
        }
    }

    function chargerPermissionsLocales() {
        try {
            const cache = JSON.parse(localStorage.getItem('esikatok_admin_permissions'));
            if (cache) {
                _permissions = cache.permissions || {};
                _pagesAutorisees = cache.pages || [];
                roleAdmin = cache.role || '';
                roleLabel = cache.role_label || '';
            }
        } catch (e) {}
    }

    function reinitialiserPermissions() {
        _permissions = {};
        _pagesAutorisees = [];
        roleAdmin = '';
        roleLabel = '';
        localStorage.removeItem('esikatok_admin_permissions');
    }

    // --- Construction sidebar ---
    function construireSidebar() {
        const nav = document.getElementById('sidebar-nav');
        const pages = pagesAccessibles();
        let html = '';

        SECTIONS.forEach(section => {
            const pagesDansSection = pages.filter(p => p.section === section.id);
            if (pagesDansSection.length === 0) return;

            if (section.label) {
                html += `<p class="px-3 pt-4 pb-1 text-[10px] font-semibold text-sombre-400 uppercase tracking-widest">${section.label}</p>`;
            }

            pagesDansSection.forEach(p => {
                const badgeCount = obtenirBadgePourPage(p.id);
                const badgeHtml = badgeCount > 0
                    ? `<span class="badge-admin badge-notif badge-notif--entree ml-auto" style="--badge-ring:#0f172a">${badgeCount > 99 ? '99+' : badgeCount}</span>`
                    : '';
                html += `
                <button onclick="AdminApp.naviguer('${p.id}')"
                    id="nav-${p.id}"
                    class="sidebar-lien w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-sombre-300 transition ${pageActuelle === p.id ? 'actif' : ''}">
                    ${p.icone}
                    <span class="flex-1 text-left">${p.label}</span>
                    ${badgeHtml}
                </button>`;
            });
        });

        nav.innerHTML = html;
    }

    // --- Construction profil sidebar ---
    function construireProfilSidebar() {
        const el = document.getElementById('sidebar-profil');
        if (!utilisateurConnecte) { el.innerHTML = ''; return; }

        const initiale = (utilisateurConnecte.prenom || utilisateurConnecte.nom || 'A').charAt(0).toUpperCase();
        const nomAffiche = `${utilisateurConnecte.prenom || ''} ${utilisateurConnecte.nom || ''}`.trim();
        el.innerHTML = `
        <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-primaire-600/80 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">${initiale}</div>
            <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-white truncate">${nomAffiche}</p>
                <p class="text-[10px] text-primaire-400 truncate font-semibold">${roleLabel || roleAdmin}</p>
            </div>
            <button onclick="AdminApp.deconnexion()" title="Se déconnecter" class="p-1.5 rounded-lg text-sombre-400 hover:text-red-400 hover:bg-sombre-800 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
        </div>`;
    }

    // --- Construction header ---
    function construireHeader() {
        const headerProfil = document.getElementById('header-profil');
        const headerTitre = document.getElementById('header-titre-page');
        if (!utilisateurConnecte) { headerProfil.innerHTML = ''; return; }

        const pageInfo = PAGES.find(p => p.id === pageActuelle);
        if (headerTitre) headerTitre.textContent = pageInfo ? pageInfo.label : '';

        const initiale = (utilisateurConnecte.prenom || utilisateurConnecte.nom || 'A').charAt(0).toUpperCase();
        const nomAffiche = `${utilisateurConnecte.prenom || ''} ${utilisateurConnecte.nom || ''}`.trim();
        const totalBadges = Object.values(_badges).reduce((a, b) => a + (b || 0), 0);
        const bellBadge = totalBadges > 0
            ? `<span id="badge-header-admin" class="badge-notif badge-notif--sm badge-notif--abs badge-notif--entree" style="--badge-ring:#1e293b">${totalBadges > 99 ? '99+' : totalBadges}</span>`
            : `<span id="badge-header-admin" class="hidden badge-notif badge-notif--sm badge-notif--abs" style="--badge-ring:#1e293b">0</span>`;

        headerProfil.innerHTML = `
        <div class="flex items-center gap-2.5">
            <button class="p-1.5 rounded-lg text-sombre-400 hover:text-primaire-400 hover:bg-sombre-800 transition relative" title="Notifications">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                ${bellBadge}
            </button>
            <div class="text-right hidden sm:block">
                <p class="text-xs font-medium text-white leading-tight">${nomAffiche}</p>
                <p class="text-[10px] text-primaire-400 font-semibold">${roleLabel || roleAdmin}</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-primaire-600/80 flex items-center justify-center text-white text-xs font-bold">${initiale}</div>
            <button onclick="AdminApp.deconnexion()" title="Se déconnecter" class="p-1.5 rounded-lg text-sombre-400 hover:text-red-400 hover:bg-sombre-800 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
        </div>`;
    }

    // --- Navigation ---
    function naviguer(pageId) {
        const page = PAGES.find(p => p.id === pageId);
        if (page && !aAccesPage(page)) {
            AdminComposants.toast('Accès non autorisé pour votre rôle.', 'erreur');
            return;
        }

        pageActuelle = pageId;
        construireSidebar();
        construireHeader();

        // Rafraîchir badges immédiatement au changement de page
        rafraichirBadges();

        // Fermer sidebar mobile
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            sidebar.classList.add('hidden');
            sidebar.classList.remove('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
            overlay.classList.add('hidden');
        }

        chargerPage(pageId);
    }

    function chargerPage(pageId) {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();

        switch(pageId) {
            case 'tableau-de-bord': PageTableauDeBord.afficher(); break;
            case 'moderation': PageModeration.afficher(); break;
            case 'utilisateurs': PageUtilisateurs.afficher(); break;
            case 'agents': PageAgents.afficher(); break;
            case 'biens': PageBiens.afficher(); break;
            case 'abonnements': PageAbonnements.afficher(); break;
            case 'boosts': PageBoosts.afficher(); break;
            case 'messagerie': PageMessagerie.afficher(); break;
            case 'annonces': PageAnnonces.afficher(); break;
            case 'preoccupations': PagePreoccupations.afficher(); break;
            case 'administrateurs': PageAdministrateurs.afficher(); break;
            case 'activites': PageActivites.afficher(); break;
            case 'finances': PageFinances.afficher(); break;
            case 'parametres': PageParametres.afficher(); break;
            default:
                contenu.innerHTML = AdminComposants.etatVide('Page non trouvée.');
        }
    }

    // --- Toggle sidebar mobile ---
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const estCache = sidebar.classList.contains('hidden');

        if (estCache) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
            overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
            overlay.classList.add('hidden');
        }
    }

    // --- Badge polling ---
    function obtenirBadgePourPage(pageId) {
        for (const [cle, pid] of Object.entries(BADGE_MAP)) {
            if (pid === pageId) return _badges[cle] || 0;
        }
        return 0;
    }

    const _prevBadges = {};  // track previous counts for animation
    const EASE_SPRING = 'cubic-bezier(0.175,0.885,0.32,1.275)';

    function _animerBadge(el, prev, count) {
        if (count > 0) {
            const texte = count > 99 ? '99+' : String(count);
            el.textContent = texte;
            el.classList.remove('hidden');
            el.style.transform = 'scale(1)';
            el.style.opacity = '1';
            if (prev === 0) {
                el.animate([
                    { transform: 'scale(0)', opacity: 0 },
                    { transform: 'scale(1.2)', opacity: 1, offset: 0.6 },
                    { transform: 'scale(0.93)', offset: 0.8 },
                    { transform: 'scale(1)', opacity: 1 },
                ], { duration: 250, easing: EASE_SPRING, fill: 'forwards' });
            } else if (prev !== count) {
                el.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.22)', offset: 0.35 },
                    { transform: 'scale(0.92)', offset: 0.65 },
                    { transform: 'scale(1)' },
                ], { duration: 300, easing: EASE_SPRING });
            }
        } else if (prev > 0) {
            const a = el.animate([
                { transform: 'scale(1)', opacity: 1 },
                { transform: 'scale(0)', opacity: 0 },
            ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
            a.onfinish = () => el.classList.add('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    async function rafraichirBadges() {
        try {
            _badges = await AdminApi.session.badges();
            for (const [cle, pageId] of Object.entries(BADGE_MAP)) {
                const btn = document.getElementById(`nav-${pageId}`);
                if (!btn) continue;
                let span = btn.querySelector('.badge-admin');
                const count = _badges[cle] || 0;
                const prev = _prevBadges[cle] || 0;
                _prevBadges[cle] = count;

                if (count > 0) {
                    if (!span) {
                        span = document.createElement('span');
                        span.className = 'badge-admin badge-notif ml-auto';
                        span.style.setProperty('--badge-ring', '#0f172a');
                        btn.appendChild(span);
                    }
                    _animerBadge(span, prev, count);
                } else if (span) {
                    _animerBadge(span, prev, 0);
                }
            }
            const totalBadges = Object.values(_badges).reduce((a, b) => a + (b || 0), 0);
            const bellSpan = document.getElementById('badge-header-admin');
            if (bellSpan) {
                const prevTotal = _prevBadges._total || 0;
                _prevBadges._total = totalBadges;
                _animerBadge(bellSpan, prevTotal, totalBadges);
            }
        } catch (e) { /* silencieux */ }
    }

    function demarrerBadges() {
        arreterBadges();
        rafraichirBadges();
        _badgeIntervalId = setInterval(rafraichirBadges, BADGE_INTERVALLE_MS);
    }

    function arreterBadges() {
        if (_badgeIntervalId) { clearInterval(_badgeIntervalId); _badgeIntervalId = null; }
        _badges = {};
    }

    // --- Déconnexion ---
    async function deconnexion() {
        arreterBadges();
        await AdminApi.auth.deconnexion();
        utilisateurConnecte = null;
        reinitialiserPermissions();
        initialiser();
    }

    // --- Après connexion réussie ---
    async function apresConnexion() {
        chargerUtilisateur();
        await chargerPermissions();
        afficherInterface();
        demarrerBadges();
        naviguer('tableau-de-bord');
    }

    // --- Charger les données utilisateur ---
    function chargerUtilisateur() {
        utilisateurConnecte = AdminApi.obtenirUtilisateur();
    }

    // --- Afficher l'interface complète ---
    function afficherInterface() {
        const sidebar = document.getElementById('sidebar');
        const header = document.getElementById('admin-header');
        sidebar.classList.remove('hidden');
        sidebar.classList.add('lg:flex');
        header.classList.remove('hidden');
        construireSidebar();
        construireProfilSidebar();
        construireHeader();
    }

    // --- Initialisation ---
    async function initialiser() {
        const token = AdminApi.obtenirToken();
        const user = localStorage.getItem('esikatok_admin_utilisateur');

        if (token && user) {
            chargerUtilisateur();
            chargerPermissionsLocales();
            afficherInterface();
            demarrerBadges();
            naviguer('tableau-de-bord');
            // Rafraîchir les permissions depuis le backend (silencieux)
            chargerPermissions().then(() => {
                construireSidebar();
                construireProfilSidebar();
                construireHeader();
            });
        } else {
            PageConnexion.afficher();
        }
    }

    // --- Démarrage ---
    document.addEventListener('DOMContentLoaded', initialiser);

    return {
        naviguer, toggleSidebar, deconnexion, apresConnexion, initialiser,
        aPermission,
        get roleAdmin() { return roleAdmin; },
        get roleLabel() { return roleLabel; },
        get permissions() { return _permissions; },
        get utilisateurConnecte() { return utilisateurConnecte; },
    };
})();
