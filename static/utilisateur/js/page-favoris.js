/**
 * Page Favoris - EsikaTok.
 * Affiche les biens sauvegardés avec aperçu vidéo, prix et localisation.
 */
const PageFavoris = (() => {

    function afficher() {
        if (!EtatApp.estConnecte()) return PageConnexion.afficher({ action: 'voir vos favoris' });
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Mes favoris')}
            <div id="liste-favoris" class="flex-1 overflow-y-auto px-4 pb-6 pt-3">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiser() {
        if (!EtatApp.estConnecte()) return;
        const el = document.getElementById('liste-favoris');
        if (!el) return;
        try {
            const donnees = await ApiEsikaTok.favoris.liste();
            const favs = donnees.results || donnees;
            if (!favs || favs.length === 0) {
                el.innerHTML = Composants.etatVide(
                    '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
                    'Aucun favori. Ajoutez des biens en favoris depuis le fil ou la recherche.'
                );
                return;
            }
            el.innerHTML = `<p class="text-xs text-sombre-200 mb-3">${favs.length} bien(s) sauvegardé(s)</p>
            <div class="space-y-2">${favs.map(f => {
                const b = f.bien_detail || f;
                return Composants.carteBienListe(b, {
                    droite: `<button onclick="event.stopPropagation(); PageFavoris.retirer(${b.id}, this)" class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition flex-shrink-0">
                        <svg class="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    </button>`,
                });
            }).join('')}</div>`;
        } catch (e) {
            el.innerHTML = `<div class="text-center py-12">
                <p class="text-sombre-200 text-sm mb-3">Erreur de chargement</p>
                ${Composants.bouton('Réessayer', 'PageFavoris.initialiser()', { variante:'secondaire' })}
            </div>`;
        }
    }

    async function retirer(bienId, btn) {
        try {
            await ApiEsikaTok.favoris.supprimer(bienId);
            Composants.afficherToast('Retiré des favoris.', 'info');
            const card = btn.closest('.flex.gap-3');
            if (card) card.remove();
        } catch (e) {
            Composants.afficherToast('Erreur.', 'erreur');
        }
    }

    return { afficher, initialiser, retirer };
})();
