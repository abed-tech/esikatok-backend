/**
 * Module Page Modération (Gouvernance des Vidéos) - EsikaTok Administration.
 * Liste des soumissions, lecteur vidéo, validation/refus/suspension,
 * suppression logique de vidéos et historique d'audit.
 */
const PageModeration = (() => {

    let donnees = { resultats: [], total: 0 };
    let donneesHistorique = { resultats: [], total: 0 };
    let filtreStatut = 'en_attente';
    let vueActive = 'soumissions';
    let pageActuelle = 1;
    let pageHistorique = 1;
    const PAR_PAGE = 20;

    async function afficher() {
        pageActuelle = 1;
        pageHistorique = 1;
        vueActive = 'soumissions';
        await chargerDonnees();
    }

    async function chargerDonnees() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();
        try {
            const params = { statut: filtreStatut, page: pageActuelle };
            const brut = await AdminApi.moderation.soumissions(params);
            donnees = AdminApi.normaliserListe(brut);
            rendu();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les soumissions.',
                'PageModeration.afficher()'
            );
        }
    }

    async function chargerHistorique() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();
        try {
            const brut = await AdminApi.videos.historiqueSuppressions({ page: pageHistorique });
            donneesHistorique = AdminApi.normaliserListe(brut);
            rendu();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger l\'historique.',
                'PageModeration.changerVue("historique")'
            );
        }
    }

    function rendu() {
        if (vueActive === 'historique') {
            renduHistorique();
        } else {
            renduListe();
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        const peutSupprimerVideo = AdminApp.aPermission('videos', 'supprimer');
        const peutModerer = AdminApp.aPermission('moderation', 'modifier');
        const peutVoirHistorique = AdminApp.aPermission('videos', 'lire');

        const vueOngletsList = [{ cle: 'soumissions', label: 'Soumissions' }];
        if (peutVoirHistorique) vueOngletsList.push({ cle: 'historique', label: '🗑️ Historique suppressions' });
        const vueOngletsHtml = C.onglets('onglets-vue', vueOngletsList, 'PageModeration.changerVue');

        const ongletsHtml = C.onglets('onglets-moderation', [
            { cle: 'en_attente', label: 'En attente' },
            { cle: 'approuvee', label: 'Approuvées' },
            { cle: 'refusee', label: 'Refusées' },
            { cle: 'suspendue', label: 'Suspendues' },
        ], 'PageModeration.filtrer');

        const couleurStatut = { en_attente: 'orange', approuvee: 'vert', refusee: 'rouge', suspendue: 'violet', correction: 'bleu' };

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="7" class="text-center py-8 text-sombre-400 text-sm">Aucune soumission trouvée.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(s => {
                const actionsModeration = (peutModerer && s.statut === 'en_attente') ? `
                    ${C.bouton('Valider', `PageModeration.traiter(${s.id},'approuvee')`, 'succes', 'xs')}
                    ${C.bouton('Refuser', `PageModeration.modalRefus(${s.id})`, 'danger', 'xs')}
                ` : '';

                const btnSupprimer = (peutSupprimerVideo && s.video_id) ? C.bouton('Supprimer', `PageModeration.modalSuppression(${s.video_id}, '${(s.bien_titre || '').replace(/'/g, "\\'")}')`, 'danger', 'xs') : '';

                return C.lignTableau([
                    `<div class="font-medium text-white text-xs">${s.bien_titre || 'Sans titre'}</div>`,
                    s.agent_nom || 'N/A',
                    C.badge(s.bien_type || 'N/A', 'gris'),
                    s.bien_prix ? `$${Number(s.bien_prix).toLocaleString('fr-FR')}` : 'N/A',
                    C.badge(s.statut, couleurStatut[s.statut] || 'gris'),
                    C.formaterDate(s.date_soumission),
                ], `<div class="flex gap-1 flex-wrap">
                    ${C.bouton('Voir', `PageModeration.voirDetail(${s.id})`, 'secondaire', 'xs')}
                    ${actionsModeration}
                    ${btnSupprimer}
                </div>`);
            }).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gouvernance des vidéos', 'Modération, validation et suppression du contenu',
                C.boutonRecharger('PageModeration.chargerDonnees()')
            )}
            <div class="mb-4">${vueOngletsHtml}</div>
            <div class="mb-4">${ongletsHtml}</div>
            ${C.tableau(['Bien', 'Agent', 'Type', 'Prix', 'Statut', 'Date'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageModeration.allerPage')}
            ${C.infoPagination(pageActuelle, PAR_PAGE, donnees.total)}
        </div>`;

        C.activerOnglet('onglets-vue', 'soumissions');
        C.activerOnglet('onglets-moderation', filtreStatut);
    }

    function renduHistorique() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donneesHistorique.total / PAR_PAGE);

        const vueOngletsHtml = C.onglets('onglets-vue', [
            { cle: 'soumissions', label: 'Soumissions' },
            { cle: 'historique', label: '🗑️ Historique suppressions' },
        ], 'PageModeration.changerVue');

        let lignesHtml = '';
        if (donneesHistorique.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="6" class="text-center py-8 text-sombre-400 text-sm">Aucune vidéo supprimée.</td></tr>`;
        } else {
            lignesHtml = donneesHistorique.resultats.map(v => C.lignTableau([
                `<div class="font-medium text-white text-xs">${v.bien_titre || 'N/A'}</div>`,
                v.agent_nom || 'N/A',
                `<div><span class="text-sombre-200 text-xs">${v.supprime_par || 'N/A'}</span><br><span class="text-[10px] text-primaire-400">${v.supprime_par_role_label || ''}</span></div>`,
                v.motif_suppression ? `<span class="text-sombre-200 text-xs truncate max-w-[200px] inline-block">${v.motif_suppression}</span>` : C.badge('Non précisé', 'gris'),
                C.badge(v.bien_statut || 'N/A', v.bien_statut === 'suspendu' ? 'violet' : 'gris'),
                C.formaterDateHeure(v.date_suppression),
            ])).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gouvernance des vidéos', 'Historique des vidéos supprimées (audit)',
                C.boutonRecharger('PageModeration.chargerHistorique()')
            )}
            <div class="mb-4">${vueOngletsHtml}</div>
            ${C.tableau(['Bien', 'Agent', 'Supprimé par', 'Motif', 'Statut bien', 'Date suppression'], lignesHtml, true)}
            ${C.pagination(pageHistorique, totalPages, 'PageModeration.allerPageHistorique')}
            ${C.infoPagination(pageHistorique, PAR_PAGE, donneesHistorique.total)}
        </div>`;

        C.activerOnglet('onglets-vue', 'historique');
    }

    async function changerVue(vue) {
        vueActive = vue;
        if (vue === 'historique') {
            pageHistorique = 1;
            await chargerHistorique();
        } else {
            pageActuelle = 1;
            await chargerDonnees();
        }
    }

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

    async function allerPageHistorique(page) {
        if (page < 1) return;
        pageHistorique = page;
        await chargerHistorique();
    }

    async function voirDetail(id) {
        const C = AdminComposants;
        try {
            const soumission = await AdminApi.moderation.detail(id);
            const videoHtml = soumission.video_url
                ? `<video controls class="w-full rounded-lg mb-4 max-h-64 bg-black"><source src="${soumission.video_url}" type="video/mp4">Lecteur non supporté</video>`
                : '<div class="bg-sombre-800 rounded-lg p-8 text-center text-sombre-400 text-sm mb-4">Aucune vidéo disponible</div>';

            C.modal('Détails de la soumission', `
                ${videoHtml}
                <div class="space-y-3">
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Bien</span><span class="text-white font-medium">${soumission.bien_titre}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Agent</span><span class="text-white">${soumission.agent_nom}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Type</span><span class="text-white">${soumission.bien_type}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Prix</span><span class="text-white">$${soumission.bien_prix}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Statut</span>${C.badge(soumission.statut, soumission.statut === 'approuvee' ? 'vert' : soumission.statut === 'refusee' ? 'rouge' : 'orange')}</div>
                    <div class="flex justify-between text-sm"><span class="text-sombre-400">Date soumission</span><span class="text-white">${C.formaterDateHeure(soumission.date_soumission)}</span></div>
                    ${soumission.commentaire_agent ? `<div><span class="text-sombre-400 text-sm">Commentaire agent:</span><p class="text-white text-sm mt-1 bg-sombre-800 p-3 rounded-lg">${soumission.commentaire_agent}</p></div>` : ''}
                </div>
                <div class="mt-6 flex gap-2 justify-end flex-wrap">
                    ${(AdminApp.aPermission('moderation', 'modifier') && soumission.statut === 'en_attente') ? `
                        ${C.bouton('Valider', `PageModeration.traiter(${id},'approuvee')`, 'succes', 'md')}
                        ${C.bouton('Refuser', `PageModeration.modalRefus(${id})`, 'danger', 'md')}
                        ${C.bouton('Suspendre', `PageModeration.traiter(${id},'suspendue')`, 'secondaire', 'md')}
                    ` : ''}
                    ${(AdminApp.aPermission('videos', 'supprimer') && soumission.video_id) ? C.bouton('Supprimer vidéo', `PageModeration.modalSuppression(${soumission.video_id}, '${(soumission.bien_titre || '').replace(/'/g, "\\'")}')`, 'danger', 'md') : ''}
                </div>
            `, 'xl');
        } catch (e) {
            C.toast('Erreur de chargement', 'erreur');
        }
    }

    function modalSuppression(videoId, bienTitre) {
        const C = AdminComposants;
        C.modal('Supprimer cette vidéo', `
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p class="text-red-400 text-sm font-medium mb-1">⚠️ Suppression logique</p>
                <p class="text-sombre-200 text-xs">La vidéo du bien « <strong class="text-white">${bienTitre}</strong> » sera immédiatement invisible pour tous les utilisateurs. Le bien sera automatiquement suspendu. Cette action est tracée dans l'historique d'audit.</p>
            </div>
            ${C.champForm('motif-suppression', 'Raison de la suppression (facultatif)', 'textarea', { placeholder: 'Ex: Contenu inapproprié, violation des conditions...', lignes: 3 })}
            <div class="flex justify-end gap-2 mt-4">
                ${C.bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'md')}
                ${C.bouton('Confirmer la suppression', `PageModeration.confirmerSuppression(${videoId})`, 'danger', 'md')}
            </div>
        `);
    }

    async function confirmerSuppression(videoId) {
        const motif = document.getElementById('motif-suppression')?.value?.trim() || '';
        const C = AdminComposants;

        try {
            await AdminApi.videos.supprimer(videoId, motif);

            C.fermerModal();
            C.toast('Vidéo supprimée avec succès. Le bien a été suspendu.', 'succes');

            // Rafraîchir la liste complète depuis le serveur
            await chargerDonnees();
        } catch (e) {
            C.toast(e.erreur || 'Erreur lors de la suppression.', 'erreur');
        }
    }

    function modalRefus(id) {
        const C = AdminComposants;
        C.modal('Refuser la soumission', `
            ${C.champForm('motif-refus', 'Motif du refus (obligatoire)', 'textarea', { placeholder: 'Expliquez la raison du refus...', obligatoire: true })}
            ${C.champForm('notes-internes-refus', 'Notes internes (optionnel)', 'textarea', { placeholder: 'Notes visibles uniquement par les admins...', lignes: 2 })}
            <div class="flex justify-end gap-2 mt-4">
                ${C.bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'md')}
                ${C.bouton('Confirmer le refus', `PageModeration.confirmerRefus(${id})`, 'danger', 'md')}
            </div>
        `);
    }

    async function confirmerRefus(id) {
        const motif = document.getElementById('motif-refus')?.value?.trim();
        const notes = document.getElementById('notes-internes-refus')?.value?.trim() || '';

        if (!motif) {
            AdminComposants.toast('Le motif est obligatoire.', 'attention');
            return;
        }

        await traiter(id, 'refusee', motif, notes);
    }

    async function traiter(id, decision, motif = '', notes = '') {
        try {
            await AdminApi.moderation.traiter(id, { decision, motif, notes_internes: notes });
            AdminComposants.fermerModal();
            AdminComposants.toast(decision === 'approuvee' ? 'Bien approuvé et publié.' : decision === 'refusee' ? 'Bien refusé.' : 'Décision enregistrée.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur lors du traitement.', 'erreur');
        }
    }

    return {
        afficher, chargerDonnees, chargerHistorique, changerVue,
        filtrer, allerPage, allerPageHistorique,
        voirDetail, modalRefus, confirmerRefus, traiter,
        modalSuppression, confirmerSuppression,
    };
})();
