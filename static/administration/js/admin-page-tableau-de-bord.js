/**
 * Module Page Tableau de Bord - EsikaTok Administration.
 * Tableau de bord dynamique par rôle : chaque admin voit uniquement
 * les indicateurs liés à ses responsabilités (RBAC strict).
 */
const PageTableauDeBord = (() => {

    const ICONES = {
        utilisateurs: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
        agents: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
        biens: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
        attente: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        revenus: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        boosts: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
        abonnements: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>',
        moderation: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        messagerie: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
        admins: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
        annonces: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>',
        preoccupations: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        alerte: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
        resume: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
    };

    async function afficher() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();

        try {
            const d = await AdminApi.tableauDeBord.parRole();
            const C = AdminComposants;
            const role = d.role;
            const sections = [];

            // --- Alertes contextuelles ---
            const alertes = [];
            if (d.moderation && (d.moderation.en_attente || 0) > 0)
                alertes.push({ texte: `${d.moderation.en_attente} vidéo(s) en attente de modération`, type: 'attention' });
            if (d.moderation && (d.moderation.videos_supprimees || 0) > 0)
                alertes.push({ texte: `${d.moderation.videos_supprimees} vidéo(s) dans l'historique de suppression`, type: 'info' });
            if (d.abonnements && (d.abonnements.essais || 0) > 5)
                alertes.push({ texte: `${d.abonnements.essais} comptes en période d'essai`, type: 'info' });
            if (d.preoccupations && (d.preoccupations.en_attente || 0) > 0)
                alertes.push({ texte: `${d.preoccupations.en_attente} préoccupation(s) en attente de traitement`, type: 'attention' });

            if (alertes.length) {
                sections.push(`<div class="mb-6 space-y-2">${alertes.map(a => {
                    const cls = a.type === 'attention' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-primaire-500/10 border-primaire-500/20 text-primaire-400';
                    return `<div class="flex items-center gap-3 px-4 py-3 rounded-xl border ${cls}">${ICONES.alerte}<span class="text-sm font-medium">${a.texte}</span></div>`;
                }).join('')}</div>`);
            }

            // --- Cartes KPI principales (selon données dispo) ---
            const cartes = [];
            if (d.moderation) {
                cartes.push(C.carteStatistique('En attente', d.moderation.en_attente || 0, ICONES.attente, 'orange'));
                cartes.push(C.carteStatistique('Approuvées', d.moderation.approuvee || 0, ICONES.moderation, 'vert'));
                cartes.push(C.carteStatistique('Refusées', d.moderation.refusee || 0, ICONES.moderation, 'rouge'));
                cartes.push(C.carteStatistique('Supprimées', d.moderation.videos_supprimees || 0, ICONES.moderation, 'violet'));
            }
            if (d.utilisateurs) cartes.push(C.carteStatistique('Utilisateurs', d.utilisateurs.total || 0, ICONES.utilisateurs, 'primaire'));
            if (d.agents) cartes.push(C.carteStatistique('Agents', d.agents.total || 0, ICONES.agents, 'vert'));
            if (d.biens) cartes.push(C.carteStatistique('Biens publiés', d.biens.publies || 0, ICONES.biens, 'violet'));
            if (d.abonnements) cartes.push(C.carteStatistique('Abonnements actifs', d.abonnements.actifs || 0, ICONES.abonnements, 'orange'));
            if (d.boosts) cartes.push(C.carteStatistique('Boosts actifs', d.boosts.actifs || 0, ICONES.boosts, 'primaire'));
            if (d.messagerie) cartes.push(C.carteStatistique('Conversations', d.messagerie.conversations || 0, ICONES.messagerie, 'vert'));
            if (d.annonces) cartes.push(C.carteStatistique('Annonces', d.annonces.total || 0, ICONES.annonces, 'violet'));
            if (d.preoccupations) cartes.push(C.carteStatistique('Préoccupations', d.preoccupations.en_attente || 0, ICONES.preoccupations, 'orange'));
            if (d.administrateurs) cartes.push(C.carteStatistique('Admins en ligne', d.administrateurs.en_ligne || 0, ICONES.admins, 'primaire'));

            if (cartes.length) {
                const cols = cartes.length >= 4 ? 'lg:grid-cols-4' : cartes.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
                sections.push(`<div class="grid grid-cols-2 ${cols} gap-3 mb-6">${cartes.join('')}</div>`);
            }

            // --- Revenus (si autorisé) ---
            if (d.revenus) {
                sections.push(`<div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
                    ${C.carteStatistique('Revenu total', '$' + C.formaterMontant(d.revenus.total_usd || 0), ICONES.revenus, 'vert')}
                    ${C.carteStatistique('Ce mois', '$' + C.formaterMontant(d.revenus.ce_mois_usd || 0), ICONES.boosts, 'primaire')}
                </div>`);
            }

            // --- Panneaux détaillés ---
            const panneaux = [];

            if (d.moderation) {
                panneaux.push(C.panneau('Modération',
                    `<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                        <div><p class="text-2xl font-bold text-amber-400">${d.moderation.en_attente || 0}</p><p class="text-[11px] text-sombre-400">En attente</p></div>
                        <div><p class="text-2xl font-bold text-green-400">${d.moderation.approuvee || 0}</p><p class="text-[11px] text-sombre-400">Approuvées</p></div>
                        <div><p class="text-2xl font-bold text-red-400">${d.moderation.refusee || 0}</p><p class="text-[11px] text-sombre-400">Refusées</p></div>
                        <div><p class="text-2xl font-bold text-purple-400">${d.moderation.suspendue || 0}</p><p class="text-[11px] text-sombre-400">Suspendues</p></div>
                        <div><p class="text-2xl font-bold text-rose-400">${d.moderation.videos_supprimees || 0}</p><p class="text-[11px] text-sombre-400">Vidéos supprimées</p></div>
                        <div><p class="text-2xl font-bold text-blue-400">${d.moderation.traitees_ce_mois || 0}</p><p class="text-[11px] text-sombre-400">Traitées ce mois</p></div>
                    </div>`, ICONES.moderation));
            }

            if (d.biens) {
                panneaux.push(C.panneau('Biens immobiliers',
                    `<div class="space-y-3">
                        <div class="flex justify-between text-sm"><span class="text-sombre-400">Total</span><span class="text-white font-medium">${d.biens.total || 0}</span></div>
                        <div class="flex justify-between text-sm"><span class="text-sombre-400">Publiés</span><span class="text-green-400 font-medium">${d.biens.publies || 0}</span></div>
                        <div class="flex justify-between text-sm"><span class="text-sombre-400">En attente</span><span class="text-amber-400 font-medium">${d.biens.en_attente || 0}</span></div>
                        <div class="flex justify-between text-sm"><span class="text-sombre-400">Refusés</span><span class="text-red-400 font-medium">${d.biens.refuses || 0}</span></div>
                        <div class="flex justify-between text-sm"><span class="text-sombre-400">Suspendus</span><span class="text-orange-400 font-medium">${d.biens.suspendus || 0}</span></div>
                    </div>`, ICONES.resume));
            }

            if (panneaux.length) {
                sections.push(`<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">${panneaux.join('')}</div>`);
            }

            // --- Mes activités récentes ---
            if (d.mes_activites && d.mes_activites.length) {
                const lignes = d.mes_activites.map(a => `
                    <div class="flex items-start gap-3 py-2.5 border-b border-sombre-800/50 last:border-0">
                        <div class="w-2 h-2 rounded-full bg-primaire-500 mt-1.5 flex-shrink-0"></div>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm text-white">${a.action}</p>
                            <p class="text-[11px] text-sombre-400 truncate">${a.detail || ''}</p>
                        </div>
                        <span class="text-[10px] text-sombre-500 flex-shrink-0 whitespace-nowrap">${C.formaterDate ? C.formaterDate(a.date) : new Date(a.date).toLocaleString('fr-FR')}</span>
                    </div>`).join('');
                sections.push(C.panneau('Mes activités récentes', `<div class="max-h-72 overflow-y-auto">${lignes}</div>`, ICONES.attente));
            }

            contenu.innerHTML = `
            <div class="fondu-entree">
                ${C.sectionTitre('Tableau de bord', d.role_label || 'Administration EsikaTok',
                    C.boutonRecharger('PageTableauDeBord.afficher()')
                )}
                ${sections.join('')}
            </div>`;

        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger le tableau de bord. Vérifiez votre connexion.',
                'PageTableauDeBord.afficher()'
            );
        }
    }

    return { afficher };
})();
