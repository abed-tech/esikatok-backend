/**
 * Module Page Aide - EsikaTok Frontend Utilisateur.
 * - Annonces officielles de la plateforme (lecture seule, aucune réponse)
 * - Poser une question (préoccupation) via formulaire
 * - Historique des questions envoyées
 * Seul canal de communication utilisateur → plateforme.
 */
const PageAide = (() => {

    let _annonces = [];
    let _preoccupations = [];
    let _onglet = 'annonces'; // 'annonces' | 'question' | 'historique'

    function afficher() {
        _onglet = 'annonces';
        return `
        <div class="h-full flex flex-col bg-sombre-950">
            ${Composants.enTetePage('Aide & Annonces', true)}
            <div class="flex border-b border-sombre-800">
                <button id="tab-annonces" onclick="PageAide.changerOnglet('annonces')"
                    class="flex-1 py-3 text-xs font-semibold text-center transition border-b-2 border-primaire-500 text-primaire-400 relative">
                    Annonces
                    <span id="badge-aide-annonces" class="hidden badge-notif badge-notif--sm badge-notif--abs">0</span>
                </button>
                <button id="tab-question" onclick="PageAide.changerOnglet('question')"
                    class="flex-1 py-3 text-xs font-semibold text-center transition border-b-2 border-transparent text-sombre-400 hover:text-sombre-200">
                    Poser une question
                </button>
                <button id="tab-historique" onclick="PageAide.changerOnglet('historique')"
                    class="flex-1 py-3 text-xs font-semibold text-center transition border-b-2 border-transparent text-sombre-400 hover:text-sombre-200 relative">
                    Mes demandes
                    <span id="badge-aide-historique" class="hidden badge-notif badge-notif--sm badge-notif--abs">0</span>
                </button>
            </div>
            <div id="aide-contenu" class="flex-1 overflow-y-auto"></div>
        </div>`;
    }

    async function initialiser() {
        await chargerAnnonces();
        BadgeManager.marquerAnnoncesVues();
        BadgeManager.majTousLesBadges();
    }

    function changerOnglet(onglet) {
        _onglet = onglet;
        ['annonces', 'question', 'historique'].forEach(o => {
            const btn = document.getElementById(`tab-${o}`);
            if (!btn) return;
            btn.classList.toggle('border-primaire-500', o === onglet);
            btn.classList.toggle('text-primaire-400', o === onglet);
            btn.classList.toggle('border-transparent', o !== onglet);
            btn.classList.toggle('text-sombre-400', o !== onglet);
        });
        if (onglet === 'annonces') { chargerAnnonces(); BadgeManager.marquerAnnoncesVues(); }
        else if (onglet === 'question') afficherFormulaire();
        else { chargerHistorique(); BadgeManager.marquerPreocVues(); }
    }

    /* --- Annonces (lecture seule) --- */
    async function chargerAnnonces() {
        const zone = document.getElementById('aide-contenu');
        if (!zone) return;
        zone.innerHTML = Composants.loader();
        try {
            const data = await ApiEsikaTok.annonces.liste();
            _annonces = data.resultats || [];
            rendreAnnonces(zone);
        } catch (e) {
            zone.innerHTML = `<div class="p-6 text-center text-sombre-400 text-sm">Impossible de charger les annonces.</div>`;
        }
    }

    function rendreAnnonces(zone) {
        if (_annonces.length === 0) {
            zone.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
                <svg class="w-12 h-12 text-sombre-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
                </svg>
                <p class="text-sombre-300 text-sm">Aucune annonce pour le moment.</p>
            </div>`;
            return;
        }
        zone.innerHTML = `
        <div class="p-4 space-y-3">
            ${_annonces.map(a => `
            <div class="bg-sombre-900 border border-sombre-800 rounded-xl p-4">
                <div class="flex items-start justify-between mb-2">
                    <h3 class="text-white font-semibold text-sm flex-1">${a.titre}</h3>
                    <span class="text-[10px] text-sombre-400 flex-shrink-0 ml-3">${formatDateCourte(a.date_envoi)}</span>
                </div>
                <p class="text-sombre-300 text-xs leading-relaxed whitespace-pre-wrap">${a.contenu}</p>
                <div class="mt-2 flex items-center gap-1.5">
                    <svg class="w-3 h-3 text-primaire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                    <span class="text-[10px] text-primaire-400 font-medium">Annonce officielle</span>
                </div>
            </div>`).join('')}
        </div>`;
    }

    /* --- Formulaire "Poser une question" --- */
    function afficherFormulaire() {
        const zone = document.getElementById('aide-contenu');
        if (!zone) return;

        if (!EtatApp.estConnecte()) {
            zone.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
                <svg class="w-12 h-12 text-sombre-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <p class="text-sombre-300 text-sm mb-3">Connectez-vous pour poser une question.</p>
                <button onclick="EsikaTok.naviguer('connexion')" class="px-5 py-2 bg-primaire-600 text-white rounded-xl text-sm font-medium">Se connecter</button>
            </div>`;
            return;
        }

        zone.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="bg-sombre-900 border border-sombre-800 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-4">
                    <svg class="w-5 h-5 text-primaire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <h3 class="text-white font-semibold text-sm">Poser une question</h3>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="block text-xs text-sombre-300 mb-1">Catégorie</label>
                        <select id="aide-categorie" class="w-full bg-sombre-800 border border-sombre-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primaire-500 focus:outline-none">
                            <option value="compte">Mon compte</option>
                            <option value="paiement">Paiement / Abonnement</option>
                            <option value="technique">Problème technique</option>
                            <option value="signalement">Signalement</option>
                            <option value="autre" selected>Autre</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-sombre-300 mb-1">Sujet</label>
                        <input id="aide-sujet" type="text" maxlength="200" placeholder="Résumez votre question..."
                            class="w-full bg-sombre-800 border border-sombre-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-sombre-500 focus:border-primaire-500 focus:outline-none" />
                    </div>
                    <div>
                        <label class="block text-xs text-sombre-300 mb-1">Message</label>
                        <textarea id="aide-message" rows="4" placeholder="Décrivez votre question ou préoccupation en détail..."
                            class="w-full bg-sombre-800 border border-sombre-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-sombre-500 focus:border-primaire-500 focus:outline-none resize-none"></textarea>
                    </div>
                    <button id="btn-envoyer-aide" onclick="PageAide.envoyerQuestion()"
                        class="w-full py-3 bg-primaire-600 hover:bg-primaire-700 text-white rounded-xl text-sm font-semibold transition">
                        Envoyer ma question
                    </button>
                </div>
            </div>

            <div class="bg-sombre-900/50 border border-sombre-800 rounded-xl p-4">
                <p class="text-xs text-sombre-400 leading-relaxed">
                    <strong class="text-sombre-300">Note :</strong> Votre question sera traitée par notre équipe.
                    Vous recevrez une réponse dans les plus brefs délais. Consultez l'onglet
                    <button onclick="PageAide.changerOnglet('historique')" class="text-primaire-400 underline">Mes demandes</button>
                    pour suivre l'état de vos questions.
                </p>
            </div>
        </div>`;
    }

    async function envoyerQuestion() {
        const categorie = document.getElementById('aide-categorie')?.value || 'autre';
        const sujet = document.getElementById('aide-sujet')?.value?.trim();
        const message = document.getElementById('aide-message')?.value?.trim();

        if (!sujet || !message) {
            Composants.afficherToast('Veuillez remplir le sujet et le message.', 'attention');
            return;
        }

        const btn = document.getElementById('btn-envoyer-aide');
        if (btn) { btn.disabled = true; btn.textContent = 'Envoi en cours...'; }

        try {
            await ApiEsikaTok.aide.envoyerQuestion({ categorie, sujet, message });
            Composants.afficherToast('Question envoyée avec succès !', 'succes');
            changerOnglet('historique');
        } catch (e) {
            Composants.afficherToast(e.erreur || 'Erreur lors de l\'envoi.', 'erreur');
            if (btn) { btn.disabled = false; btn.textContent = 'Envoyer ma question'; }
        }
    }

    /* --- Historique des préoccupations --- */
    async function chargerHistorique() {
        const zone = document.getElementById('aide-contenu');
        if (!zone) return;

        if (!EtatApp.estConnecte()) {
            zone.innerHTML = `<div class="p-6 text-center text-sombre-400 text-sm">Connectez-vous pour voir vos demandes.</div>`;
            return;
        }

        zone.innerHTML = Composants.loader();
        try {
            const data = await ApiEsikaTok.aide.mesPreoccupations();
            _preoccupations = data.resultats || [];
            rendreHistorique(zone);
        } catch (e) {
            zone.innerHTML = `<div class="p-6 text-center text-sombre-400 text-sm">Impossible de charger l'historique.</div>`;
        }
    }

    function rendreHistorique(zone) {
        const couleurs = {
            en_attente: 'bg-amber-500/20 text-amber-400',
            en_cours: 'bg-blue-500/20 text-blue-400',
            traitee: 'bg-green-500/20 text-green-400',
            fermee: 'bg-sombre-700/50 text-sombre-400',
        };
        const labels = {
            en_attente: 'En attente', en_cours: 'En cours', traitee: 'Traitée', fermee: 'Fermée',
        };

        if (_preoccupations.length === 0) {
            zone.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
                <svg class="w-12 h-12 text-sombre-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <p class="text-sombre-300 text-sm">Aucune demande envoyée.</p>
            </div>`;
            return;
        }

        zone.innerHTML = `
        <div class="p-4 space-y-3">
            ${_preoccupations.map(p => `
            <div class="bg-sombre-900 border border-sombre-800 rounded-xl p-4">
                <div class="flex items-start justify-between mb-2">
                    <h4 class="text-white font-medium text-sm flex-1">${p.sujet}</h4>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${couleurs[p.statut] || couleurs.en_attente}">${labels[p.statut] || p.statut}</span>
                </div>
                <p class="text-sombre-400 text-xs mb-2">${p.message}</p>
                <div class="flex items-center gap-3 text-[10px] text-sombre-500">
                    <span>${formatDateCourte(p.date_creation)}</span>
                    <span class="px-1.5 py-0.5 rounded bg-sombre-800 text-sombre-400">${p.categorie}</span>
                </div>
                ${p.reponse ? `
                <div class="mt-3 pt-3 border-t border-sombre-800">
                    <div class="flex items-center gap-1.5 mb-1">
                        <svg class="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span class="text-[10px] text-green-400 font-medium">Réponse de l'équipe</span>
                    </div>
                    <p class="text-sombre-300 text-xs whitespace-pre-wrap">${p.reponse}</p>
                </div>` : ''}
            </div>`).join('')}
        </div>`;
    }

    /* --- Utilitaires --- */
    function formatDateCourte(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const j = d.getDate().toString().padStart(2, '0');
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${j}/${m}/${d.getFullYear()}`;
    }

    return { afficher, initialiser, changerOnglet, envoyerQuestion };
})();
