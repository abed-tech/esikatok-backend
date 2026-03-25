/**
 * Page Message (Chat) - EsikaTok.
 * Discussion avec un agent. Une conversation = un bien.
 * Affiche la fiche du bien en haut, messages groupés par date (WhatsApp-style), champ de saisie.
 */
const PageMessage = (() => {
    let _convId = null;
    let _intervalle = null;

    /* --- Utilitaires date WhatsApp-style --- */
    function labelDate(dateStr) {
        const d = new Date(dateStr);
        const maintenant = new Date();
        const auj = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
        const hier = new Date(auj); hier.setDate(hier.getDate() - 1);
        const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (jour.getTime() === auj.getTime()) return "Aujourd'hui";
        if (jour.getTime() === hier.getTime()) return 'Hier';
        const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        return d.toLocaleDateString('fr-FR', opts).replace(/^\w/, c => c.toUpperCase());
    }

    function heureFormatee(dateStr) {
        return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    function separateurDate(label) {
        return `<div class="flex items-center justify-center my-3">
            <span class="px-3 py-1 bg-sombre-800/80 backdrop-blur-sm rounded-full text-[11px] text-sombre-300 font-medium">${label}</span>
        </div>`;
    }

    function afficher(params) {
        _convId = params?.id;
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Conversation')}
            <!-- Fiche bien en haut -->
            <div id="fiche-bien-conv" class="px-4 py-2 border-b border-sombre-700/50 bg-sombre-800/50"></div>
            <!-- Messages -->
            <div id="liste-messages" class="flex-1 overflow-y-auto px-4 py-3 space-y-1">${Composants.loader()}</div>
            <!-- Saisie -->
            <div class="sticky bottom-0 bg-sombre-900 border-t border-sombre-700/50 px-3 py-2.5 safe-bottom">
                <div class="flex gap-2 max-w-lg mx-auto">
                    <input type="text" id="input-message" placeholder="Écrire un message..."
                        class="flex-1 px-4 py-2.5 bg-sombre-800 border border-sombre-700 rounded-2xl text-sm text-white placeholder-sombre-200 focus:outline-none focus:border-primaire-500 transition"
                        onkeydown="if(event.key==='Enter')PageMessage.envoyer()">
                    <button onclick="PageMessage.envoyer()" class="px-4 py-2.5 bg-primaire-600 rounded-2xl text-white hover:bg-primaire-700 transition flex-shrink-0">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }

    async function initialiser(params) {
        _convId = params?.id;
        if (!_convId) return;

        /* Charger la fiche bien depuis la conversation stockée */
        const convs = EtatApp.obtenir('conversations') || [];
        const conv = convs.find(c => c.id === _convId);
        const ficheBien = document.getElementById('fiche-bien-conv');
        if (ficheBien && conv) {
            const autre = conv.initiateur?.id === EtatApp.obtenir('utilisateur')?.id ? conv.agent : conv.initiateur;
            ficheBien.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primaire-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                    ${autre?.photo ? `<img src="${autre.photo}" class="w-full h-full object-cover">` : (autre?.prenom || 'U').charAt(0)}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">${autre?.prenom || ''} ${autre?.nom || ''}</p>
                    ${conv.bien_titre ? `<p class="text-[10px] text-primaire-400 truncate">🏠 ${conv.bien_titre}</p>` : ''}
                </div>
            </div>`;
        } else if (ficheBien) {
            ficheBien.classList.add('hidden');
        }

        await chargerMessages();

        /* Messages marqués comme lus côté serveur, rafraîchir badges */
        BadgeManager.forcer();

        /* Rafraîchir toutes les 10s */
        _intervalle = setInterval(chargerMessages, 10000);
    }

    async function chargerMessages() {
        if (!_convId) return;
        if (!EtatApp.estConnecte()) { detruire(); return; }
        try {
            const donnees = await ApiEsikaTok.messagerie.messages(_convId);
            const msgs = donnees.messages || donnees.results || donnees || [];
            const liste = document.getElementById('liste-messages');
            if (!liste) return;

            if (msgs.length === 0) {
                liste.innerHTML = '<p class="text-center text-sombre-200 text-sm py-8">Aucun message. Commencez la conversation !</p>';
                return;
            }

            const moi = EtatApp.obtenir('utilisateur');
            let dernierLabel = '';
            let html = '';

            msgs.forEach(m => {
                /* Séparateur de date WhatsApp-style */
                const lbl = labelDate(m.date_envoi);
                if (lbl !== dernierLabel) {
                    html += separateurDate(lbl);
                    dernierLabel = lbl;
                }

                const estMoi = m.est_moi || m.expediteur_id === moi?.id;
                const heure = heureFormatee(m.date_envoi);
                const lu = m.est_lu;
                const checkSvg = estMoi ? `<svg class="w-3.5 h-3.5 inline-block ml-0.5 ${lu ? 'text-blue-400' : 'text-white/40'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>` : '';

                html += `
                <div class="flex ${estMoi ? 'justify-end' : 'justify-start'} mb-1">
                    <div class="max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${estMoi ? 'bg-primaire-600 text-white rounded-br-md' : 'bg-sombre-700 text-sombre-100 rounded-bl-md'}">
                        <p class="leading-relaxed whitespace-pre-wrap">${m.contenu}</p>
                        <div class="flex items-center justify-end gap-0.5 mt-1">
                            <span class="text-[10px] ${estMoi ? 'text-white/50' : 'text-sombre-200/50'}">${heure}</span>
                            ${checkSvg}
                        </div>
                    </div>
                </div>`;
            });

            liste.innerHTML = html;

            /* Scroll auto en bas */
            liste.scrollTop = liste.scrollHeight;
        } catch (e) {
            console.error('Erreur chargement messages:', e);
        }
    }

    async function envoyer() {
        const input = document.getElementById('input-message');
        const contenu = input?.value?.trim();
        if (!contenu || !_convId) return;
        input.value = '';
        input.focus();
        try {
            await ApiEsikaTok.messagerie.envoyer(_convId, contenu);
            await chargerMessages();
        } catch (e) {
            Composants.afficherToast("Erreur lors de l'envoi.", 'erreur');
        }
    }

    function detruire() {
        if (_intervalle) { clearInterval(_intervalle); _intervalle = null; }
        _convId = null;
        BadgeManager.forcer();
    }

    return { afficher, initialiser, envoyer, detruire };
})();
