/**
 * Module Page Biens - EsikaTok Administration.
 * Liste des biens immobiliers, recherche, filtres par statut/type, retrait, suppression.
 */
const PageBiens = (() => {

    let donnees = { resultats: [], total: 0 };
    let recherche = '';
    let filtreStatut = '';
    let filtreType = '';
    let pageActuelle = 1;
    const PAR_PAGE = 20;

    async function afficher() {
        pageActuelle = 1;
        recherche = '';
        filtreStatut = '';
        filtreType = '';
        await chargerDonnees();
    }

    async function chargerDonnees() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();
        try {
            const params = { page: pageActuelle };
            if (recherche) params.q = recherche;
            if (filtreStatut) params.statut = filtreStatut;
            if (filtreType) params.type_bien = filtreType;
            const brut = await AdminApi.biens.liste(params);
            donnees = AdminApi.normaliserListe(brut);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les biens.',
                'PageBiens.afficher()'
            );
        }
    }

    function couleurStatut(s) {
        const map = { publie: 'vert', approuve: 'vert', en_attente: 'orange', refuse: 'rouge', suspendu: 'gris', brouillon: 'gris' };
        return map[s] || 'gris';
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);
        const peutModifier = AdminApp.aPermission('biens', 'modifier');
        const peutSupprimer = AdminApp.aPermission('biens', 'supprimer');

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="7" class="text-center py-8 text-sombre-400 text-sm">Aucun bien trouvé.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(b => {
                const miniature = b.miniature_url
                    ? `<img src="${b.miniature_url}" class="w-10 h-10 rounded-lg object-cover flex-shrink-0">`
                    : `<div class="w-10 h-10 rounded-lg bg-sombre-700 flex items-center justify-center text-sombre-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg></div>`;

                const actions = [];
                actions.push(C.bouton('Voir', `PageBiens.voirDetail(${b.id})`, 'secondaire', 'xs'));
                if (peutModifier && (b.statut === 'publie' || b.statut === 'approuve')) {
                    actions.push(C.bouton('Retirer', `PageBiens.retirer(${b.id})`, 'danger', 'xs'));
                }
                if (peutSupprimer) {
                    actions.push(C.bouton('Suppr.', `PageBiens.confirmerSuppression(${b.id},'${(b.titre || '').replace(/'/g, "\\'")}')`, 'fantome', 'xs'));
                }

                return C.lignTableau([
                    `<div class="flex items-center gap-2.5">${miniature}<div class="min-w-0"><p class="text-white text-xs font-medium truncate max-w-[180px]">${b.titre}</p><p class="text-sombre-400 text-[11px]">${b.type_bien} · ${b.type_offre}</p></div></div>`,
                    `<span class="text-xs">${b.agent_nom || '-'}</span>`,
                    `<span class="text-xs font-medium">${new Intl.NumberFormat('fr-FR').format(b.prix)} ${b.devise || 'USD'}</span>`,
                    `<span class="text-xs">${b.commune_nom || '-'}</span>`,
                    C.badge(b.statut, couleurStatut(b.statut)),
                    `<span class="text-xs">${b.nombre_vues || 0} vues</span>`,
                ], `<div class="flex gap-1">${actions.join('')}</div>`);
            }).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gestion des biens immobiliers', `${donnees.total} bien(s)`,
                C.boutonRecharger('PageBiens.chargerDonnees()')
            )}
            <div class="flex flex-wrap gap-2 mb-4">
                <div class="flex-1 min-w-[200px]">${C.barreRecherche('recherche-biens', 'Rechercher par titre, agent, commune...', 'PageBiens.rechercher(this.value)')}</div>
                <select onchange="PageBiens.filtrerStatut(this.value)" class="px-3 py-2 bg-sombre-800 border border-sombre-700 rounded-lg text-sm text-white">
                    <option value="">Tous les statuts</option>
                    <option value="en_attente" ${filtreStatut === 'en_attente' ? 'selected' : ''}>En attente</option>
                    <option value="publie" ${filtreStatut === 'publie' ? 'selected' : ''}>Publié</option>
                    <option value="approuve" ${filtreStatut === 'approuve' ? 'selected' : ''}>Approuvé</option>
                    <option value="refuse" ${filtreStatut === 'refuse' ? 'selected' : ''}>Refusé</option>
                    <option value="suspendu" ${filtreStatut === 'suspendu' ? 'selected' : ''}>Suspendu</option>
                </select>
                <select onchange="PageBiens.filtrerType(this.value)" class="px-3 py-2 bg-sombre-800 border border-sombre-700 rounded-lg text-sm text-white">
                    <option value="">Tous les types</option>
                    <option value="maison" ${filtreType === 'maison' ? 'selected' : ''}>Maison</option>
                    <option value="appartement" ${filtreType === 'appartement' ? 'selected' : ''}>Appartement</option>
                    <option value="terrain" ${filtreType === 'terrain' ? 'selected' : ''}>Terrain</option>
                    <option value="bureau" ${filtreType === 'bureau' ? 'selected' : ''}>Bureau</option>
                    <option value="commerce" ${filtreType === 'commerce' ? 'selected' : ''}>Commerce</option>
                </select>
            </div>
            ${C.tableau(['Bien', 'Agent', 'Prix', 'Commune', 'Statut', 'Vues'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageBiens.allerPage')}
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

    function filtrerStatut(val) {
        filtreStatut = val;
        pageActuelle = 1;
        chargerDonnees();
    }

    function filtrerType(val) {
        filtreType = val;
        pageActuelle = 1;
        chargerDonnees();
    }

    async function allerPage(page) {
        if (page < 1) return;
        pageActuelle = page;
        await chargerDonnees();
    }

    async function voirDetail(id) {
        const C = AdminComposants;
        try {
            /* Find from loaded data (avoids extra API call) */
            const b = donnees.resultats.find(x => x.id === id);
            if (!b) { C.toast('Bien introuvable', 'erreur'); return; }

            const imgHtml = (b.images || []).length > 0
                ? b.images.map(img => `<img src="${img.image}" class="w-20 h-20 rounded-lg object-cover">`).join('')
                : '<p class="text-sombre-400 text-sm">Aucune image</p>';

            C.modal('Détails du bien', `
                <div class="mb-4">
                    ${b.miniature_url ? `<img src="${b.miniature_url}" class="w-full h-40 rounded-lg object-cover mb-3">` : ''}
                    <h3 class="text-white font-semibold text-lg">${b.titre}</h3>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        ${C.badge(b.statut, couleurStatut(b.statut))}
                        ${C.badge(b.type_bien, 'bleu')}
                        ${C.badge(b.type_offre, 'violet')}
                        ${b.est_booste ? C.badge('Boosté', 'orange') : ''}
                    </div>
                </div>
                <div class="space-y-2 bg-sombre-800/50 rounded-lg p-3 mb-4">
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Prix</span><span class="text-white font-medium">${new Intl.NumberFormat('fr-FR').format(b.prix)} ${b.devise || 'USD'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Agent</span><span class="text-white">${b.agent_nom || '-'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Commune</span><span class="text-white">${b.commune_nom || '-'}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Quartier</span><span class="text-white">${b.quartier_nom || b.quartier_texte || '-'}</span></div>
                    ${b.nombre_chambres ? `<div class="flex justify-between text-sm"><span class="text-sombre-400">Chambres</span><span class="text-white">${b.nombre_chambres}</span></div>` : ''}
                    ${b.nombre_salles_bain ? `<div class="flex justify-between text-sm"><span class="text-sombre-400">Salles de bain</span><span class="text-white">${b.nombre_salles_bain}</span></div>` : ''}
                    ${b.surface_m2 ? `<div class="flex justify-between text-sm"><span class="text-sombre-400">Surface</span><span class="text-white">${b.surface_m2} m²</span></div>` : ''}
                </div>
                <div class="grid grid-cols-4 gap-2 mb-4">
                    ${C.carteStatistique('Vues', b.nombre_vues || 0, '', 'primaire')}
                    ${C.carteStatistique('Favoris', b.nombre_favoris || 0, '', 'rouge')}
                    ${C.carteStatistique('Partages', b.nombre_partages || 0, '', 'bleu')}
                    ${C.carteStatistique('Contacts', b.nombre_contacts || 0, '', 'vert')}
                </div>
                ${b.description ? `<div class="mb-4"><p class="text-xs font-semibold text-sombre-300 uppercase mb-1">Description</p><p class="text-sm text-sombre-200 leading-relaxed max-h-32 overflow-y-auto">${b.description}</p></div>` : ''}
                <div class="mb-3"><p class="text-xs font-semibold text-sombre-300 uppercase mb-1">Images</p><div class="flex flex-wrap gap-2">${imgHtml}</div></div>
                <div class="flex justify-between items-center text-[11px] text-sombre-400 pt-2 border-t border-sombre-800">
                    <span>Créé le ${C.formaterDateHeure(b.date_creation)}</span>
                    <span>ID #${b.id}</span>
                </div>
            `, 'xl');
        } catch (e) {
            C.toast('Erreur de chargement', 'erreur');
        }
    }

    function retirer(id) {
        AdminComposants.confirmer(
            `<div class="mb-3">Retirer ce bien de la publication ?</div>
            <textarea id="motif-retrait" rows="3" placeholder="Motif du retrait (obligatoire)..."
                class="w-full px-3 py-2 bg-sombre-800 border border-sombre-700 rounded-lg text-sm text-white placeholder-sombre-400"></textarea>`,
            `PageBiens.confirmerRetrait(${id})`
        );
    }

    async function confirmerRetrait(id) {
        const motif = document.getElementById('motif-retrait')?.value?.trim();
        if (!motif) {
            AdminComposants.toast('Le motif est obligatoire.', 'erreur');
            return;
        }
        try {
            await AdminApi.biens.retirer(id, motif);
            AdminComposants.fermerModal();
            AdminComposants.toast('Bien retiré avec succès.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur lors du retrait', 'erreur');
        }
    }

    function confirmerSuppression(id, titre) {
        AdminComposants.confirmer(
            `Supprimer le bien <strong>${titre}</strong> ? Cette action est irréversible.`,
            `PageBiens.supprimer(${id})`
        );
    }

    async function supprimer(id) {
        try {
            await AdminApi.biens.supprimerBien(id);
            AdminComposants.fermerModal();
            AdminComposants.toast('Bien supprimé.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur de suppression', 'erreur');
        }
    }

    return {
        afficher, chargerDonnees, rechercher, filtrerStatut, filtrerType,
        allerPage, voirDetail, retirer, confirmerRetrait,
        confirmerSuppression, supprimer,
    };
})();
