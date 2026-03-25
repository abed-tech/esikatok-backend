/**
 * Module Page Annonces - EsikaTok Administration.
 * Envoi d'annonces officielles de la plateforme vers les utilisateurs.
 * Lecture seule côté utilisateur, aucune réponse possible.
 */
const PageAnnonces = (() => {

    let donnees = { resultats: [], total: 0 };

    async function afficher() {
        await chargerDonnees();
    }

    async function chargerDonnees() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();
        try {
            const brut = await AdminApi.annonces.liste();
            donnees = brut;
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les annonces.',
                'PageAnnonces.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;

        let lignesHtml = '';
        if (!donnees.resultats || donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="5" class="text-center py-8 text-sombre-400 text-sm">Aucune annonce envoyée.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(a => C.lignTableau([
                `<div><p class="text-white text-xs font-medium">${a.titre}</p><p class="text-sombre-400 text-[11px] line-clamp-1">${a.contenu.substring(0, 80)}${a.contenu.length > 80 ? '...' : ''}</p></div>`,
                C.badge(a.cible === 'tous' ? 'Tous' : 'Spécifique', a.cible === 'tous' ? 'bleu' : 'violet'),
                `<span class="text-xs text-sombre-300">${a.destinataire_nom || '—'}</span>`,
                `<span class="text-xs text-sombre-300">${a.envoye_par_nom || '—'}</span>`,
                `<span class="text-xs">${C.formaterDateHeure(a.date_envoi)}</span>`,
            ], AdminApp.aPermission('annonces', 'supprimer')
                ? `<button onclick="PageAnnonces.supprimerAnnonce(${a.id})" class="text-red-400 hover:text-red-300 text-[11px] transition">Supprimer</button>`
                : ''
            )).join('');
        }

        const boutonNouvelle = AdminApp.aPermission('annonces', 'creer')
            ? C.bouton('Nouvelle annonce', 'PageAnnonces.formulaireNouvelle()', 'primaire', 'sm')
            : '';

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Annonces', `${donnees.total || 0} annonce(s)`,
                `<div class="flex gap-2">${boutonNouvelle}${C.boutonRecharger('PageAnnonces.chargerDonnees()')}</div>`
            )}
            ${C.tableau(['Annonce', 'Cible', 'Destinataire', 'Envoyée par', 'Date'], lignesHtml, true)}
        </div>`;
    }

    function formulaireNouvelle() {
        const C = AdminComposants;
        C.modal('Nouvelle annonce', `
            <div class="space-y-4">
                <div>
                    <label class="block text-xs text-sombre-300 mb-1">Titre</label>
                    <input id="annonce-titre" type="text" maxlength="200" placeholder="Titre de l'annonce"
                        class="w-full bg-sombre-800 border border-sombre-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primaire-500 focus:outline-none" />
                </div>
                <div>
                    <label class="block text-xs text-sombre-300 mb-1">Contenu</label>
                    <textarea id="annonce-contenu" rows="4" placeholder="Contenu de l'annonce..."
                        class="w-full bg-sombre-800 border border-sombre-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primaire-500 focus:outline-none resize-none"></textarea>
                </div>
                <div>
                    <label class="block text-xs text-sombre-300 mb-1">Cible</label>
                    <select id="annonce-cible" onchange="PageAnnonces.toggleDestinataire()"
                        class="w-full bg-sombre-800 border border-sombre-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primaire-500 focus:outline-none">
                        <option value="tous">Tous les utilisateurs</option>
                        <option value="specifique">Utilisateur spécifique</option>
                    </select>
                </div>
                <div id="champ-destinataire" class="hidden">
                    <label class="block text-xs text-sombre-300 mb-1">ID utilisateur destinataire</label>
                    <input id="annonce-destinataire" type="number" placeholder="ID de l'utilisateur"
                        class="w-full bg-sombre-800 border border-sombre-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primaire-500 focus:outline-none" />
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t border-sombre-800">
                    ${C.bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'sm')}
                    ${C.bouton('Envoyer', 'PageAnnonces.envoyerAnnonce()', 'primaire', 'sm')}
                </div>
            </div>
        `, 'lg');
    }

    function toggleDestinataire() {
        const cible = document.getElementById('annonce-cible').value;
        const champ = document.getElementById('champ-destinataire');
        champ.classList.toggle('hidden', cible !== 'specifique');
    }

    async function envoyerAnnonce() {
        const titre = document.getElementById('annonce-titre').value.trim();
        const contenuAnnonce = document.getElementById('annonce-contenu').value.trim();
        const cible = document.getElementById('annonce-cible').value;
        const destinataireId = document.getElementById('annonce-destinataire')?.value;

        if (!titre || !contenuAnnonce) {
            AdminComposants.toast('Titre et contenu obligatoires.', 'erreur');
            return;
        }

        try {
            await AdminApi.annonces.creer({
                titre,
                contenu: contenuAnnonce,
                cible,
                destinataire_id: cible === 'specifique' ? destinataireId : null,
            });
            AdminComposants.fermerModal();
            AdminComposants.toast('Annonce envoyée avec succès.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur lors de l\'envoi.', 'erreur');
        }
    }

    async function supprimerAnnonce(id) {
        AdminComposants.confirmer(
            'Supprimer cette annonce ? Les utilisateurs ne la verront plus.',
            `PageAnnonces.confirmerSuppression(${id})`
        );
    }

    async function confirmerSuppression(id) {
        try {
            await AdminApi.annonces.supprimerAnnonce(id);
            AdminComposants.fermerModal();
            AdminComposants.toast('Annonce supprimée.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur de suppression.', 'erreur');
        }
    }

    return {
        afficher, chargerDonnees, formulaireNouvelle, toggleDestinataire,
        envoyerAnnonce, supprimerAnnonce, confirmerSuppression,
    };
})();
