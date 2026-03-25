/**
 * Composants UI réutilisables pour EsikaTok - Frontend Utilisateur.
 */
const Composants = (() => {

    /* --- Toast / Notification --- */
    function afficherToast(message, type = 'info') {
        const zone = document.getElementById('zone-toasts');
        const couleurs = {
            info: 'bg-primaire-600', succes: 'bg-green-600',
            erreur: 'bg-red-600', attention: 'bg-amber-600',
        };
        const toast = document.createElement('div');
        toast.className = `toast pointer-events-auto px-4 py-2.5 rounded-xl ${couleurs[type] || couleurs.info} text-white text-sm font-medium shadow-lg max-w-sm text-center`;
        toast.textContent = message;
        zone.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    /* --- Loader --- */
    function loader(taille = 'md') {
        const tailles = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
        return `<div class="flex justify-center items-center py-8"><div class="loader ${tailles[taille] || tailles.md}"></div></div>`;
    }

    /* --- État vide --- */
    function etatVide(icone, message) {
        return `
        <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div class="text-sombre-700 mb-4">${icone}</div>
            <p class="text-sombre-200 text-sm">${message}</p>
        </div>`;
    }

    /* --- Carte vidéo pour le fil principal --- */
    function carteVideo(bien, index) {
        const videoUrl = bien.video_url || '';
        const miniature = bien.miniature_url || '';
        const prixFormate = new Intl.NumberFormat('fr-FR').format(bien.prix);
        const localisation = [bien.quartier_nom || bien.quartier_texte, bien.commune_nom, bien.ville_nom].filter(Boolean).join(', ');
        const aCoords = bien.latitude && bien.longitude;

        return `
        <div class="carte-video relative w-full h-screen flex-shrink-0 bg-black" data-bien-id="${bien.id}" data-index="${index}">
            <!-- Vidéo / Placeholder -->
            <div class="absolute inset-0 flex items-center justify-center">
                ${videoUrl ? `
                <video class="video-lecteur w-full h-full object-cover" data-src="${videoUrl}" 
                    poster="${miniature}" playsinline loop muted preload="none">
                </video>` : `
                <div class="w-full h-full bg-gradient-to-b from-sombre-800 to-sombre-950 flex items-center justify-center">
                    ${miniature ? `<img src="${miniature}" class="w-full h-full object-cover opacity-60" alt="">` : 
                    `<svg class="w-16 h-16 text-sombre-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`}
                </div>`}
            </div>

            <!-- Zone tap pour pause/reprise (couvre toute la vidéo) -->
            <div class="zone-tap-video absolute inset-0 z-10" data-bien-id="${bien.id}"></div>

            <!-- Indicateur pause -->
            <div class="indicateur-pause absolute inset-0 flex items-center justify-center z-10 pointer-events-none opacity-0 transition-opacity duration-200">
                <div class="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>

            <!-- Gradient bas pour lisibilité -->
            <div class="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>

            <!-- Barre de progression fine (bottom, très discrète) -->
            <div class="absolute bottom-[66px] left-0 right-0 h-[2px] bg-white/10 z-20 pointer-events-none md:bottom-[46px]">
                <div class="barre-progression h-full bg-white/40 transition-[width] duration-200" style="width:0%"></div>
            </div>

            <!-- Infos du bien (en bas à gauche) -->
            <div class="absolute bottom-[76px] left-3 right-16 z-20 md:bottom-[56px] md:left-6">
                <div class="flex items-center gap-2 mb-2">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${bien.type_offre === 'vente' ? 'bg-green-500/80' : 'bg-primaire-500/80'} text-white">
                        ${bien.type_offre === 'vente' ? 'Vente' : bien.type_offre === 'location' ? 'Location' : bien.type_offre}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/15 text-white">${bien.type_bien}</span>
                    ${bien.est_booste ? '<span class="px-2 py-0.5 rounded-full text-[10px] bg-accent-500/80 text-white font-semibold">Boost</span>' : ''}
                </div>
                <h3 class="text-white font-semibold text-base leading-tight mb-1 line-clamp-2">${bien.titre}</h3>
                ${localisation ? `<p class="text-white/80 text-xs mb-1.5 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
                    ${localisation}
                </p>` : ''}
                <div class="flex items-center gap-3 text-white/90">
                    <span class="text-lg font-bold text-accent-400">${prixFormate} ${bien.devise || 'USD'}</span>
                    ${bien.nombre_chambres ? `<span class="text-xs bg-white/10 px-2 py-0.5 rounded">${bien.nombre_chambres} ch.</span>` : ''}
                </div>
            </div>

            <!-- Boutons latéraux (à droite) -->
            <div class="absolute right-2 bottom-[100px] flex flex-col items-center gap-4 z-20 md:bottom-[70px] md:right-4">
                <!-- Photo agent -->
                <button onclick="event.stopPropagation();EsikaTok.voirAgent(${bien.agent_id})" class="w-11 h-11 rounded-full overflow-hidden border-2 border-white/80 shadow-lg">
                    ${bien.agent_photo ? `<img src="${bien.agent_photo}" class="w-full h-full object-cover" alt="">` :
                    `<div class="w-full h-full bg-primaire-600 flex items-center justify-center text-white text-sm font-bold">${(bien.agent_nom || 'A').charAt(0)}</div>`}
                </button>
                <!-- Favori -->
                <button onclick="event.stopPropagation();EsikaTok.toggleFavori(${bien.id}, this)" class="flex flex-col items-center group">
                    <div class="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                        <svg class="w-6 h-6 ${bien.est_favori ? 'text-red-500 fill-current' : 'text-white'} group-hover:scale-110 transition-transform" fill="${bien.est_favori ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    </div>
                    <span class="text-white text-[10px] mt-0.5">${bien.nombre_favoris || 0}</span>
                </button>
                <!-- Message -->
                <button onclick="event.stopPropagation();EsikaTok.contacterAgent(${bien.id})" class="flex flex-col items-center group">
                    <div class="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                        <svg class="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    </div>
                    <span class="text-white text-[10px] mt-0.5">Contact</span>
                </button>
                <!-- Localisation -->
                <button onclick="event.stopPropagation();${aCoords ? `window.open('https://www.google.com/maps?q=${bien.latitude},${bien.longitude}','_blank')` : `window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localisation)}','_blank')`}" class="flex flex-col items-center group">
                    <div class="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                        <svg class="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
                    </div>
                    <span class="text-white text-[10px] mt-0.5">Lieu</span>
                </button>
                <!-- Partager -->
                <button onclick="event.stopPropagation();EsikaTok.partagerBien(${bien.id}, '${encodeURIComponent(bien.titre)}')" class="flex flex-col items-center group">
                    <div class="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                        <svg class="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                    </div>
                    <span class="text-white text-[10px] mt-0.5">Partager</span>
                </button>
            </div>

            <!-- Son (toggle mute, bas-droite) -->
            <button onclick="event.stopPropagation();EsikaTok.toggleMute(this)" class="btn-mute absolute bottom-[72px] right-2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center md:bottom-[52px] md:right-4">
                <svg class="icone-mute w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
            </button>

            <!-- Toucher pour voir détail -->
            <button onclick="event.stopPropagation();EsikaTok.voirDetail(${bien.id})" class="absolute bottom-[76px] left-3 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-white text-xs font-medium hover:bg-white/25 transition z-20 md:bottom-[56px] md:left-6">
                Voir détail &rarr;
            </button>
        </div>`;
    }

    /* --- Modal générique --- */
    function ouvrirModal(contenu, options = {}) {
        fermerModal();
        const modal = document.createElement('div');
        modal.id = 'modal-global';
        modal.className = 'modal-overlay fixed inset-0 z-[90] flex items-end md:items-center justify-center';
        modal.innerHTML = `
        <div class="bg-sombre-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl glissement-haut ${options.pleinEcran ? 'h-full rounded-none md:rounded-2xl' : ''}">
            <div class="sticky top-0 z-10 bg-sombre-800 px-4 py-3 flex items-center justify-between border-b border-sombre-700/50">
                <h3 class="font-semibold text-base">${options.titre || ''}</h3>
                <button onclick="Composants.fermerModal()" class="p-1 rounded-full hover:bg-sombre-700 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="p-4">${contenu}</div>
        </div>`;
        modal.addEventListener('click', (e) => { if (e.target === modal) fermerModal(); });
        document.body.appendChild(modal);
    }

    function fermerModal() {
        const modal = document.getElementById('modal-global');
        if (modal) modal.remove();
    }

    /* --- Champ de formulaire --- */
    function champFormulaire(id, label, type = 'text', options = {}) {
        const required = options.obligatoire ? 'required' : '';
        const placeholder = options.placeholder || '';
        if (type === 'select') {
            const optionsHtml = (options.options || []).map(o =>
                `<option value="${o.valeur}">${o.label}</option>`
            ).join('');
            return `
            <div class="mb-3">
                <label for="${id}" class="block text-xs font-medium text-sombre-200 mb-1">${label}</label>
                <select id="${id}" name="${id}" class="w-full px-3 py-2.5 bg-sombre-700 border border-sombre-600 rounded-xl text-sm text-white focus:border-primaire-500 focus:outline-none transition" ${required}>
                    <option value="">${placeholder || 'Sélectionner...'}</option>
                    ${optionsHtml}
                </select>
            </div>`;
        }
        if (type === 'textarea') {
            return `
            <div class="mb-3">
                <label for="${id}" class="block text-xs font-medium text-sombre-200 mb-1">${label}</label>
                <textarea id="${id}" name="${id}" rows="${options.lignes || 3}" placeholder="${placeholder}" class="w-full px-3 py-2.5 bg-sombre-700 border border-sombre-600 rounded-xl text-sm text-white focus:border-primaire-500 focus:outline-none transition resize-none" ${required}></textarea>
            </div>`;
        }
        return `
        <div class="mb-3">
            <label for="${id}" class="block text-xs font-medium text-sombre-200 mb-1">${label}</label>
            <input type="${type}" id="${id}" name="${id}" placeholder="${placeholder}" class="w-full px-3 py-2.5 bg-sombre-700 border border-sombre-600 rounded-xl text-sm text-white focus:border-primaire-500 focus:outline-none transition" ${required} ${options.min ? `min="${options.min}"` : ''} ${options.max ? `max="${options.max}"` : ''}>
        </div>`;
    }

    /* --- Bouton --- */
    function bouton(texte, onclick, options = {}) {
        const variantes = {
            primaire: 'bg-primaire-600 hover:bg-primaire-700 text-white',
            secondaire: 'bg-sombre-700 hover:bg-sombre-600 text-sombre-100 border border-sombre-600',
            danger: 'bg-red-600 hover:bg-red-700 text-white',
            accent: 'bg-accent-500 hover:bg-accent-600 text-white',
        };
        const cls = variantes[options.variante || 'primaire'];
        const plein = options.plein ? 'w-full' : '';
        return `<button onclick="${onclick}" class="${cls} ${plein} px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${options.classe || ''}" ${options.desactive ? 'disabled' : ''}>${texte}</button>`;
    }

    /* --- En-tête de sous-page avec bouton retour --- */
    function enTetePage(titre, options = {}) {
        return `
        <div class="sticky top-0 z-20 bg-sombre-900/95 backdrop-blur-md border-b border-sombre-700/50">
            <div class="flex items-center h-12 px-3 max-w-lg mx-auto">
                <button onclick="${options.retour || 'EsikaTok.retour()'}" class="p-1.5 -ml-1 rounded-full hover:bg-sombre-800 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <h1 class="flex-1 text-center font-semibold text-sm truncate">${titre}</h1>
                ${options.droite || '<div class="w-8"></div>'}
            </div>
        </div>`;
    }

    /* --- Carte bien compacte pour grille --- */
    function carteBienMini(bien, options = {}) {
        const prixF = new Intl.NumberFormat('fr-FR').format(bien.prix);
        const loc = [bien.quartier_nom || bien.quartier_texte, bien.commune_nom, bien.ville_nom].filter(Boolean).join(', ');
        const clicAction = options.onclick || `EsikaTok.naviguer('detail',{id:${bien.id}})`;
        return `
        <div onclick="${clicAction}" class="bg-sombre-800 rounded-xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-primaire-500/50 transition group">
            <div class="aspect-[3/4] bg-sombre-700 relative overflow-hidden">
                ${bien.miniature_url ? `<img src="${bien.miniature_url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" loading="lazy">` :
                `<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-sombre-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>`}
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                    <p class="text-white text-xs font-medium line-clamp-1">${bien.titre}</p>
                    <p class="text-accent-400 text-xs font-bold mt-0.5">${prixF} USD</p>
                </div>
                ${bien.est_booste ? '<span class="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-accent-500 rounded text-[8px] font-bold text-white">⚡</span>' : ''}
            </div>
            <div class="px-2 py-1.5">
                <p class="text-[10px] text-sombre-200 truncate flex items-center gap-1">
                    <svg class="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                    ${loc}
                </p>
            </div>
        </div>`;
    }

    /* --- Carte bien format liste --- */
    function carteBienListe(bien, options = {}) {
        const prixF = new Intl.NumberFormat('fr-FR').format(bien.prix);
        return `
        <div onclick="${options.onclick || `EsikaTok.naviguer('detail',{id:${bien.id}})`}" class="flex gap-3 p-3 bg-sombre-800 rounded-xl cursor-pointer hover:bg-sombre-700/80 transition">
            <div class="w-20 h-24 bg-sombre-700 rounded-lg overflow-hidden flex-shrink-0">
                ${bien.miniature_url ? `<img src="${bien.miniature_url}" class="w-full h-full object-cover" loading="lazy">` :
                `<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-sombre-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>`}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">${bien.titre}</p>
                <p class="text-xs text-accent-400 font-bold mt-0.5">${prixF} USD</p>
                <p class="text-[10px] text-sombre-200 mt-0.5 truncate">${[bien.quartier_nom || bien.quartier_texte, bien.commune_nom, bien.ville_nom].filter(Boolean).join(', ')}</p>
                ${options.extra || ''}
            </div>
            ${options.droite || ''}
        </div>`;
    }

    /* --- Badge statut coloré --- */
    function badgeStatut(statut) {
        const map = {
            brouillon:'bg-gray-500/20 text-gray-400', en_attente:'bg-yellow-500/20 text-yellow-400',
            publie:'bg-green-500/20 text-green-400', refuse:'bg-red-500/20 text-red-400',
            suspendu:'bg-orange-500/20 text-orange-400', actif:'bg-green-500/20 text-green-400',
            essai:'bg-blue-500/20 text-blue-400', expire:'bg-red-500/20 text-red-400',
            annule:'bg-gray-500/20 text-gray-400', reussie:'bg-green-500/20 text-green-400',
            echouee:'bg-red-500/20 text-red-400', en_cours:'bg-yellow-500/20 text-yellow-400',
        };
        const labels = {
            brouillon:'Brouillon', en_attente:'En attente', publie:'Publié', refuse:'Refusé',
            suspendu:'Suspendu', actif:'Actif', essai:'Essai', expire:'Expiré', annule:'Annulé',
            reussie:'Réussie', echouee:'Échouée', en_cours:'En cours',
        };
        const cls = map[statut] || 'bg-gray-500/20 text-gray-400';
        return `<span class="${cls} px-2 py-0.5 rounded-full text-[10px] font-medium">${labels[statut] || statut}</span>`;
    }

    /* --- Dialogue de confirmation --- */
    function confirmer(message, callbackOui) {
        ouvrirModal(`
        <div class="text-center py-2">
            <p class="text-sm text-sombre-200 mb-4">${message}</p>
            <div class="flex gap-3">
                ${bouton('Annuler', 'Composants.fermerModal()', { variante:'secondaire', plein:true })}
                ${bouton('Confirmer', callbackOui, { variante:'danger', plein:true })}
            </div>
        </div>`, { titre: 'Confirmation' });
    }

    /* --- Squelette de chargement --- */
    function squelette(lignes = 3) {
        return `<div class="animate-pulse space-y-3 py-4 px-1">${Array.from({length: lignes}, (_, i) =>
            `<div class="h-3 bg-sombre-700 rounded-lg ${i === lignes - 1 ? 'w-3/4' : 'w-full'}"></div>`
        ).join('')}</div>`;
    }

    /* --- Section de menu profil --- */
    function menuItem(icone, label, onclick, options = {}) {
        return `
        <button onclick="${onclick}" class="w-full flex items-center justify-between ${options.danger ? 'bg-red-900/20 hover:bg-red-900/30' : 'bg-sombre-800 hover:bg-sombre-700'} rounded-xl p-4 transition">
            <div class="flex items-center gap-3">
                <div class="${options.danger ? 'text-red-400' : options.couleur || 'text-sombre-200'}">${icone}</div>
                <span class="text-sm ${options.danger ? 'text-red-400' : 'text-white'} font-medium">${label}</span>
            </div>
            ${options.badge || '<svg class="w-4 h-4 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>'}
        </button>`;
    }

    /* --- Formater prix --- */
    function formatPrix(prix, devise = 'USD') {
        return `${new Intl.NumberFormat('fr-FR').format(prix)} ${devise}`;
    }

    /* --- Formater date relative (WhatsApp-style conversation list) --- */
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const maintenant = new Date();
        const auj = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
        const hier = new Date(auj); hier.setDate(hier.getDate() - 1);
        const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (jour.getTime() === auj.getTime()) {
            return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }
        if (jour.getTime() === hier.getTime()) return 'Hier';
        const diffJours = Math.floor((auj - jour) / 86400000);
        if (diffJours < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }

    return {
        afficherToast, loader, etatVide, carteVideo,
        ouvrirModal, fermerModal, champFormulaire, bouton,
        enTetePage, carteBienMini, carteBienListe, badgeStatut,
        confirmer, squelette, menuItem, formatPrix, formatDate,
    };
})();
