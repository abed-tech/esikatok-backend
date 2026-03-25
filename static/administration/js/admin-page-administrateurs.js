/**
 * Module Page Administrateurs - EsikaTok Administration.
 * Liste admins, création (directeur uniquement), modification rôle, suppression.
 */
const PageAdministrateurs = (() => {

    let donnees = { resultats: [], total: 0 };
    let pageActuelle = 1;
    const PAR_PAGE = 20;

    const ROLES = [
        { valeur: 'directeur', label: 'Directeur (Super Admin)' },
        { valeur: 'gestion', label: 'Admin Gestion' },
        { valeur: 'moderateur', label: 'Modérateur' },
        { valeur: 'support', label: 'Support (Service client)' },
    ];

    const ROLES_CREATION = ROLES.filter(r => r.valeur !== 'directeur');

    function labelRole(role) {
        const r = ROLES.find(r => r.valeur === role);
        return r ? r.label : role;
    }

    function couleurRole(role) {
        const map = { directeur: 'rouge', gestion: 'vert', moderateur: 'bleu', support: 'orange' };
        return map[role] || 'gris';
    }

    async function afficher() {
        pageActuelle = 1;
        await chargerDonnees();
    }

    async function chargerDonnees() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();
        try {
            const brut = await AdminApi.admins.liste({ page: pageActuelle });
            donnees = AdminApi.normaliserListe(brut);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Accès refusé ou chargement impossible.',
                'PageAdministrateurs.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="6" class="text-center py-8 text-sombre-400 text-sm">Aucun administrateur trouvé.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(a => {
                const u = a.utilisateur || {};
                return C.lignTableau([
                    `<div class="flex items-center gap-2">${C.avatar(u.prenom || u.nom, 'sm')}<div><p class="text-white text-xs font-medium">${u.prenom || ''} ${u.nom || ''}</p><p class="text-sombre-400 text-[11px]">${u.email}</p></div></div>`,
                    `<span class="text-xs font-mono text-sombre-300">${a.matricule || 'N/A'}</span>`,
                    C.badge(labelRole(a.role_admin), couleurRole(a.role_admin)),
                    C.badge(a.est_en_ligne ? 'En ligne' : 'Hors ligne', a.est_en_ligne ? 'vert' : 'gris'),
                    C.formaterDate(a.date_creation),
                ], `<div class="flex gap-1">
                    ${C.bouton('Détails', `PageAdministrateurs.voirDetail(${a.id})`, 'secondaire', 'xs')}
                    ${AdminApp.aPermission('administrateurs', 'modifier') ? C.bouton('Rôle', `PageAdministrateurs.modalRole(${a.id},'${a.role_admin}')`, 'fantome', 'xs') : ''}
                    ${AdminApp.aPermission('administrateurs', 'supprimer') ? C.bouton('Supprimer', `PageAdministrateurs.confirmerSuppression(${a.id},'${u.email}')`, 'danger', 'xs') : ''}
                </div>`);
            }).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Gestion des administrateurs', `${donnees.total} administrateur(s)`,
                `<div class="flex gap-2">${C.boutonRecharger('PageAdministrateurs.chargerDonnees()')}
                ${AdminApp.aPermission('administrateurs', 'creer') ? C.bouton('+ Nouvel admin', 'PageAdministrateurs.modalCreation()', 'primaire', 'md') : ''}</div>`
            )}
            ${C.tableau(['Administrateur', 'Matricule', 'Rôle', 'Statut', 'Création'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageAdministrateurs.allerPage')}
            ${C.infoPagination(pageActuelle, PAR_PAGE, donnees.total)}
        </div>`;
    }

    function modalCreation() {
        const C = AdminComposants;
        C.modal('Créer un administrateur', `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                ${C.champForm('admin-nom', 'Nom', 'text', { obligatoire: true })}
                ${C.champForm('admin-postnom', 'Post-nom', 'text')}
                ${C.champForm('admin-prenom', 'Prénom', 'text', { obligatoire: true })}
                ${C.champForm('admin-matricule', 'Matricule', 'text', { obligatoire: true, placeholder: 'EK-001' })}
                ${C.champForm('admin-email', 'Email', 'email', { obligatoire: true })}
                ${C.champForm('admin-role', 'Rôle', 'select', { options: ROLES_CREATION })}
            </div>
            ${C.champForm('admin-mdp', 'Mot de passe', 'password', { obligatoire: true, placeholder: 'Minimum 8 caractères' })}
            <div class="flex justify-end gap-2 mt-4">
                ${C.bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'md')}
                ${C.bouton('Créer', 'PageAdministrateurs.creer()', 'primaire', 'md')}
            </div>
        `);
    }

    async function creer() {
        const donnees = {
            nom: document.getElementById('admin-nom')?.value?.trim(),
            postnom: document.getElementById('admin-postnom')?.value?.trim() || '',
            prenom: document.getElementById('admin-prenom')?.value?.trim(),
            matricule: document.getElementById('admin-matricule')?.value?.trim(),
            email: document.getElementById('admin-email')?.value?.trim(),
            role_admin: document.getElementById('admin-role')?.value,
            mot_de_passe: document.getElementById('admin-mdp')?.value,
        };

        if (!donnees.nom || !donnees.prenom || !donnees.matricule || !donnees.role_admin || !donnees.mot_de_passe) {
            AdminComposants.toast('Veuillez remplir tous les champs obligatoires.', 'attention');
            return;
        }

        try {
            await AdminApi.admins.creer(donnees);
            AdminComposants.fermerModal();
            AdminComposants.toast('Administrateur créé avec succès.', 'succes');
            await chargerDonnees();
        } catch (e) {
            const msg = e.email?.[0] || e.matricule?.[0] || e.erreur || 'Erreur de création';
            AdminComposants.toast(msg, 'erreur');
        }
    }

    async function allerPage(page) {
        if (page < 1) return;
        pageActuelle = page;
        await chargerDonnees();
    }

    async function voirDetail(id) {
        const C = AdminComposants;
        try {
            const data = await AdminApi.admins.detail(id);
            const admin = data.admin || {};
            const u = admin.utilisateur || {};
            const connexions = data.connexions || [];
            const activites = data.activites || [];

            const connexionsHtml = connexions.length === 0
                ? '<p class="text-sombre-400 text-sm">Aucune connexion enregistrée.</p>'
                : connexions.slice(0, 10).map(c => `
                    <div class="flex justify-between items-center py-2 border-b border-sombre-800 last:border-0 text-xs">
                        <span class="text-white">${C.formaterDateHeure(c.heure_connexion)}</span>
                        <span class="text-sombre-400">${c.duree_minutes ? c.duree_minutes + ' min' : 'En cours'}</span>
                        <span class="text-sombre-400">${c.ip || 'N/A'}</span>
                    </div>
                `).join('');

            const activitesHtml = activites.length === 0
                ? '<p class="text-sombre-400 text-sm">Aucune activité enregistrée.</p>'
                : activites.slice(0, 10).map(a => `
                    <div class="flex justify-between items-center py-2 border-b border-sombre-800 last:border-0 text-xs">
                        <span class="text-white">${a.action}</span>
                        <span class="text-sombre-400 truncate max-w-[150px]">${a.detail || ''}</span>
                        <span class="text-sombre-400">${C.formaterDateHeure(a.date)}</span>
                    </div>
                `).join('');

            C.modal('Détails administrateur', `
                <div class="flex items-center gap-3 mb-6">
                    ${C.avatar(u.prenom || u.nom, 'lg')}
                    <div>
                        <p class="text-white font-semibold">${u.prenom || ''} ${u.nom || ''}</p>
                        <p class="text-sombre-400 text-sm">${u.email}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-xs font-mono text-sombre-300">${admin.matricule}</span>
                            ${C.badge(labelRole(admin.role_admin), couleurRole(admin.role_admin))}
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-white mb-2">Dernières connexions</h4>
                    <div class="bg-sombre-800 rounded-lg p-3 max-h-40 overflow-y-auto">${connexionsHtml}</div>
                </div>

                <div>
                    <h4 class="text-sm font-semibold text-white mb-2">Dernières actions</h4>
                    <div class="bg-sombre-800 rounded-lg p-3 max-h-40 overflow-y-auto">${activitesHtml}</div>
                </div>
            `, 'xl');
        } catch (e) {
            C.toast('Erreur de chargement', 'erreur');
        }
    }

    function modalRole(id, roleActuel) {
        const C = AdminComposants;
        C.modal('Modifier le rôle', `
            ${C.champForm('nouveau-role', 'Nouveau rôle', 'select', { options: ROLES_CREATION, valeur: roleActuel })}
            <div class="flex justify-end gap-2 mt-4">
                ${C.bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'md')}
                ${C.bouton('Enregistrer', `PageAdministrateurs.modifierRole(${id})`, 'primaire', 'md')}
            </div>
        `, 'sm');
    }

    async function modifierRole(id) {
        const nouveauRole = document.getElementById('nouveau-role')?.value;
        if (!nouveauRole) {
            AdminComposants.toast('Veuillez sélectionner un rôle.', 'attention');
            return;
        }
        try {
            await AdminApi.admins.modifierRole(id, nouveauRole);
            AdminComposants.fermerModal();
            AdminComposants.toast('Rôle modifié.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur', 'erreur');
        }
    }

    function confirmerSuppression(id, email) {
        AdminComposants.confirmer(
            `Supprimer l'administrateur <strong>${email}</strong> ? Cette action est irréversible.`,
            `PageAdministrateurs.supprimer(${id})`
        );
    }

    async function supprimer(id) {
        try {
            await AdminApi.admins.supprimerAdmin(id);
            AdminComposants.fermerModal();
            AdminComposants.toast('Administrateur supprimé.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur de suppression', 'erreur');
        }
    }

    return { afficher, chargerDonnees, allerPage, modalCreation, creer, voirDetail, modalRole, modifierRole, confirmerSuppression, supprimer };
})();
