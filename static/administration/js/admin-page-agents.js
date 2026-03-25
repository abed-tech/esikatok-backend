/**
 * Module Page Agents - EsikaTok Administration.
 * Liste agents, profil, abonnement, vidéos, revenus, activation/suspension.
 */
const PageAgents = (() => {

    let donnees = { resultats: [], total: 0 };
    let recherche = '';
    let pageActuelle = 1;
    const PAR_PAGE = 20;

    async function afficher() {
        pageActuelle = 1;
        recherche = '';
        await chargerDonnees();
    }

    async function chargerDonnees() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();
        try {
            const params = { page: pageActuelle };
            if (recherche) params.q = recherche;
            const brut = await AdminApi.agents.liste(params);
            donnees = AdminApi.normaliserListe(brut);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les agents.',
                'PageAgents.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="7" class="text-center py-8 text-sombre-400 text-sm">Aucun agent trouvé.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(a => {
                const aboInfo = a.abonnement
                    ? C.badge(a.abonnement.plan.charAt(0).toUpperCase() + a.abonnement.plan.slice(1), a.abonnement.statut === 'actif' ? 'vert' : 'orange')
                    : C.badge('Aucun', 'gris');

                const btnAction = AdminApp.aPermission('agents', 'modifier') ? (a.est_actif
                    ? C.bouton('Suspendre', `PageAgents.action(${a.id},'suspendre')`, 'danger', 'xs')
                    : C.bouton('Activer', `PageAgents.action(${a.id},'activer')`, 'succes', 'xs')) : '';
                return C.lignTableau([
                    `<div class="flex items-center gap-2">${C.avatar(a.prenom || a.nom, 'sm')}<div><p class="text-white text-xs font-medium">${a.prenom || ''} ${a.nom || ''}</p><p class="text-sombre-400 text-[11px]">${a.nom_professionnel || a.email}</p></div></div>`,
                    `<span class="text-xs">${a.email}</span>`,
                    aboInfo,
                    `<span class="font-medium">${a.nombre_biens_publies || 0}</span> <span class="text-sombre-400">/ ${a.nombre_biens || 0}</span>`,
                    C.badge(a.est_actif ? 'Actif' : 'Suspendu', a.est_actif ? 'vert' : 'rouge'),
                    C.formaterDate(a.date_inscription),
                ], `<div class="flex gap-1">
                    ${C.bouton('Profil', `PageAgents.voirDetail(${a.id})`, 'secondaire', 'xs')}
                    ${btnAction}
                </div>`);
            }).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gestion des agents', `${donnees.total} agent(s) immobilier(s)`,
                C.boutonRecharger('PageAgents.chargerDonnees()')
            )}
            <div class="mb-4">${C.barreRecherche('recherche-agents', 'Rechercher un agent par nom, prénom ou email...', 'PageAgents.rechercher(this.value)')}</div>
            ${C.tableau(['Agent', 'Email', 'Abonnement', 'Biens', 'Statut', 'Inscription'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageAgents.allerPage')}
            ${C.infoPagination(pageActuelle, PAR_PAGE, donnees.total)}
        </div>`;

        if (recherche) {
            const input = contenu.querySelector('input[type="text"]');
            if (input) input.value = recherche;
        }
    }

    const rechercher = AdminComposants.debounce((val) => {
        recherche = val;
        pageActuelle = 1;
        chargerDonnees();
    }, 400);

    async function allerPage(page) {
        if (page < 1) return;
        pageActuelle = page;
        await chargerDonnees();
    }

    async function voirDetail(id) {
        const C = AdminComposants;
        try {
            const a = await AdminApi.agents.detail(id);
            const profil = a.profil_agent || {};
            const abos = (a.abonnements || []).slice(0, 5);

            const biensHtml = (a.biens || []).map(b =>
                `<div class="flex items-center justify-between py-2 border-b border-sombre-800 last:border-0">
                    <div><p class="text-white text-xs font-medium">${b.titre}</p><p class="text-sombre-400 text-[11px]">${b.type_bien} - $${Number(b.prix).toLocaleString('fr-FR')}</p></div>
                    <div class="flex items-center gap-2">${C.badge(b.statut, b.statut === 'publie' ? 'vert' : b.statut === 'refuse' ? 'rouge' : 'gris')}<span class="text-sombre-400 text-[11px]">${b.nombre_vues || 0} vues</span></div>
                </div>`
            ).join('') || '<p class="text-sombre-400 text-sm">Aucun bien.</p>';

            const abosHtml = abos.map(ab =>
                `<div class="flex justify-between items-center py-2 border-b border-sombre-800 last:border-0">
                    <div><span class="text-white text-xs">${ab.plan_detail?.nom || 'N/A'}</span> ${C.badge(ab.statut, ab.statut === 'actif' ? 'vert' : ab.statut === 'essai' ? 'orange' : 'gris')}</div>
                    <span class="text-sombre-400 text-[11px]">${C.formaterDate(ab.date_debut)} → ${C.formaterDate(ab.date_fin)}</span>
                </div>`
            ).join('') || '<p class="text-sombre-400 text-sm">Aucun abonnement.</p>';

            const photoHtml = a.photo
                ? `<img src="${a.photo}" class="w-14 h-14 rounded-full object-cover border-2 border-sombre-700">`
                : C.avatar(a.prenom || a.nom, 'lg');

            C.modal('Profil agent', `
                <div class="flex items-center gap-3 mb-6">
                    ${photoHtml}
                    <div>
                        <p class="text-white font-semibold">${a.prenom || ''} ${a.postnom ? a.postnom + ' ' : ''}${a.nom || ''}</p>
                        <p class="text-sombre-400 text-sm">${profil.utilisateur?.email || a.email || ''}</p>
                        <p class="text-primaire-400 text-xs">${profil.nom_professionnel || ''}</p>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            ${C.badge(a.est_actif ? 'Actif' : 'Suspendu', a.est_actif ? 'vert' : 'rouge')}
                            ${C.badge(profil.est_verifie_agent ? 'Vérifié' : 'Non vérifié', profil.est_verifie_agent ? 'vert' : 'gris')}
                        </div>
                    </div>
                </div>

                <div class="space-y-2 bg-sombre-800/50 rounded-lg p-3 mb-4">
                    <p class="text-xs font-semibold text-sombre-300 uppercase tracking-wider mb-1">Coordonnées</p>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Téléphone</span><span class="text-white">${a.telephone || '-'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Bureau</span><span class="text-white">${profil.adresse_bureau || '-'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Licence</span><span class="text-white">${profil.numero_licence || '-'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Site web</span><span class="text-white">${profil.site_web ? `<a href="${profil.site_web}" target="_blank" class="text-primaire-400 hover:underline">${profil.site_web}</a>` : '-'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Inscrit le</span><span class="text-white">${C.formaterDate(a.date_inscription)}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Dernière connexion</span><span class="text-white">${C.formaterDateHeure(a.derniere_connexion) || 'Jamais'}</span></div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    ${C.carteStatistique('Biens', a.nombre_biens || 0, '', 'primaire')}
                    ${C.carteStatistique('Publiés', a.nombre_biens_publies || 0, '', 'vert')}
                    ${C.carteStatistique('Boosts', a.nombre_boosts || 0, '', 'violet')}
                    ${C.carteStatistique('Revenus', '$' + C.formaterMontant(a.revenus_generes || 0), '', 'orange')}
                </div>

                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-white mb-2">Abonnements</h4>
                    <div class="bg-sombre-800 rounded-lg p-3">${abosHtml}</div>
                </div>

                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-white mb-2">Biens immobiliers</h4>
                    <div class="bg-sombre-800 rounded-lg p-3 max-h-48 overflow-y-auto">${biensHtml}</div>
                </div>

                <div class="flex gap-2 justify-end">
                    ${AdminApp.aPermission('agents', 'modifier') ? (a.est_actif
                        ? C.bouton('Suspendre', `PageAgents.action(${a.id},'suspendre')`, 'danger', 'md')
                        : C.bouton('Activer', `PageAgents.action(${a.id},'activer')`, 'succes', 'md')) : ''}
                </div>
            `, 'xl');
        } catch (e) {
            C.toast('Erreur de chargement du profil', 'erreur');
        }
    }

    async function action(id, act) {
        try {
            await AdminApi.agents.action(id, act);
            AdminComposants.fermerModal();
            AdminComposants.toast(act === 'activer' ? 'Agent activé.' : 'Agent suspendu.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur', 'erreur');
        }
    }

    return { afficher, chargerDonnees, rechercher, allerPage, voirDetail, action };
})();
