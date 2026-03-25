/**
 * Module Page Abonnements - EsikaTok Administration.
 * Plans, liste abonnements, paiements, actions activer/suspendre/modifier.
 */
const PageAbonnements = (() => {

    let donnees = { resultats: [], total: 0 };
    let filtreStatut = '';
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
            if (filtreStatut) params.statut = filtreStatut;
            if (recherche) params.q = recherche;
            const brut = await AdminApi.abonnements.liste(params);
            donnees = AdminApi.normaliserListe(brut);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les abonnements.',
                'PageAbonnements.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        const ongletsHtml = C.onglets('onglets-abonnements', [
            { cle: '', label: 'Tous' },
            { cle: 'actif', label: 'Actifs' },
            { cle: 'essai', label: 'Essai gratuit' },
            { cle: 'expire', label: 'Expirés' },
        ], 'PageAbonnements.filtrer');

        const plansHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div class="bg-gradient-to-br from-primaire-600/20 to-primaire-600/5 border border-primaire-600/30 rounded-xl p-4">
                <h4 class="text-sm font-bold text-white mb-1">Standard</h4>
                <p class="text-sombre-400 text-[11px] mb-2">10 vidéos / 5 boosts auto</p>
                <p class="text-primaire-400 font-bold">Tarif de base</p>
            </div>
            <div class="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-600/30 rounded-xl p-4">
                <h4 class="text-sm font-bold text-white mb-1">Pro</h4>
                <p class="text-sombre-400 text-[11px] mb-2">20 vidéos / 10 boosts auto</p>
                <p class="text-purple-400 font-bold">Intermédiaire</p>
            </div>
            <div class="bg-gradient-to-br from-amber-600/20 to-amber-600/5 border border-amber-600/30 rounded-xl p-4">
                <h4 class="text-sm font-bold text-white mb-1">Premium</h4>
                <p class="text-sombre-400 text-[11px] mb-2">Illimité</p>
                <p class="text-amber-400 font-bold">Tout inclus</p>
            </div>
        </div>`;

        const couleurStatut = { actif: 'vert', essai: 'orange', expire: 'gris', suspendu: 'rouge', annule: 'rouge' };
        const couleurPlan = { standard: 'bleu', pro: 'violet', premium: 'orange' };

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="7" class="text-center py-8 text-sombre-400 text-sm">Aucun abonnement trouvé.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(a => {
                const plan = a.plan_detail || {};
                return C.lignTableau([
                    `<span class="text-xs">#${a.id}</span>`,
                    `<span class="text-white text-xs">${a.agent || 'N/A'}</span>`,
                    C.badge(plan.nom || 'N/A', couleurPlan[plan.nom] || 'gris'),
                    C.badge(a.statut, couleurStatut[a.statut] || 'gris'),
                    a.est_essai_gratuit ? C.badge('Essai', 'cyan') : C.badge('Payé', 'vert'),
                    `<span class="text-xs">${C.formaterDate(a.date_debut)} → ${C.formaterDate(a.date_fin)}</span>`,
                ], `<div class="flex gap-1">
                    ${AdminApp.aPermission('abonnements', 'modifier') && (a.statut === 'actif' || a.statut === 'essai') ? C.bouton('Suspendre', `PageAbonnements.action(${a.id},'suspendre')`, 'danger', 'xs') : ''}
                    ${AdminApp.aPermission('abonnements', 'modifier') && a.statut === 'suspendu' ? C.bouton('Activer', `PageAbonnements.action(${a.id},'activer')`, 'succes', 'xs') : ''}
                </div>`);
            }).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gestion des abonnements', `${donnees.total} abonnement(s)`,
                C.boutonRecharger('PageAbonnements.chargerDonnees()')
            )}
            <div class="mb-4">${C.barreRecherche('recherche-abonnements', 'Rechercher par agent ou plan...', 'PageAbonnements.rechercher(this.value)')}</div>
            ${plansHtml}
            <div class="mb-4">${ongletsHtml}</div>
            ${C.tableau(['#', 'Agent', 'Plan', 'Statut', 'Type', 'Période'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageAbonnements.allerPage')}
            ${C.infoPagination(pageActuelle, PAR_PAGE, donnees.total)}
        </div>`;

        C.activerOnglet('onglets-abonnements', filtreStatut);

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

    async function filtrer(statut) {
        filtreStatut = statut;
        pageActuelle = 1;
        await chargerDonnees();
    }

    async function allerPage(page) {
        if (page < 1) return;
        pageActuelle = page;
        await chargerDonnees();
    }

    async function action(id, act) {
        try {
            await AdminApi.abonnements.action(id, { action: act });
            AdminComposants.toast(act === 'activer' ? 'Abonnement activé.' : 'Abonnement suspendu.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur', 'erreur');
        }
    }

    return { afficher, chargerDonnees, rechercher, filtrer, allerPage, action };
})();
