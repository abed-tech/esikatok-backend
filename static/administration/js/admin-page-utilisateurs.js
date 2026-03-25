/**
 * Module Page Utilisateurs - EsikaTok Administration.
 * Liste comptes simples, recherche, détails, blocage/déblocage, suppression.
 */
const PageUtilisateurs = (() => {

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
            const params = { type: 'simple', page: pageActuelle };
            if (recherche) params.q = recherche;
            const brut = await AdminApi.utilisateurs.liste(params);
            donnees = AdminApi.normaliserListe(brut);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les utilisateurs.',
                'PageUtilisateurs.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="6" class="text-center py-8 text-sombre-400 text-sm">Aucun utilisateur trouvé.</td></tr>`;
        } else {
            const peutModifier = AdminApp.aPermission('utilisateurs', 'modifier');
            const peutSupprimer = AdminApp.aPermission('utilisateurs', 'supprimer');
            lignesHtml = donnees.resultats.map(u => {
                const btnStatut = peutModifier ? (u.est_actif
                    ? C.bouton('Bloquer', `PageUtilisateurs.changerStatut(${u.id},'desactiver')`, 'danger', 'xs')
                    : C.bouton('Débloquer', `PageUtilisateurs.changerStatut(${u.id},'activer')`, 'succes', 'xs')) : '';
                const btnSuppr = peutSupprimer ? C.bouton('Supprimer', `PageUtilisateurs.confirmerSuppression(${u.id},'${u.email}')`, 'fantome', 'xs') : '';
                return C.lignTableau([
                    `<div class="flex items-center gap-2">${C.avatar(u.prenom || u.nom, 'sm')}<div><p class="text-white text-xs font-medium">${u.prenom || ''} ${u.nom || ''}</p><p class="text-sombre-400 text-[11px]">${u.email}</p></div></div>`,
                    u.telephone || '-',
                    C.badge(u.est_actif ? 'Actif' : 'Bloqué', u.est_actif ? 'vert' : 'rouge'),
                    C.formaterDate(u.date_inscription),
                ], `<div class="flex gap-1">
                    ${C.bouton('Détails', `PageUtilisateurs.voirDetail(${u.id})`, 'secondaire', 'xs')}
                    ${btnStatut}
                    ${btnSuppr}
                </div>`);
            }).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gestion des utilisateurs', `${donnees.total} utilisateur(s)`,
                C.boutonRecharger('PageUtilisateurs.chargerDonnees()')
            )}
            <div class="mb-4">${C.barreRecherche('recherche-utilisateurs', 'Rechercher par nom, prénom, email ou téléphone...', 'PageUtilisateurs.rechercher(this.value)')}</div>
            ${C.tableau(['Utilisateur', 'Téléphone', 'Statut', 'Inscription'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageUtilisateurs.allerPage')}
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
            const data = await AdminApi.utilisateurs.detail(id);
            const photoHtml = data.photo
                ? `<img src="${data.photo}" class="w-14 h-14 rounded-full object-cover border-2 border-sombre-700">`
                : C.avatar(data.prenom || data.nom, 'lg');

            C.modal('Détails de l\'utilisateur', `
                <div class="flex items-center gap-3 mb-6">
                    ${photoHtml}
                    <div>
                        <p class="text-white font-semibold">${data.prenom || ''} ${data.postnom ? data.postnom + ' ' : ''}${data.nom || ''}</p>
                        <p class="text-sombre-400 text-sm">${data.email}</p>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            ${C.badge(data.type_compte, 'bleu')}
                            ${C.badge(data.est_actif ? 'Actif' : 'Bloqué', data.est_actif ? 'vert' : 'rouge')}
                            ${C.badge(data.est_verifie ? 'Vérifié' : 'Non vérifié', data.est_verifie ? 'vert' : 'gris')}
                        </div>
                    </div>
                </div>
                <div class="space-y-2.5 bg-sombre-800/50 rounded-lg p-4">
                    <p class="text-xs font-semibold text-sombre-300 uppercase tracking-wider mb-2">Informations personnelles</p>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Nom complet</span><span class="text-white">${data.prenom || ''} ${data.postnom || ''} ${data.nom || ''}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">E-mail</span><span class="text-white">${data.email}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Téléphone</span><span class="text-white">${data.telephone || '-'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Type de compte</span><span class="text-white">${data.type_compte}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Inscrit le</span><span class="text-white">${C.formaterDate(data.date_inscription)}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Dernière connexion</span><span class="text-white">${C.formaterDateHeure(data.derniere_connexion) || 'Jamais'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">ID utilisateur</span><span class="text-sombre-300 font-mono text-xs">#${data.id}</span></div>
                </div>
            `, 'lg');
        } catch (e) {
            C.toast('Erreur de chargement', 'erreur');
        }
    }

    async function changerStatut(id, action) {
        try {
            await AdminApi.utilisateurs.changerStatut(id, action);
            AdminComposants.toast(action === 'activer' ? 'Utilisateur débloqué.' : 'Utilisateur bloqué.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur', 'erreur');
        }
    }

    function confirmerSuppression(id, email) {
        AdminComposants.confirmer(
            `Supprimer l'utilisateur <strong>${email}</strong> ? Cette action est irréversible.`,
            `PageUtilisateurs.supprimer(${id})`
        );
    }

    async function supprimer(id) {
        try {
            await AdminApi.utilisateurs.supprimerUtilisateur(id);
            AdminComposants.fermerModal();
            AdminComposants.toast('Utilisateur supprimé.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur de suppression', 'erreur');
        }
    }

    return { afficher, chargerDonnees, rechercher, allerPage, voirDetail, changerStatut, confirmerSuppression, supprimer };
})();
