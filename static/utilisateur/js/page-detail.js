/**
 * Page Détail du bien - EsikaTok.
 * Affiche toutes les informations d'un bien : vidéo, description, prix,
 * localisation complète, agent, actions (contacter, carte, favoris, partager).
 */
const PageDetail = (() => {

    function afficher(params) {
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Détail du bien')}
            <div id="detail-contenu" class="flex-1 overflow-y-auto pb-6">
                ${Composants.loader()}
            </div>
        </div>`;
    }

    async function initialiser(params) {
        const el = document.getElementById('detail-contenu');
        if (!el || !params.id) return;
        try {
            const bien = await ApiEsikaTok.biens.detail(params.id);
            el.innerHTML = renduDetail(bien);
        } catch (e) {
            el.innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                'Impossible de charger ce bien.'
            );
        }
    }

    function renduDetail(b) {
        const prixF = Composants.formatPrix(b.prix, b.devise || 'USD');
        const localisation = [b.quartier_nom || b.quartier_texte, b.commune_nom, b.ville_nom].filter(Boolean).join(', ');

        return `
        <div class="fondu-entree">
            <!-- Vidéo / Images -->
            ${b.video_url ? `
            <div class="aspect-[9/16] max-h-[50vh] bg-black relative">
                <video src="${b.video_url}" class="w-full h-full object-cover" controls playsinline poster="${b.miniature_url || ''}"></video>
            </div>` : b.miniature_url ? `
            <div class="aspect-video bg-black">
                <img src="${b.miniature_url}" class="w-full h-full object-cover">
            </div>` : ''}

            ${b.images && b.images.length > 0 ? `
            <div class="flex gap-2 overflow-x-auto px-4 py-2 -mt-1">${b.images.map(img =>
                `<img src="${img.image}" class="h-20 rounded-lg object-cover flex-shrink-0 border border-sombre-700" loading="lazy">`
            ).join('')}</div>` : ''}

            <div class="px-4 space-y-4 mt-3">
                <!-- Tags + Prix -->
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${b.type_offre === 'vente' ? 'bg-green-500/20 text-green-400' : 'bg-primaire-500/20 text-primaire-400'}">${b.type_offre}</span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs bg-sombre-700 text-sombre-200">${b.type_bien}</span>
                        ${b.est_booste ? '<span class="px-2.5 py-0.5 rounded-full text-xs bg-accent-500/20 text-accent-400 font-medium">⚡ Boosté</span>' : ''}
                    </div>
                    <h1 class="text-lg font-bold text-white leading-tight">${b.titre}</h1>
                    <p class="text-2xl font-bold text-accent-400 mt-1">${prixF}</p>
                </div>

                <!-- Caractéristiques -->
                ${(b.nombre_chambres || b.nombre_salles_bain || b.surface_m2) ? `
                <div class="grid grid-cols-3 gap-2">
                    ${b.nombre_chambres ? `<div class="bg-sombre-800 rounded-xl p-3 text-center">
                        <p class="text-base font-bold text-white">${b.nombre_chambres}</p>
                        <p class="text-[10px] text-sombre-200 mt-0.5">Chambres</p>
                    </div>` : ''}
                    ${b.nombre_salles_bain ? `<div class="bg-sombre-800 rounded-xl p-3 text-center">
                        <p class="text-base font-bold text-white">${b.nombre_salles_bain}</p>
                        <p class="text-[10px] text-sombre-200 mt-0.5">Salles de bain</p>
                    </div>` : ''}
                    ${b.surface_m2 ? `<div class="bg-sombre-800 rounded-xl p-3 text-center">
                        <p class="text-base font-bold text-white">${b.surface_m2}</p>
                        <p class="text-[10px] text-sombre-200 mt-0.5">m²</p>
                    </div>` : ''}
                </div>` : ''}

                <!-- Localisation -->
                <div class="bg-sombre-800 rounded-xl p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
                        <p class="text-sm font-semibold text-white">Localisation</p>
                    </div>
                    <p class="text-sm text-sombre-200">${localisation}</p>
                    <div class="flex gap-2 mt-3">
                        ${(b.latitude && b.longitude) ? `
                        <button onclick="EsikaTok.naviguer('carte',{id:${b.id},lat:${b.latitude},lng:${b.longitude},titre:'${encodeURIComponent(b.titre)}'})" class="flex-1 py-2 bg-sombre-700 rounded-lg text-xs text-primaire-400 font-medium hover:bg-sombre-600 transition flex items-center justify-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                            Voir sur la carte
                        </button>` : ''}
                        <a href="${(b.latitude && b.longitude) ? `https://www.google.com/maps?q=${b.latitude},${b.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localisation)}`}" target="_blank" rel="noopener" class="${(b.latitude && b.longitude) ? '' : 'flex-1'} py-2 px-3 bg-sombre-700 rounded-lg text-xs text-green-400 font-medium hover:bg-sombre-600 transition flex items-center justify-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            Google Maps
                        </a>
                    </div>
                </div>

                <!-- Description -->
                ${b.description ? `
                <div>
                    <p class="text-sm font-semibold text-white mb-1.5">Description</p>
                    <p class="text-sm text-sombre-200 whitespace-pre-line leading-relaxed">${b.description}</p>
                </div>` : ''}

                <!-- Statistiques -->
                <div class="flex items-center gap-4 text-xs text-sombre-200">
                    <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        ${b.nombre_vues || 0} vues
                    </span>
                    <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                        ${b.nombre_favoris || 0} favoris
                    </span>
                    <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.316 4.026a3 3 0 10-5.368 2.684 3 3 0 005.368-2.684zm0-9.316a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684z"/></svg>
                        ${b.nombre_partages || 0}
                    </span>
                </div>

                <!-- Agent -->
                <div onclick="EsikaTok.naviguer('agent',{id:${b.agent_id}})" class="bg-sombre-800 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-sombre-700 transition">
                    <div class="w-12 h-12 rounded-full bg-primaire-600 flex items-center justify-center text-lg font-bold text-white overflow-hidden flex-shrink-0">
                        ${b.agent_photo ? `<img src="${b.agent_photo}" class="w-full h-full object-cover">` : (b.agent_nom || 'A').charAt(0)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-white">${b.agent_nom || 'Agent'}</p>
                        <p class="text-xs text-sombre-200">Agent immobilier</p>
                    </div>
                    <svg class="w-4 h-4 text-sombre-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>

                <!-- Actions -->
                <div class="flex gap-2 pt-1 pb-4">
                    ${Composants.bouton('💬 Contacter', `EsikaTok.contacterAgent(${b.id})`, { variante:'primaire', plein:true })}
                    ${Composants.bouton('❤️ Favori', `EsikaTok.toggleFavori(${b.id})`, { variante:'secondaire' })}
                    ${Composants.bouton('↗', `EsikaTok.partagerBien(${b.id},'${encodeURIComponent(b.titre)}')`, { variante:'secondaire' })}
                </div>
            </div>
        </div>`;
    }

    return { afficher, initialiser };
})();
