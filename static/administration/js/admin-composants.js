/**
 * Composants UI réutilisables pour EsikaTok - Frontend Administration.
 * Variables et fonctions en français. Design moderne type SaaS.
 */
const AdminComposants = (() => {

    // --- Notifications toast ---
    function toast(message, type = 'info') {
        const zone = document.getElementById('zone-toasts-admin');
        const couleurs = { info: 'bg-primaire-600', succes: 'bg-green-600', erreur: 'bg-red-600', attention: 'bg-amber-600' };
        const icones = {
            info: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            succes: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            erreur: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            attention: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
        };
        const el = document.createElement('div');
        el.className = `toast pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl ${couleurs[type] || couleurs.info} text-white text-sm font-medium shadow-lg`;
        el.innerHTML = `${icones[type] || icones.info}<span>${message}</span>`;
        zone.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    // --- Loader ---
    function loader() {
        return '<div class="flex justify-center py-12"><div class="loader"></div></div>';
    }

    function loaderInline() {
        return '<div class="flex justify-center py-4"><div class="loader" style="width:20px;height:20px;border-width:2px"></div></div>';
    }

    // --- Etat erreur avec bouton réessayer ---
    function etatErreur(message, onReessayer = '') {
        return `
        <div class="text-center py-16">
            <svg class="w-12 h-12 text-red-500/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            <p class="text-red-400 text-sm mb-4">${message}</p>
            ${onReessayer ? `<button onclick="${onReessayer}" class="inline-flex items-center gap-2 px-4 py-2 bg-sombre-800 hover:bg-sombre-700 border border-sombre-700 rounded-lg text-sm text-white transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Réessayer</button>` : ''}
        </div>`;
    }

    // --- Bouton rechargement ---
    function boutonRecharger(onClickFn) {
        return `<button onclick="${onClickFn}" title="Actualiser" class="p-2 rounded-lg bg-sombre-800 hover:bg-sombre-700 border border-sombre-700 text-sombre-300 hover:text-white transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>`;
    }

    // --- Compteur de résultats ---
    function compteurResultats(total, label = 'résultat') {
        if (total === 0) return '';
        return `<span class="text-xs text-sombre-400">${total} ${label}${total > 1 ? 's' : ''}</span>`;
    }

    // --- Etat vide ---
    function etatVide(message, icone = '') {
        const iconeDefaut = '<svg class="w-12 h-12 text-sombre-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>';
        return `<div class="text-center py-16">${icone || iconeDefaut}<p class="text-sombre-400 text-sm">${message}</p></div>`;
    }

    // --- KPI compact (titre + valeur + couleur texte) ---
    function kpi(titre, valeur, couleurTexte = 'text-white') {
        return `
        <div class="bg-sombre-800 border border-sombre-700/50 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold ${couleurTexte}">${valeur}</p>
            <p class="text-[11px] text-sombre-400 mt-1 uppercase tracking-wider">${titre}</p>
        </div>`;
    }

    // --- Carte statistique ---
    function carteStatistique(titre, valeur, icone, couleur = 'primaire') {
        const couleurs = {
            primaire: 'from-primaire-600/20 to-primaire-600/5 border-primaire-600/30',
            vert: 'from-green-600/20 to-green-600/5 border-green-600/30',
            orange: 'from-amber-600/20 to-amber-600/5 border-amber-600/30',
            rouge: 'from-red-600/20 to-red-600/5 border-red-600/30',
            violet: 'from-purple-600/20 to-purple-600/5 border-purple-600/30',
        };
        return `
        <div class="bg-gradient-to-br ${couleurs[couleur] || couleurs.primaire} border rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-medium text-sombre-300 uppercase tracking-wider">${titre}</span>
                <span class="text-sombre-400">${icone}</span>
            </div>
            <p class="text-2xl font-bold text-white">${valeur}</p>
        </div>`;
    }

    // --- Section avec titre ---
    function sectionTitre(titre, sousTitre = '', actionsHtml = '') {
        return `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
                <h2 class="text-xl font-bold text-white">${titre}</h2>
                ${sousTitre ? `<p class="text-sm text-sombre-400 mt-0.5">${sousTitre}</p>` : ''}
            </div>
            ${actionsHtml ? `<div class="flex flex-wrap gap-2">${actionsHtml}</div>` : ''}
        </div>`;
    }

    // --- Tableau ---
    function tableau(colonnes, lignes, actions = null) {
        return `
        <div class="overflow-x-auto rounded-xl border border-sombre-800 table-responsive">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-sombre-800/50 text-left">
                        ${colonnes.map(c => `<th class="px-4 py-3 font-medium text-sombre-400 text-xs uppercase tracking-wider whitespace-nowrap">${c}</th>`).join('')}
                        ${actions ? '<th class="px-4 py-3 font-medium text-sombre-400 text-xs uppercase tracking-wider">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody class="divide-y divide-sombre-800/50">
                    ${lignes}
                </tbody>
            </table>
        </div>`;
    }

    // --- Ligne de tableau ---
    function lignTableau(cellules, actionsHtml = '') {
        return `
        <tr class="hover:bg-sombre-800/30 transition">
            ${cellules.map(c => `<td class="px-4 py-3 text-sm text-sombre-100">${c}</td>`).join('')}
            ${actionsHtml ? `<td class="px-4 py-3">${actionsHtml}</td>` : ''}
        </tr>`;
    }

    // --- Badge ---
    function badge(texte, couleur = 'gris') {
        const cls = {
            vert: 'bg-green-500/20 text-green-400 border border-green-500/20',
            rouge: 'bg-red-500/20 text-red-400 border border-red-500/20',
            orange: 'bg-amber-500/20 text-amber-400 border border-amber-500/20',
            bleu: 'bg-primaire-500/20 text-primaire-400 border border-primaire-500/20',
            gris: 'bg-sombre-700 text-sombre-300 border border-sombre-600',
            violet: 'bg-purple-500/20 text-purple-400 border border-purple-500/20',
            cyan: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20',
        };
        return `<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cls[couleur] || cls.gris}">${texte}</span>`;
    }

    // --- Bouton ---
    function bouton(texte, onclick, variante = 'primaire', taille = 'sm') {
        const variantes = {
            primaire: 'bg-primaire-600 hover:bg-primaire-700 text-white shadow-sm shadow-primaire-600/20',
            secondaire: 'bg-sombre-700 hover:bg-sombre-600 text-sombre-100 border border-sombre-600',
            danger: 'bg-red-600/90 hover:bg-red-600 text-white',
            succes: 'bg-green-600/90 hover:bg-green-600 text-white',
            fantome: 'hover:bg-sombre-800 text-sombre-300 hover:text-white',
        };
        const tailles = { xs: 'px-2 py-1 text-[11px]', sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
        return `<button onclick="${onclick}" class="${variantes[variante] || variantes.primaire} ${tailles[taille] || tailles.sm} rounded-lg font-medium transition-all duration-200 whitespace-nowrap">${texte}</button>`;
    }

    // --- Champ de formulaire ---
    function champForm(id, label, type = 'text', options = {}) {
        const valeur = options.valeur || '';
        if (type === 'select') {
            const opts = (options.options || []).map(o =>
                `<option value="${o.valeur}" ${valeur === o.valeur ? 'selected' : ''}>${o.label}</option>`
            ).join('');
            return `<div class="mb-4">
                <label for="${id}" class="block text-xs font-medium text-sombre-300 mb-1.5">${label}</label>
                <select id="${id}" class="w-full px-3 py-2.5 bg-sombre-800 border border-sombre-700 rounded-lg text-sm text-white focus:border-primaire-500 focus:ring-1 focus:ring-primaire-500/30 focus:outline-none transition">
                    <option value="">${options.placeholder || 'Sélectionner...'}</option>${opts}
                </select>
            </div>`;
        }
        if (type === 'textarea') {
            return `<div class="mb-4">
                <label for="${id}" class="block text-xs font-medium text-sombre-300 mb-1.5">${label}</label>
                <textarea id="${id}" rows="${options.lignes || 3}" placeholder="${options.placeholder || ''}" class="w-full px-3 py-2.5 bg-sombre-800 border border-sombre-700 rounded-lg text-sm text-white focus:border-primaire-500 focus:ring-1 focus:ring-primaire-500/30 focus:outline-none resize-none transition">${valeur}</textarea>
            </div>`;
        }
        return `<div class="mb-4">
            <label for="${id}" class="block text-xs font-medium text-sombre-300 mb-1.5">${label}</label>
            <input type="${type}" id="${id}" value="${valeur}" placeholder="${options.placeholder || ''}" class="w-full px-3 py-2.5 bg-sombre-800 border border-sombre-700 rounded-lg text-sm text-white focus:border-primaire-500 focus:ring-1 focus:ring-primaire-500/30 focus:outline-none transition" ${options.obligatoire ? 'required' : ''}>
        </div>`;
    }

    // --- Barre de recherche ---
    function barreRecherche(id, placeholder, onInputFn) {
        return `
        <div class="relative">
            <svg class="w-4 h-4 text-sombre-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="${id}" placeholder="${placeholder}" oninput="${onInputFn}" class="w-full sm:w-64 pl-10 pr-4 py-2 bg-sombre-800 border border-sombre-700 rounded-lg text-sm text-white placeholder-sombre-400 focus:border-primaire-500 focus:outline-none transition">
        </div>`;
    }

    // --- Graphique en barres (CSS pur) ---
    function graphiqueBarres(donnees, hauteur = 200) {
        if (!donnees || donnees.length === 0) return etatVide('Aucune donnée.');
        const maxVal = Math.max(...donnees.map(d => d.valeur), 1);
        const barres = donnees.map(d => {
            const pourcentage = (d.valeur / maxVal) * 100;
            return `
            <div class="flex flex-col items-center flex-1 min-w-0">
                <div class="w-full flex flex-col items-center justify-end" style="height:${hauteur}px">
                    <span class="text-[10px] text-sombre-300 mb-1 font-medium">${formaterMontant(d.valeur)}</span>
                    <div class="w-full max-w-[40px] bg-primaire-600/80 rounded-t-md graphique-barre" style="height:${Math.max(pourcentage, 2)}%"></div>
                </div>
                <span class="text-[10px] text-sombre-400 mt-2 text-center truncate w-full">${d.label}</span>
            </div>`;
        }).join('');
        return `<div class="flex items-end gap-2 px-2">${barres}</div>`;
    }

    // --- Modal ---
    function modal(titre, contenu, taille = 'lg') {
        fermerModal();
        const tailles = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };
        const el = document.createElement('div');
        el.id = 'admin-modal';
        el.className = 'fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
        el.innerHTML = `
        <div class="bg-sombre-900 border border-sombre-800 rounded-2xl w-full ${tailles[taille] || tailles.lg} max-h-[90vh] overflow-y-auto fondu-entree">
            <div class="sticky top-0 bg-sombre-900 px-5 py-4 flex items-center justify-between border-b border-sombre-800 z-10 rounded-t-2xl">
                <h3 class="font-semibold text-base text-white">${titre}</h3>
                <button onclick="AdminComposants.fermerModal()" class="p-1.5 rounded-lg hover:bg-sombre-800 transition text-sombre-400 hover:text-white">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="p-5">${contenu}</div>
        </div>`;
        el.addEventListener('click', (e) => { if (e.target === el) fermerModal(); });
        document.body.appendChild(el);
    }

    function fermerModal() {
        const el = document.getElementById('admin-modal');
        if (el) el.remove();
    }

    // --- Confirmation ---
    function confirmer(message, onConfirmer) {
        modal('Confirmation', `
            <p class="text-sm text-sombre-200 mb-6">${message}</p>
            <div class="flex justify-end gap-3">
                ${bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'md')}
                ${bouton('Confirmer', onConfirmer, 'danger', 'md')}
            </div>
        `, 'sm');
    }

    // --- Panneau / Carte ---
    function panneau(titre, contenu, icone = '') {
        return `
        <div class="bg-sombre-900 border border-sombre-800 rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-sombre-800 flex items-center gap-2">
                ${icone ? `<span class="text-sombre-400">${icone}</span>` : ''}
                <h3 class="text-sm font-semibold text-white">${titre}</h3>
            </div>
            <div class="p-5">${contenu}</div>
        </div>`;
    }

    // --- Onglets ---
    function onglets(id, liste, onClickFn) {
        const boutons = liste.map((o, i) =>
            `<button data-onglet="${o.cle}" onclick="${onClickFn}('${o.cle}')" class="onglet-btn px-4 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap ${i === 0 ? 'bg-primaire-600 text-white' : 'text-sombre-300 hover:bg-sombre-800'}">${o.label}</button>`
        ).join('');
        return `<div id="${id}" class="flex gap-1 bg-sombre-800/50 p-1 rounded-xl overflow-x-auto">${boutons}</div>`;
    }

    function activerOnglet(conteneurId, cle) {
        const conteneur = document.getElementById(conteneurId);
        if (!conteneur) return;
        conteneur.querySelectorAll('.onglet-btn').forEach(btn => {
            if (btn.dataset.onglet === cle) {
                btn.className = btn.className.replace('text-sombre-300 hover:bg-sombre-800', 'bg-primaire-600 text-white');
            } else {
                btn.className = btn.className.replace('bg-primaire-600 text-white', 'text-sombre-300 hover:bg-sombre-800');
            }
        });
    }

    // --- Formater montant ---
    function formaterMontant(valeur) {
        if (valeur >= 1000000) return `${(valeur / 1000000).toFixed(1)}M`;
        if (valeur >= 1000) return `${(valeur / 1000).toFixed(1)}k`;
        return Number(valeur).toLocaleString('fr-FR');
    }

    // --- Formater date ---
    function formaterDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formaterDateHeure(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // --- Avatar initiales ---
    function avatar(nom, taille = 'md') {
        const initiale = (nom || 'U').charAt(0).toUpperCase();
        const tailles = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-base' };
        return `<div class="${tailles[taille] || tailles.md} rounded-full bg-primaire-600/80 flex items-center justify-center text-white font-bold flex-shrink-0">${initiale}</div>`;
    }

    // --- Filtre select inline ---
    function filtreSelect(id, label, options, onChangeFn, valeurActuelle = '') {
        const opts = options.map(o =>
            `<option value="${o.valeur}" ${valeurActuelle === o.valeur ? 'selected' : ''}>${o.label}</option>`
        ).join('');
        return `<select id="${id}" onchange="${onChangeFn}" class="px-3 py-2 bg-sombre-800 border border-sombre-700 rounded-lg text-xs text-white focus:border-primaire-500 focus:outline-none transition">
            <option value="">${label}</option>${opts}
        </select>`;
    }

    // --- Barre d'outils de liste ---
    function barreOutils(options = {}) {
        let html = '<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">';
        if (options.recherche) {
            html += barreRecherche(options.recherche.id, options.recherche.placeholder, options.recherche.onInput);
        }
        if (options.filtres && options.filtres.length) {
            options.filtres.forEach(f => {
                html += filtreSelect(f.id, f.label, f.options, f.onChange, f.valeur);
            });
        }
        html += '<div class="flex items-center gap-2 ml-auto">';
        if (options.compteur !== undefined) html += compteurResultats(options.compteur, options.labelCompteur);
        if (options.onRecharger) html += boutonRecharger(options.onRecharger);
        html += '</div></div>';
        return html;
    }

    // --- Pagination ---
    function pagination(pageActuelle, totalPages, onPageFn) {
        if (totalPages <= 1) return '';
        let html = '<div class="flex items-center justify-center gap-1 mt-6">';
        html += `<button onclick="${onPageFn}(${pageActuelle - 1})" ${pageActuelle <= 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs ${pageActuelle <= 1 ? 'text-sombre-600 cursor-not-allowed' : 'text-sombre-300 hover:bg-sombre-800 hover:text-white'} transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>`;

        const debut = Math.max(1, pageActuelle - 2);
        const fin = Math.min(totalPages, pageActuelle + 2);
        if (debut > 1) {
            html += `<button onclick="${onPageFn}(1)" class="px-3 py-1.5 rounded-lg text-xs text-sombre-300 hover:bg-sombre-800 transition">1</button>`;
            if (debut > 2) html += '<span class="text-sombre-600 px-1">...</span>';
        }
        for (let i = debut; i <= fin; i++) {
            const actif = i === pageActuelle;
            html += `<button onclick="${onPageFn}(${i})" class="px-3 py-1.5 rounded-lg text-xs font-medium transition ${actif ? 'bg-primaire-600 text-white' : 'text-sombre-300 hover:bg-sombre-800'}">${i}</button>`;
        }
        if (fin < totalPages) {
            if (fin < totalPages - 1) html += '<span class="text-sombre-600 px-1">...</span>';
            html += `<button onclick="${onPageFn}(${totalPages})" class="px-3 py-1.5 rounded-lg text-xs text-sombre-300 hover:bg-sombre-800 transition">${totalPages}</button>`;
        }

        html += `<button onclick="${onPageFn}(${pageActuelle + 1})" ${pageActuelle >= totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs ${pageActuelle >= totalPages ? 'text-sombre-600 cursor-not-allowed' : 'text-sombre-300 hover:bg-sombre-800 hover:text-white'} transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>`;
        html += '</div>';
        return html;
    }

    // --- Debounce ---
    const _timers = {};
    function debounce(cleOuFn, fnOuDelai, delai = 400) {
        if (typeof cleOuFn === 'function') {
            let timer = null;
            const d = typeof fnOuDelai === 'number' ? fnOuDelai : 400;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => cleOuFn(...args), d);
            };
        }
        clearTimeout(_timers[cleOuFn]);
        _timers[cleOuFn] = setTimeout(fnOuDelai, delai);
    }

    // --- Info page résultats ---
    function infoPagination(page, parPage, total) {
        if (total === 0) return '';
        const debut = (page - 1) * parPage + 1;
        const fin = Math.min(page * parPage, total);
        return `<p class="text-xs text-sombre-400 mt-2 text-center">${debut}-${fin} sur ${total}</p>`;
    }

    return {
        toast, loader, loaderInline, etatVide, etatErreur,
        boutonRecharger, compteurResultats,
        carteStatistique, kpi, sectionTitre,
        tableau, lignTableau, badge, bouton, champForm, barreRecherche,
        filtreSelect, barreOutils, pagination, infoPagination,
        graphiqueBarres, modal, fermerModal, confirmer, panneau,
        onglets, activerOnglet, formaterMontant, formaterDate,
        formaterDateHeure, avatar, debounce,
    };
})();
