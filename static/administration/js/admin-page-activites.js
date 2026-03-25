/**
 * Module Page Activités / Logs - EsikaTok Administration.
 * Historique connexions, actions, durée, détails profil admin.
 */
const PageActivites = (() => {

    let ongletActif = 'connexions';
    let donnees = { resultats: [], total: 0 };
    let pageActuelle = 1;
    let recherche = '';
    const PAR_PAGE = 20;

    async function afficher() {
        ongletActif = 'connexions';
        pageActuelle = 1;
        recherche = '';
        await chargerDonnees();
    }

    async function chargerDonnees() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();

        try {
            const params = { page: pageActuelle };
            if (ongletActif === 'activites' && recherche) params.q = recherche;
            let brut;
            if (ongletActif === 'connexions') {
                brut = await AdminApi.logs.connexions(params);
            } else {
                brut = await AdminApi.logs.activites(params);
            }
            donnees = AdminApi.normaliserListe(brut);
            renduPage();
        } catch (e) {
            const contenu = document.getElementById('admin-contenu');
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Accès refusé ou chargement impossible.',
                'PageActivites.afficher()'
            );
        }
    }

    function renduPage() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        const ongletsHtml = C.onglets('onglets-logs', [
            { cle: 'connexions', label: 'Connexions' },
            { cle: 'activites', label: 'Actions' },
        ], 'PageActivites.changerOnglet');

        let contenuOnglet = '';
        if (ongletActif === 'connexions') {
            contenuOnglet = renduConnexions(donnees.resultats);
        } else {
            contenuOnglet = renduActivites(donnees.resultats);
        }

        const rechercheHtml = ongletActif === 'activites'
            ? `<div class="mb-4">${C.barreRecherche('recherche-activites', 'Rechercher une action ou un admin...', 'PageActivites.rechercher(this.value)')}</div>`
            : '';

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Activités & Logs', `${donnees.total} entrée(s)`,
                C.boutonRecharger('PageActivites.chargerDonnees()')
            )}
            <div class="mb-4">${ongletsHtml}</div>
            ${rechercheHtml}
            <div id="contenu-logs">${contenuOnglet}</div>
            ${C.pagination(pageActuelle, totalPages, 'PageActivites.allerPage')}
            ${C.infoPagination(pageActuelle, PAR_PAGE, donnees.total)}
        </div>`;

        C.activerOnglet('onglets-logs', ongletActif);

        if (recherche && ongletActif === 'activites') {
            const input = contenu.querySelector('input[type="text"]');
            if (input) input.value = recherche;
        }
    }

    async function changerOnglet(cle) {
        ongletActif = cle;
        pageActuelle = 1;
        recherche = '';
        await chargerDonnees();
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

    function renduConnexions(logs) {
        const C = AdminComposants;
        if (!logs || logs.length === 0) return C.etatVide('Aucune connexion enregistrée.');

        const lignes = logs.map(l => C.lignTableau([
            `<div class="flex items-center gap-2">${C.avatar(l.admin_nom, 'sm')}<div><p class="text-white text-xs font-medium">${l.admin_nom}</p><p class="text-sombre-400 text-[11px]">${l.admin_matricule || ''}</p></div></div>`,
            C.badge(l.admin_role || 'N/A', 'bleu'),
            C.formaterDateHeure(l.heure_connexion),
            l.heure_deconnexion ? C.formaterDateHeure(l.heure_deconnexion) : C.badge('En cours', 'vert'),
            l.duree_minutes ? `<span class="font-medium">${l.duree_minutes}</span> <span class="text-sombre-400">min</span>` : '-',
            `<span class="text-xs font-mono text-sombre-400">${l.ip || 'N/A'}</span>`,
        ])).join('');

        return C.tableau(['Admin', 'Rôle', 'Connexion', 'Déconnexion', 'Durée', 'IP'], lignes);
    }

    function renduActivites(logs) {
        const C = AdminComposants;
        if (!logs || logs.length === 0) return C.etatVide('Aucune activité enregistrée.');

        const lignes = logs.map(l => C.lignTableau([
            `<div class="flex items-center gap-2">${C.avatar(l.admin_nom, 'sm')}<span class="text-white text-xs font-medium">${l.admin_nom}</span></div>`,
            `<span class="text-white text-xs">${l.action}</span>`,
            `<span class="text-sombre-300 text-xs truncate max-w-[200px] inline-block">${l.detail || '-'}</span>`,
            l.objet_type ? C.badge(l.objet_type, 'gris') : '-',
            C.formaterDateHeure(l.date_action),
        ])).join('');

        return C.tableau(['Admin', 'Action', 'Détail', 'Objet', 'Date'], lignes);
    }

    return { afficher, chargerDonnees, changerOnglet, rechercher, allerPage };
})();
