/**
 * Module Page Préoccupations - EsikaTok Administration.
 * Centralise les questions envoyées par les utilisateurs via la page Aide.
 * Consultation, traitement et gestion des demandes.
 */
const PagePreoccupations = (() => {

    let donnees = { resultats: [], stats: {} };
    let filtreStatut = '';

    async function afficher() {
        filtreStatut = '';
        await chargerDonnees();
    }

    async function chargerDonnees() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();
        try {
            const params = {};
            if (filtreStatut) params.statut = filtreStatut;
            donnees = await AdminApi.preoccupations.liste(params);
            renduListe();
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Impossible de charger les préoccupations.',
                'PagePreoccupations.afficher()'
            );
        }
    }

    function renduListe() {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;
        const s = donnees.stats || {};

        const couleurStatut = {
            'en_attente': 'jaune', 'en_cours': 'bleu', 'traitee': 'vert', 'fermee': 'gris',
        };
        const labelStatut = {
            'en_attente': 'En attente', 'en_cours': 'En cours', 'traitee': 'Traitée', 'fermee': 'Fermée',
        };
        const labelCategorie = {
            'compte': 'Compte', 'paiement': 'Paiement', 'technique': 'Technique',
            'signalement': 'Signalement', 'autre': 'Autre',
        };

        let lignesHtml = '';
        if (!donnees.resultats || donnees.resultats.length === 0) {
            lignesHtml = `<tr><td colspan="6" class="text-center py-8 text-sombre-400 text-sm">Aucune préoccupation.</td></tr>`;
        } else {
            lignesHtml = donnees.resultats.map(p => C.lignTableau([
                `<div class="flex items-center gap-2">
                    ${C.avatar(p.utilisateur_nom, 'sm')}
                    <div>
                        <p class="text-white text-xs font-medium">${p.utilisateur_nom}</p>
                        <p class="text-sombre-400 text-[11px]">${p.utilisateur_email}</p>
                    </div>
                </div>`,
                C.badge(labelCategorie[p.categorie] || p.categorie, 'bleu'),
                `<div><p class="text-white text-xs font-medium">${p.sujet}</p><p class="text-sombre-400 text-[11px] line-clamp-1">${p.message.substring(0, 60)}${p.message.length > 60 ? '...' : ''}</p></div>`,
                C.badge(labelStatut[p.statut] || p.statut, couleurStatut[p.statut] || 'gris'),
                `<span class="text-xs">${C.formaterDateHeure(p.date_creation)}</span>`,
            ], `<button onclick="PagePreoccupations.voirDetail(${p.id})" class="text-primaire-400 hover:text-primaire-300 text-[11px] transition">Détail</button>`
            )).join('');
        }

        const filtres = ['', 'en_attente', 'en_cours', 'traitee', 'fermee'];
        const filtresHtml = filtres.map(f => {
            const label = f ? (labelStatut[f] || f) : 'Tous';
            const count = f === '' ? (s.total || 0) : (s[f === 'traitee' ? 'traitees' : f] || 0);
            const actif = filtreStatut === f;
            return `<button onclick="PagePreoccupations.filtrer('${f}')"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition ${actif ? 'bg-primaire-600 text-white' : 'bg-sombre-800 text-sombre-300 hover:bg-sombre-700'}">
                ${label} <span class="ml-1 opacity-60">${count}</span>
            </button>`;
        }).join('');

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Préoccupations', `${s.total || 0} demande(s)`,
                C.boutonRecharger('PagePreoccupations.chargerDonnees()')
            )}
            <div class="flex items-center gap-3 mb-4 flex-wrap">
                <div class="flex gap-2">${filtresHtml}</div>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-5">
                ${C.kpi('En attente', s.en_attente || 0, 'text-jaune-400')}
                ${C.kpi('En cours', s.en_cours || 0, 'text-bleu-400')}
                ${C.kpi('Traitées', s.traitees || 0, 'text-vert-400')}
            </div>
            ${C.tableau(['Utilisateur', 'Catégorie', 'Sujet', 'Statut', 'Date'], lignesHtml, true)}
        </div>`;
    }

    function filtrer(statut) {
        filtreStatut = statut;
        chargerDonnees();
    }

    function voirDetail(id) {
        const p = donnees.resultats.find(x => x.id === id);
        if (!p) return;
        const C = AdminComposants;

        const labelStatut = {
            'en_attente': 'En attente', 'en_cours': 'En cours', 'traitee': 'Traitée', 'fermee': 'Fermée',
        };

        const peutTraiter = AdminApp.aPermission('preoccupations', 'modifier');

        C.modal(`Préoccupation #${p.id}`, `
            <div class="space-y-4">
                <div class="flex items-center gap-3">
                    ${C.avatar(p.utilisateur_nom, 'md')}
                    <div>
                        <p class="text-white font-medium text-sm">${p.utilisateur_nom}</p>
                        <p class="text-sombre-400 text-xs">${p.utilisateur_email}</p>
                    </div>
                </div>
                <div class="bg-sombre-800/50 rounded-lg p-3">
                    <p class="text-xs text-sombre-400 mb-1">Sujet</p>
                    <p class="text-sm text-white font-medium">${p.sujet}</p>
                </div>
                <div class="bg-sombre-800/50 rounded-lg p-3">
                    <p class="text-xs text-sombre-400 mb-1">Message</p>
                    <p class="text-sm text-white whitespace-pre-wrap">${p.message}</p>
                </div>
                ${p.reponse ? `
                <div class="bg-primaire-900/20 border border-primaire-600/20 rounded-lg p-3">
                    <p class="text-xs text-primaire-400 mb-1">Réponse</p>
                    <p class="text-sm text-white whitespace-pre-wrap">${p.reponse}</p>
                    <p class="text-[11px] text-sombre-400 mt-1">Par ${p.traite_par_nom || '—'} — ${C.formaterDateHeure(p.date_traitement)}</p>
                </div>` : ''}
                ${peutTraiter ? `
                <div class="border-t border-sombre-800 pt-4 space-y-3">
                    <div>
                        <label class="block text-xs text-sombre-300 mb-1">Statut</label>
                        <select id="preoc-statut" class="w-full bg-sombre-800 border border-sombre-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primaire-500 focus:outline-none">
                            ${Object.entries(labelStatut).map(([k, v]) =>
                                `<option value="${k}" ${p.statut === k ? 'selected' : ''}>${v}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-sombre-300 mb-1">Réponse</label>
                        <textarea id="preoc-reponse" rows="3" placeholder="Écrire une réponse..."
                            class="w-full bg-sombre-800 border border-sombre-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primaire-500 focus:outline-none resize-none">${p.reponse || ''}</textarea>
                    </div>
                    <div class="flex justify-end gap-2">
                        ${C.bouton('Annuler', 'AdminComposants.fermerModal()', 'secondaire', 'sm')}
                        ${C.bouton('Enregistrer', `PagePreoccupations.traiter(${p.id})`, 'primaire', 'sm')}
                    </div>
                </div>` : `
                <div class="flex justify-end pt-3 border-t border-sombre-800">
                    ${C.bouton('Fermer', 'AdminComposants.fermerModal()', 'secondaire', 'sm')}
                </div>`}
            </div>
        `, 'lg');
    }

    async function traiter(id) {
        const statutEl = document.getElementById('preoc-statut');
        const reponseEl = document.getElementById('preoc-reponse');
        if (!statutEl) return;

        try {
            await AdminApi.preoccupations.traiter(id, {
                statut: statutEl.value,
                reponse: reponseEl?.value?.trim() || '',
            });
            AdminComposants.fermerModal();
            AdminComposants.toast('Préoccupation mise à jour.', 'succes');
            await chargerDonnees();
        } catch (e) {
            AdminComposants.toast(e.erreur || 'Erreur lors du traitement.', 'erreur');
        }
    }

    return { afficher, chargerDonnees, filtrer, voirDetail, traiter };
})();
