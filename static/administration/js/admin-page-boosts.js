/**
 * Module Page Boosts - EsikaTok Administration.
 * Liste vidéos boostées, durée, performance, activation/suspension.
 */
const PageBoosts = (() => {

    let donnees = { resultats: [], total: 0 };
    let filtreSource = '';
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
            if (filtreSource) params.source = filtreSource;
            if (recherche) params.q = recherche;
            const brut = await AdminApi.boostsAdmin.liste(params);
            donnees = AdminApi.normaliserListe(brut);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les boosts.',
                'PageBoosts.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        const ongletsHtml = C.onglets('onglets-boosts', [
            { cle: '', label: 'Tous' },
            { cle: 'abonnement', label: 'Abonnement' },
            { cle: 'achat', label: 'Achat ($1)' },
        ], 'PageBoosts.filtrer');

        const couleurStatut = { actif: 'vert', expire: 'gris', suspendu: 'rouge', annule: 'rouge' };

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="8" class="text-center py-8 text-sombre-400 text-sm">Aucun boost trouvé.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(b => {
                const dureeJours = b.date_debut && b.date_fin
                    ? Math.ceil((new Date(b.date_fin) - new Date(b.date_debut)) / (1000 * 60 * 60 * 24))
                    : 'N/A';

                return C.lignTableau([
                    `<span class="text-white text-xs font-medium">${b.video_titre || b.video || '#' + b.id}</span>`,
                    `<span class="text-xs">${b.agent_nom || b.agent || 'N/A'}</span>`,
                    C.badge(b.source === 'abonnement' ? 'Abonnement' : 'Achat $1', b.source === 'abonnement' ? 'bleu' : 'orange'),
                    C.badge(b.statut, couleurStatut[b.statut] || 'gris'),
                    `<span class="text-xs">${dureeJours}j</span>`,
                    `<span class="text-xs text-sombre-300">${b.impressions || 0} imp. / ${b.clics || 0} clics</span>`,
                    C.formaterDate(b.date_debut),
                ], `<div class="flex gap-1">
                    ${AdminApp.aPermission('boosts', 'modifier') && b.statut === 'actif' ? C.bouton('Suspendre', `PageBoosts.action(${b.id},'suspendre')`, 'danger', 'xs') : ''}
                    ${AdminApp.aPermission('boosts', 'modifier') && b.statut === 'suspendu' ? C.bouton('Réactiver', `PageBoosts.action(${b.id},'reactiver')`, 'succes', 'xs') : ''}
                </div>`);
            }).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gestion des boosts', `${donnees.total} boost(s)`,
                C.boutonRecharger('PageBoosts.chargerDonnees()')
            )}
            <div class="mb-4">${C.barreRecherche('recherche-boosts', 'Rechercher par vidéo ou agent...', 'PageBoosts.rechercher(this.value)')}</div>
            <div class="mb-4">${ongletsHtml}</div>
            ${C.tableau(['Vidéo', 'Agent', 'Source', 'Statut', 'Durée', 'Performance', 'Début'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageBoosts.allerPage')}
            ${C.infoPagination(pageActuelle, PAR_PAGE, donnees.total)}
        </div>`;

        C.activerOnglet('onglets-boosts', filtreSource);

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

    async function filtrer(source) {
        filtreSource = source;
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
            await AdminApi.boostsAdmin.action(id, act);
            AdminComposants.toast(act === 'suspendre' ? 'Boost suspendu.' : 'Boost réactivé.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur', 'erreur');
        }
    }

    return { afficher, chargerDonnees, rechercher, filtrer, allerPage, action };
})();
