/**
 * Gestionnaire de badges de notifications - EsikaTok.
 * Système premium iOS/TikTok avec animations fluides, glossy effect,
 * et mise à jour en temps réel via polling /comptes/badges/.
 */
const BadgeManager = (() => {
    let _intervalId = null;
    let _donnees = {};
    const _prev = {};   // comptage précédent par ID (pour animation)
    const INTERVALLE_MS = 15000;
    const CLE_ANNONCES_VUES = 'esikatok_annonces_vues';
    const CLE_PREOC_VUES = 'esikatok_preoc_repondues_vues';

    /* ═══════════ Formatage ═══════════ */
    function formaterCompteur(n) {
        if (n <= 0) return '';
        return n > 99 ? '99+' : String(n);
    }

    /* ═══════════ Animations (Web Animations API — ultra fluide) ═══════════ */
    const EASE_SPRING = 'cubic-bezier(0.175,0.885,0.32,1.275)';

    function animEntree(el) {
        el.animate([
            { transform: 'scale(0)', opacity: 0 },
            { transform: 'scale(1.2)', opacity: 1, offset: 0.6 },
            { transform: 'scale(0.93)', offset: 0.8 },
            { transform: 'scale(1)', opacity: 1 },
        ], { duration: 250, easing: EASE_SPRING, fill: 'forwards' });
    }

    function animPulse(el) {
        el.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.22)', offset: 0.35 },
            { transform: 'scale(0.92)', offset: 0.65 },
            { transform: 'scale(1)' },
        ], { duration: 300, easing: EASE_SPRING });
    }

    function animSortie(el, cb) {
        const a = el.animate([
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(0)', opacity: 0 },
        ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
        a.onfinish = cb;
    }

    /* ═══════════ Mise à jour DOM (avec animations) ═══════════ */
    function majBadge(id, count) {
        const el = document.getElementById(id);
        if (!el) return;
        const prev = _prev[id] || 0;
        _prev[id] = count;

        if (count > 0) {
            el.textContent = formaterCompteur(count);
            el.classList.remove('hidden');
            el.style.transform = 'scale(1)';
            el.style.opacity = '1';

            if (prev === 0) {
                animEntree(el);
            } else if (prev !== count) {
                animPulse(el);
            }
        } else if (prev > 0) {
            animSortie(el, () => el.classList.add('hidden'));
        } else {
            el.classList.add('hidden');
        }
    }

    /* ═══════════ Générateur HTML premium (pour rendu statique) ═══════════ */
    /**
     * Génère le HTML d'un badge premium.
     * @param {number} count - Nombre à afficher
     * @param {object} opts  - { id, taille:'sm'|'', variante:'orange'|'', abs:bool, dot:bool }
     */
    function html(count, opts = {}) {
        if (count <= 0 && !opts.dot) return '';
        const cls = ['badge-notif', 'badge-notif--entree'];
        if (opts.taille === 'sm') cls.push('badge-notif--sm');
        if (opts.variante === 'orange') cls.push('badge-notif--orange');
        if (opts.abs) cls.push('badge-notif--abs');
        if (opts.dot) cls.push('badge-notif--dot');
        const idAttr = opts.id ? ` id="${opts.id}"` : '';
        const texte = opts.dot ? '' : (opts.texte || formaterCompteur(count));
        return `<span${idAttr} class="${cls.join(' ')}">${texte}</span>`;
    }

    /** Raccourci nav */
    function majBadgeNav(total) { majBadge('badge-messages', total); }
    function majBadgeProfil(total) { majBadge('badge-profil', total); }

    /* ═══════════ Compteurs dérivés ═══════════ */
    function annoncesNonVues() {
        const total = _donnees.annonces_total || 0;
        const vues = parseInt(localStorage.getItem(CLE_ANNONCES_VUES) || '0', 10);
        return Math.max(0, total - vues);
    }
    function marquerAnnoncesVues() {
        localStorage.setItem(CLE_ANNONCES_VUES, String(_donnees.annonces_total || 0));
        majTousLesBadges();
    }
    function preocRepNonVues() {
        const total = _donnees.preoccupations_repondues || 0;
        const vues = parseInt(localStorage.getItem(CLE_PREOC_VUES) || '0', 10);
        return Math.max(0, total - vues);
    }
    function marquerPreocVues() {
        localStorage.setItem(CLE_PREOC_VUES, String(_donnees.preoccupations_repondues || 0));
        majTousLesBadges();
    }
    function totalAide() { return annoncesNonVues() + preocRepNonVues(); }

    /** Badges agent */
    function pubsEnAttente() { return _donnees.publications_en_attente || 0; }
    function pubsRefusees() { return _donnees.publications_refusees || 0; }
    function aboExpirant() { return _donnees.abo_expirant ? 1 : 0; }
    function totalAgent() { return pubsEnAttente() + pubsRefusees() + aboExpirant(); }
    function totalProfil() { return totalAide() + totalAgent(); }

    /* ═══════════ Mise à jour globale ═══════════ */
    function majTousLesBadges() {
        majBadgeNav(_donnees.conversations_non_lues || 0);
        majBadgeProfil(totalProfil());
        majBadge('badge-aide', totalAide());
        majBadge('badge-aide-annonces', annoncesNonVues());
        majBadge('badge-aide-historique', preocRepNonVues());
        majBadge('badge-agent-pubs', pubsEnAttente() + pubsRefusees());
        majBadge('badge-agent-abo', aboExpirant());
    }

    /* ═══════════ Polling API ═══════════ */
    async function rafraichir() {
        if (!EtatApp.estConnecte()) return;
        try {
            _donnees = await ApiEsikaTok.badges.compteurs();
            EtatApp.definir('nonLusGlobal', _donnees.conversations_non_lues || 0);
            EtatApp.definir('messagesNonLusTotal', _donnees.messages_non_lus || 0);
            majTousLesBadges();
        } catch (e) { /* silencieux */ }
    }

    function demarrer() { arreter(); rafraichir(); _intervalId = setInterval(rafraichir, INTERVALLE_MS); }
    function arreter() { if (_intervalId) { clearInterval(_intervalId); _intervalId = null; } }
    function forcer() { rafraichir(); }
    function obtenir() { return _donnees; }

    return {
        demarrer, arreter, forcer, obtenir,
        majBadgeNav, majBadgeProfil, majBadge,
        formaterCompteur, html, majTousLesBadges,
        annoncesNonVues, preocRepNonVues, totalAide, totalProfil,
        marquerAnnoncesVues, marquerPreocVues,
        pubsEnAttente, pubsRefusees, aboExpirant, totalAgent,
    };
})();
