/**
 * Module Page Messagerie - EsikaTok Administration.
 * Conversations utilisateurs/agents, messages signalés, suppression, blocage.
 */
const PageMessagerie = (() => {

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
            const brut = await AdminApi.messagerie.conversations(params);
            donnees = AdminApi.normaliserListe(brut);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les conversations.',
                'PageMessagerie.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const totalPages = Math.ceil(donnees.total / PAR_PAGE);

        let lignesHtml = '';
        if (donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="7" class="text-center py-8 text-sombre-400 text-sm">Aucune conversation trouvée.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(c => C.lignTableau([
                `<div class="flex items-center gap-2">${C.avatar(c.initiateur.nom, 'sm')}<div><p class="text-white text-xs font-medium">${c.initiateur.nom}</p><p class="text-sombre-400 text-[11px]">${c.initiateur.email}</p></div></div>`,
                `<div class="flex items-center gap-2">${C.avatar(c.agent.nom, 'sm')}<div><p class="text-white text-xs font-medium">${c.agent.nom}</p><p class="text-sombre-400 text-[11px]">${c.agent.email}</p></div></div>`,
                `<span class="text-xs text-sombre-300">${c.bien?.titre || 'N/A'}</span>`,
                `<span class="text-xs font-medium">${c.nombre_messages}</span>`,
                C.badge(c.est_active ? 'Active' : 'Fermée', c.est_active ? 'vert' : 'gris'),
                `<span class="text-xs">${C.formaterDateHeure(c.date_dernier_message)}</span>`,
            ], C.bouton('Messages', `PageMessagerie.voirMessages(${c.id})`, 'secondaire', 'xs')
            )).join('');
        }

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Messagerie', `${donnees.total} conversation(s)`,
                C.boutonRecharger('PageMessagerie.chargerDonnees()')
            )}
            <div class="mb-4">${C.barreRecherche('recherche-messagerie', 'Rechercher par utilisateur, agent ou bien...', 'PageMessagerie.rechercher(this.value)')}</div>
            ${C.tableau(['Utilisateur', 'Agent', 'Bien', 'Messages', 'Statut', 'Dernier msg'], lignesHtml, true)}
            ${C.pagination(pageActuelle, totalPages, 'PageMessagerie.allerPage')}
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

    /* --- Utilitaires date WhatsApp-style --- */
    function labelDate(dateStr) {
        const d = new Date(dateStr);
        const maintenant = new Date();
        const auj = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
        const hier = new Date(auj); hier.setDate(hier.getDate() - 1);
        const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (jour.getTime() === auj.getTime()) return "Aujourd'hui";
        if (jour.getTime() === hier.getTime()) return 'Hier';
        return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    }

    function heureFormatee(dateStr) {
        return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    async function voirMessages(convId) {
        const C = AdminComposants;
        try {
            const data = await AdminApi.messagerie.messages(convId);
            const messages = data.messages || [];

            let messagesHtml = '';
            if (messages.length === 0) {
                messagesHtml = '<p class="text-sombre-400 text-sm text-center py-4">Aucun message.</p>';
            } else {
                let dernierLabel = '';
                messagesHtml = messages.map(m => {
                    let sep = '';
                    const lbl = labelDate(m.date_envoi);
                    if (lbl !== dernierLabel) {
                        sep = `<div class="flex items-center justify-center my-3"><span class="px-3 py-1 bg-sombre-700/80 rounded-full text-[11px] text-sombre-300 font-medium">${lbl}</span></div>`;
                        dernierLabel = lbl;
                    }
                    const estAgent = m.expediteur.type === 'agent';
                    const heure = heureFormatee(m.date_envoi);
                    const luSvg = m.est_lu ? '<svg class="w-3 h-3 inline text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' : '';
                    return `${sep}
                    <div class="flex ${estAgent ? 'justify-end' : 'justify-start'} mb-2">
                        <div class="max-w-[75%] ${estAgent ? 'bg-primaire-600/20 border-primaire-600/30' : 'bg-sombre-800 border-sombre-700'} border rounded-xl px-4 py-2.5">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-[11px] font-medium ${estAgent ? 'text-primaire-400' : 'text-sombre-300'}">${m.expediteur.nom}</span>
                                ${C.badge(estAgent ? 'Agent' : 'Utilisateur', estAgent ? 'bleu' : 'gris')}
                            </div>
                            <p class="text-sm text-white whitespace-pre-wrap">${m.contenu}</p>
                            <div class="flex items-center justify-between mt-1.5">
                                <span class="text-[10px] text-sombre-400">${heure} ${luSvg}</span>
                                ${AdminApp.aPermission('messagerie', 'supprimer') ? `<button onclick="PageMessagerie.supprimerMessage(${m.id},${convId})" class="text-red-400 hover:text-red-300 text-[10px] ml-3 transition">Supprimer</button>` : ''}
                            </div>
                        </div>
                    </div>`;
                }).join('');
            }

            C.modal('Conversation #' + convId, `
                <div id="admin-messages-scroll" class="max-h-96 overflow-y-auto mb-4 p-2">${messagesHtml}</div>
                <div class="flex justify-between items-center pt-3 border-t border-sombre-800">
                    <span class="text-sombre-400 text-xs">${messages.length} message(s)</span>
                    <div class="flex gap-2">
                        ${C.bouton('Fermer', 'AdminComposants.fermerModal()', 'secondaire', 'sm')}
                    </div>
                </div>
            `, 'xl');
            /* Auto-scroll to bottom */
            requestAnimationFrame(() => {
                const el = document.getElementById('admin-messages-scroll');
                if (el) el.scrollTop = el.scrollHeight;
            });
        } catch (e) {
            C.toast('Erreur de chargement des messages', 'erreur');
        }
    }

    async function supprimerMessage(msgId, convId) {
        AdminComposants.confirmer(
            'Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.',
            `PageMessagerie.confirmerSuppression(${msgId},${convId})`
        );
    }

    async function confirmerSuppression(msgId, convId) {
        try {
            await AdminApi.messagerie.supprimerMessage(msgId);
            AdminComposants.fermerModal();
            AdminComposants.toast('Message supprimé.', 'succes');
            await voirMessages(convId);
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur de suppression', 'erreur');
        }
    }

    return { afficher, chargerDonnees, rechercher, allerPage, voirMessages, supprimerMessage, confirmerSuppression };
})();
