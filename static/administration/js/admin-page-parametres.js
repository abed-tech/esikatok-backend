/**
 * Module Page Paramètres - EsikaTok Administration.
 * Configuration globale: nom plateforme, URLs, limites, prix.
 */
const PageParametres = (() => {

    let parametresCache = [];

    const PARAMETRES_DEFAUT = [
        { cle: 'nom_plateforme', description: 'Nom de la plateforme', type_donnee: 'texte', defaut: 'EsikaTok' },
        { cle: 'url_site', description: 'URL du site principal', type_donnee: 'texte', defaut: 'https://esikatok.com' },
        { cle: 'url_admin_local', description: 'URL admin locale', type_donnee: 'texte', defaut: '/gestion/EsikaTok' },
        { cle: 'url_admin_prod', description: 'URL admin production', type_donnee: 'texte', defaut: '/gestion/admin-germo' },
        { cle: 'limite_publications_standard', description: 'Limite publications plan Standard', type_donnee: 'nombre', defaut: '10' },
        { cle: 'limite_publications_pro', description: 'Limite publications plan Pro', type_donnee: 'nombre', defaut: '20' },
        { cle: 'limite_boosts_standard', description: 'Boosts inclus plan Standard', type_donnee: 'nombre', defaut: '5' },
        { cle: 'limite_boosts_pro', description: 'Boosts inclus plan Pro', type_donnee: 'nombre', defaut: '10' },
        { cle: 'prix_boost_unitaire', description: 'Prix d\'un boost unitaire (USD)', type_donnee: 'nombre', defaut: '1.00' },
        { cle: 'duree_essai_gratuit_jours', description: 'Durée essai gratuit (jours)', type_donnee: 'nombre', defaut: '30' },
        { cle: 'email_support', description: 'Email du support', type_donnee: 'texte', defaut: 'support@esikatok.com' },
    ];

    async function afficher() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();

        try {
            parametresCache = await AdminApi.parametres.liste();
            rendu();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Accès refusé ou chargement impossible.',
                'PageParametres.afficher()'
            );
        }
    }

    function rendu() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;

        // Fusionner les paramètres défaut avec les valeurs existantes
        const paramsMap = {};
        parametresCache.forEach(p => { paramsMap[p.cle] = p; });

        const champsHtml = PARAMETRES_DEFAUT.map(pd => {
            const existant = paramsMap[pd.cle];
            const valeurActuelle = existant ? existant.valeur : pd.defaut;
            return `
            <div class="bg-sombre-800/50 rounded-lg p-4 border border-sombre-800">
                <div class="flex items-center justify-between mb-2">
                    <label for="param-${pd.cle}" class="text-xs font-medium text-sombre-300">${pd.description}</label>
                    <span class="text-[10px] text-sombre-400 font-mono">${pd.cle}</span>
                </div>
                <input type="${pd.type_donnee === 'nombre' ? 'number' : 'text'}"
                    id="param-${pd.cle}"
                    value="${valeurActuelle}"
                    data-cle="${pd.cle}"
                    data-description="${pd.description}"
                    data-type="${pd.type_donnee}"
                    ${AdminApp.aPermission('parametres', 'modifier') ? '' : 'disabled'}
                    class="w-full px-3 py-2 bg-sombre-900 border border-sombre-700 rounded-lg text-sm text-white focus:border-primaire-500 focus:outline-none transition ${AdminApp.aPermission('parametres', 'modifier') ? '' : 'opacity-60 cursor-not-allowed'}">
                ${existant ? `<p class="text-[10px] text-sombre-400 mt-1">Modifié le ${C.formaterDate(existant.date_modification)}</p>` : ''}
            </div>`;
        }).join('');

        // Paramètres personnalisés (hors défaut)
        const personnalises = parametresCache.filter(p => !PARAMETRES_DEFAUT.find(d => d.cle === p.cle));
        const personnalisesHtml = personnalises.length > 0
            ? `<div class="mt-6">
                <h3 class="text-sm font-semibold text-white mb-3">Paramètres personnalisés</h3>
                ${personnalises.map(p => `
                    <div class="flex items-center justify-between bg-sombre-800/50 rounded-lg p-3 border border-sombre-800 mb-2">
                        <div>
                            <span class="text-xs font-mono text-sombre-300">${p.cle}</span>
                            <span class="text-sombre-400 text-xs ml-2">${p.description || ''}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-white text-sm">${p.valeur}</span>
                            ${AdminApp.aPermission('parametres', 'supprimer') ? C.bouton('Supprimer', `PageParametres.supprimerParam('${p.cle}')`, 'danger', 'xs') : ''}
                        </div>
                    </div>
                `).join('')}
            </div>`
            : '';

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Paramètres', 'Configuration globale de la plateforme',
                `<div class="flex gap-2">
                    ${C.boutonRecharger('PageParametres.afficher()')}
                    ${AdminApp.aPermission('parametres', 'creer') ? C.bouton('+ Ajouter', 'PageParametres.modalAjout()', 'secondaire', 'md') : ''}
                    ${AdminApp.aPermission('parametres', 'modifier') ? C.bouton('Enregistrer tout', 'PageParametres.enregistrerTout()', 'primaire', 'md') : ''}
                </div>`
            )}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${champsHtml}
            </div>
            ${personnalisesHtml}
        </div>`;
    }

    async function enregistrerTout() {
        const inputs = document.querySelectorAll('[data-cle]');
        let compteur = 0;

        for (const input of inputs) {
            const cle = input.dataset.cle;
            const valeur = input.value;
            const description = input.dataset.description || '';
            const type_donnee = input.dataset.type || 'texte';

            try {
                await AdminApi.parametres.enregistrer({ cle, valeur, description, type_donnee });
                compteur++;
            } catch (e) {
                AdminComposants.toast(`Erreur pour ${cle}: ${e.erreur || 'Échec'}`, 'erreur');
            }
        }

        AdminComposants.toast(`${compteur} paramètre(s) enregistré(s).`, 'succes');
    }

    function modalAjout() {
        const C = AdminComposants;
        C.modal('Ajouter un paramètre', `
            ${C.champForm('new-param-cle', 'Clé (identifiant unique)', 'text', { placeholder: 'ma_cle_param', obligatoire: true })}
            ${C.champForm('new-param-valeur', 'Valeur', 'text', { obligatoire: true })}
            ${C.champForm('new-param-desc', 'Description', 'text')}
            ${C.champForm('new-param-type', 'Type', 'select', {
                options: [
                    { valeur: 'texte', label: 'Texte' },
                    { valeur: 'nombre', label: 'Nombre' },
                    { valeur: 'booleen', label: 'Booléen' },
                    { valeur: 'json', label: 'JSON' },
                ]
            })}
            <div class="flex justify-end gap-2 mt-4">
                ${C.bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'md')}
                ${C.bouton('Ajouter', 'PageParametres.ajouterParam()', 'primaire', 'md')}
            </div>
        `, 'md');
    }

    async function ajouterParam() {
        const cle = document.getElementById('new-param-cle')?.value?.trim();
        const valeur = document.getElementById('new-param-valeur')?.value?.trim();
        const description = document.getElementById('new-param-desc')?.value?.trim() || '';
        const type_donnee = document.getElementById('new-param-type')?.value || 'texte';

        if (!cle || !valeur) {
            AdminComposants.toast('Clé et valeur sont obligatoires.', 'attention');
            return;
        }

        try {
            await AdminApi.parametres.enregistrer({ cle, valeur, description, type_donnee });
            AdminComposants.fermerModal();
            AdminComposants.toast('Paramètre ajouté.', 'succes');
            await afficher();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur', 'erreur');
        }
    }

    async function supprimerParam(cle) {
        AdminComposants.confirmer(
            `Supprimer le paramètre <strong>${cle}</strong> ?`,
            `PageParametres.confirmerSuppression('${cle}')`
        );
    }

    async function confirmerSuppression(cle) {
        try {
            await AdminApi.parametres.supprimerParam(cle);
            AdminComposants.fermerModal();
            AdminComposants.toast('Paramètre supprimé.', 'succes');
            await afficher();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur', 'erreur');
        }
    }

    return { afficher, enregistrerTout, modalAjout, ajouterParam, supprimerParam, confirmerSuppression };
})();
