/**
 * Page Inbox (Messages) - EsikaTok.
 * Liste de toutes les conversations avec interlocuteur, bien concerné,
 * dernier message, non lus, triées par activité.
 */
const PageInbox = (() => {

    function afficher() {
        if (!EtatApp.estConnecte()) return PageConnexion.afficher({ action: 'accéder à vos messages' });
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            <div class="px-4 pt-4 pb-2 border-b border-sombre-700/50">
                <h2 class="text-lg font-bold text-white">Messages</h2>
                <p class="text-xs text-sombre-200 mt-0.5">Vos conversations avec les agents</p>
            </div>
            <div id="liste-conversations" class="flex-1 overflow-y-auto pb-20">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiser() {
        if (!EtatApp.estConnecte()) return;
        const liste = document.getElementById('liste-conversations');
        if (!liste) return;
        try {
            const donnees = await ApiEsikaTok.messagerie.conversations();
            const convs = donnees.results || donnees;
            if (!convs || convs.length === 0) {
                liste.innerHTML = Composants.etatVide(
                    '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
                    'Aucune conversation. Contactez un agent depuis un bien pour commencer.'
                );
                return;
            }
            EtatApp.definir('conversations', convs);
            liste.innerHTML = `<div class="divide-y divide-sombre-800/50">${convs.map(renduConversation).join('')}</div>`;

            /* Mettre à jour le badge global via BadgeManager */
            const totalConvsNonLues = convs.filter(c => (c.messages_non_lus || 0) > 0).length;
            BadgeManager.majBadgeNav(totalConvsNonLues);
        } catch (e) {
            liste.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-sombre-200 text-sm mb-3">Erreur de chargement</p>
                    ${Composants.bouton('Réessayer', 'PageInbox.initialiser()', { variante:'secondaire' })}
                </div>`;
        }
    }

    function renduConversation(c) {
        const moi = EtatApp.obtenir('utilisateur');
        const autre = c.initiateur?.id === moi?.id ? c.agent : c.initiateur;
        const dernierMsg = c.dernier_message;
        const nonLu = c.messages_non_lus > 0;
        const dateFormatee = Composants.formatDate(dernierMsg?.date_envoi || c.date_dernier_message);

        return `
        <div onclick="EsikaTok.naviguer('message',{id:${c.id}})" class="flex items-center gap-3 px-4 py-3.5 hover:bg-sombre-800/70 cursor-pointer transition active:bg-sombre-800">
            <div class="w-12 h-12 rounded-full bg-primaire-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden relative">
                ${autre?.photo ? `<img src="${autre.photo}" class="w-full h-full object-cover">` : (autre?.prenom || 'U').charAt(0)}
                ${nonLu ? '<span class="badge-notif badge-notif--dot badge-notif--abs badge-notif--entree"></span>' : ''}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <span class="font-medium text-sm ${nonLu ? 'text-white' : 'text-sombre-100'} truncate">${autre?.prenom || ''} ${autre?.nom || ''}</span>
                    <span class="text-[10px] ${nonLu ? 'text-red-400 font-medium' : 'text-sombre-200'} flex-shrink-0 ml-2">${dateFormatee}</span>
                </div>
                ${c.bien_titre ? `<p class="text-[10px] text-primaire-400/70 truncate mt-0.5">🏠 ${c.bien_titre}</p>` : ''}
                <p class="text-xs ${nonLu ? 'text-sombre-100 font-medium' : 'text-sombre-200'} truncate mt-0.5">${dernierMsg ? dernierMsg.contenu : 'Aucun message'}</p>
            </div>
            ${nonLu ? `<span class="badge-notif badge-notif--entree flex-shrink-0">${BadgeManager.formaterCompteur(c.messages_non_lus)}</span>` : ''}
        </div>`;
    }

    return { afficher, initialiser };
})();
