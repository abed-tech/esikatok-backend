/**
 * Pages/vues de l'application EsikaTok - Frontend Utilisateur.
 * Chaque fonction retourne le HTML d'une page complète.
 */
const Pages = (() => {

    /* ========================================
       PAGE ACCUEIL - Fil vidéo vertical
       ======================================== */
    function accueil() {
        return `
        <div id="fil-video" class="fil-video h-full w-full">
            <div id="conteneur-cartes" class="flex flex-col"></div>
            <div id="loader-fil" class="flex justify-center py-8">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserAccueil() {
        const conteneur = document.getElementById('conteneur-cartes');
        const loaderEl = document.getElementById('loader-fil');
        if (!conteneur) return;

        EtatApp.definir('pageFil', 1);
        EtatApp.definir('filTermine', false);
        conteneur.innerHTML = '';

        await chargerPlusDeVideos();

        // Scroll infini
        const filEl = document.getElementById('fil-video');
        if (filEl) {
            filEl.addEventListener('scroll', async () => {
                if (EtatApp.obtenir('chargementEnCours') || EtatApp.obtenir('filTermine')) return;
                if (filEl.scrollTop + filEl.clientHeight >= filEl.scrollHeight - 500) {
                    await chargerPlusDeVideos();
                }
            });

            // Observer pour autoplay
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const video = entry.target.querySelector('.video-lecteur');
                    if (!video) return;
                    if (entry.isIntersecting) {
                        if (!video.src && video.dataset.src) video.src = video.dataset.src;
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                });
            }, { threshold: 0.6 });

            document.querySelectorAll('.carte-video').forEach(c => observer.observe(c));
            EtatApp.definir('_observerFil', observer);
        }
    }

    async function chargerPlusDeVideos() {
        if (EtatApp.obtenir('chargementEnCours')) return;
        EtatApp.definir('chargementEnCours', true);

        try {
            const page = EtatApp.obtenir('pageFil');
            const donnees = await ApiEsikaTok.biens.fil(page);
            const biens = donnees.results || donnees;
            const conteneur = document.getElementById('conteneur-cartes');
            const loaderEl = document.getElementById('loader-fil');

            if (!biens || biens.length === 0) {
                EtatApp.definir('filTermine', true);
                if (loaderEl) loaderEl.innerHTML = page === 1 ?
                    Composants.etatVide(
                        '<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
                        'Aucune vidéo disponible pour le moment.'
                    ) : '<p class="text-center text-sombre-200 text-sm py-4">Fin du fil</p>';
                return;
            }

            const existants = EtatApp.obtenir('biensFil');
            const indexDebut = existants.length;
            EtatApp.definir('biensFil', [...existants, ...biens]);

            biens.forEach((bien, i) => {
                conteneur.insertAdjacentHTML('beforeend', Composants.carteVideo(bien, indexDebut + i));
            });

            // Observer les nouvelles cartes
            const observer = EtatApp.obtenir('_observerFil');
            if (observer) {
                conteneur.querySelectorAll('.carte-video:not([data-observed])').forEach(c => {
                    observer.observe(c);
                    c.setAttribute('data-observed', '1');
                });
            }

            EtatApp.definir('pageFil', page + 1);
            if (!donnees.next) EtatApp.definir('filTermine', true);
            if (loaderEl && EtatApp.obtenir('filTermine')) loaderEl.innerHTML = '';
        } catch (e) {
            console.error('Erreur chargement fil:', e);
        } finally {
            EtatApp.definir('chargementEnCours', false);
        }
    }

    /* ========================================
       PAGE RECHERCHE
       ======================================== */
    function recherche() {
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            <!-- Barre de recherche -->
            <div class="px-4 pt-4 pb-2 bg-sombre-900 sticky top-0 z-10">
                <div class="relative" onclick="Pages.ouvrirFiltres()">
                    <input type="text" id="barre-recherche" placeholder="Rechercher un bien immobilier..." readonly
                        class="w-full px-4 py-3 pl-10 bg-sombre-800 border border-sombre-700 rounded-2xl text-sm text-white placeholder-sombre-200 focus:outline-none cursor-pointer">
                    <svg class="absolute left-3 top-3.5 w-4 h-4 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
            </div>
            <!-- Résultats -->
            <div id="resultats-recherche" class="flex-1 overflow-y-auto px-3 pb-20">
                <p class="text-sombre-200 text-xs font-medium px-1 mb-2 mt-2">En vedette</p>
                <div id="grille-recherche" class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">${Composants.loader()}</div>
            </div>
        </div>`;
    }

    async function initialiserRecherche() {
        try {
            const biens = await ApiEsikaTok.recherche.boostes();
            afficherGrilleRecherche(biens);
        } catch (e) {
            document.getElementById('grille-recherche').innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
                'Impossible de charger les résultats.'
            );
        }
    }

    function afficherGrilleRecherche(biens) {
        const grille = document.getElementById('grille-recherche');
        if (!grille) return;
        if (!biens || biens.length === 0) {
            grille.innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
                'Aucun résultat trouvé.'
            );
            return;
        }
        grille.innerHTML = biens.map(b => `
            <div onclick="EsikaTok.voirDetail(${b.id})" class="bg-sombre-800 rounded-xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-primaire-500 transition group">
                <div class="aspect-[3/4] bg-sombre-700 relative overflow-hidden">
                    ${b.miniature_url ? `<img src="${b.miniature_url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="">` :
                    `<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-sombre-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>`}
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p class="text-white text-xs font-medium line-clamp-1">${b.titre}</p>
                        <p class="text-accent-400 text-xs font-bold">${new Intl.NumberFormat('fr-FR').format(b.prix)} USD</p>
                    </div>
                    ${b.est_booste ? '<span class="absolute top-1 right-1 px-1.5 py-0.5 bg-accent-500 rounded text-[8px] font-bold text-white">BOOST</span>' : ''}
                    ${b.score_pertinence ? `<span class="absolute top-1 left-1 px-1.5 py-0.5 bg-green-600 rounded text-[8px] font-bold text-white">${b.score_pertinence}%</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    function ouvrirFiltres() {
        const contenu = `
        <form id="form-filtres" class="space-y-1">
            ${Composants.champFormulaire('filtre-ville', 'Ville', 'select', { options: [], placeholder: 'Toutes les villes' })}
            ${Composants.champFormulaire('filtre-commune', 'Commune', 'select', { options: [], placeholder: 'Toutes les communes' })}
            ${Composants.champFormulaire('filtre-quartier', 'Quartier', 'select', { options: [], placeholder: 'Tous les quartiers' })}
            ${Composants.champFormulaire('filtre-type-bien', 'Type de bien', 'select', {
                options: [
                    {valeur:'appartement',label:'Appartement'},{valeur:'maison',label:'Maison'},
                    {valeur:'terrain',label:'Terrain'},{valeur:'bureau',label:'Bureau/Commerce'},
                    {valeur:'studio',label:'Studio'},{valeur:'villa',label:'Villa'},
                    {valeur:'duplex',label:'Duplex'},{valeur:'immeuble',label:'Immeuble'},
                ]
            })}
            ${Composants.champFormulaire('filtre-type-offre', 'Type d\'offre', 'select', {
                options: [
                    {valeur:'vente',label:'Vente'},{valeur:'location',label:'Location'},
                    {valeur:'colocation',label:'Colocation'},{valeur:'location_meublee',label:'Location meublée'},
                ]
            })}
            ${Composants.champFormulaire('filtre-prix-max', 'Prix maximum (USD)', 'number', { placeholder: 'Ex: 500', min: '0' })}
            ${Composants.champFormulaire('filtre-chambres', 'Chambres minimum', 'number', { placeholder: 'Ex: 2', min: '0' })}
            <div class="pt-2">
                ${Composants.bouton('Rechercher', 'Pages.lancerRecherche()', { variante: 'primaire', plein: true })}
            </div>
        </form>`;
        Composants.ouvrirModal(contenu, { titre: 'Filtrer les biens' });

        // Charger les villes
        ApiEsikaTok.localisations.villes().then(villes => {
            const sel = document.getElementById('filtre-ville');
            if (sel) {
                villes.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.id; opt.textContent = v.nom;
                    sel.appendChild(opt);
                });
                sel.addEventListener('change', async () => {
                    const communeSel = document.getElementById('filtre-commune');
                    const quartierSel = document.getElementById('filtre-quartier');
                    communeSel.innerHTML = '<option value="">Toutes les communes</option>';
                    quartierSel.innerHTML = '<option value="">Tous les quartiers</option>';
                    if (sel.value) {
                        const communes = await ApiEsikaTok.localisations.communes(sel.value);
                        communes.forEach(c => {
                            const opt = document.createElement('option');
                            opt.value = c.id; opt.textContent = c.nom;
                            communeSel.appendChild(opt);
                        });
                    }
                });
                document.getElementById('filtre-commune').addEventListener('change', async function() {
                    const quartierSel = document.getElementById('filtre-quartier');
                    quartierSel.innerHTML = '<option value="">Tous les quartiers</option>';
                    if (this.value) {
                        const quartiers = await ApiEsikaTok.localisations.quartiers(this.value);
                        quartiers.forEach(q => {
                            const opt = document.createElement('option');
                            opt.value = q.id; opt.textContent = q.nom;
                            quartierSel.appendChild(opt);
                        });
                    }
                });
            }
        });
    }

    async function lancerRecherche() {
        const params = {};
        const ville = document.getElementById('filtre-ville')?.value;
        const commune = document.getElementById('filtre-commune')?.value;
        const quartier = document.getElementById('filtre-quartier')?.value;
        const typeBien = document.getElementById('filtre-type-bien')?.value;
        const typeOffre = document.getElementById('filtre-type-offre')?.value;
        const prixMax = document.getElementById('filtre-prix-max')?.value;
        const chambres = document.getElementById('filtre-chambres')?.value;

        if (ville) params.ville = ville;
        if (commune) params.commune = commune;
        if (quartier) params.quartier = quartier;
        if (typeBien) params.type_bien = typeBien;
        if (typeOffre) params.type_offre = typeOffre;
        if (prixMax) params.prix_max = prixMax;
        if (chambres) params.chambres_min = chambres;

        Composants.fermerModal();
        document.getElementById('grille-recherche').innerHTML = Composants.loader();

        try {
            const donnees = await ApiEsikaTok.recherche.chercher(params);
            const biens = donnees.results || donnees;
            document.querySelector('#resultats-recherche > p').textContent = `${biens.length} résultat(s)`;
            afficherGrilleRecherche(biens);
        } catch (e) {
            Composants.afficherToast('Erreur lors de la recherche.', 'erreur');
        }
    }

    /* ========================================
       PAGE PUBLIER
       ======================================== */
    function publier() {
        if (!EtatApp.estConnecte()) {
            return pageConnexionRequise('publier un bien');
        }
        if (!EtatApp.estAgent()) {
            return `
            <div class="h-full flex flex-col items-center justify-center px-6 text-center">
                <div class="w-20 h-20 bg-primaire-600/20 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-10 h-10 text-primaire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
                <h2 class="text-xl font-bold text-white mb-2">Publication réservée aux agents</h2>
                <p class="text-sombre-200 text-sm mb-6 max-w-sm">Seuls les agents immobiliers certifiés peuvent publier des biens sur EsikaTok. Contactez un agent pour faire publier votre bien.</p>
                ${Composants.bouton('Parcourir les biens', "EsikaTok.naviguer('accueil')", { variante: 'primaire' })}
            </div>`;
        }
        return formulairePublication();
    }

    function formulairePublication() {
        return `
        <div class="h-full overflow-y-auto pb-24">
            <div class="px-4 pt-4 pb-2">
                <h2 class="text-lg font-bold text-white mb-1">Publier un bien</h2>
                <p class="text-sombre-200 text-xs mb-4">Remplissez les informations et ajoutez une vidéo</p>
            </div>
            <form id="form-publication" class="px-4 space-y-1" onsubmit="return false;">
                <!-- Vidéo -->
                <div class="mb-4">
                    <label class="block text-xs font-medium text-sombre-200 mb-1">Vidéo du bien *</label>
                    <div id="zone-upload-video" class="border-2 border-dashed border-sombre-600 rounded-xl p-6 text-center cursor-pointer hover:border-primaire-500 transition" onclick="document.getElementById('input-video').click()">
                        <svg class="w-10 h-10 mx-auto text-sombre-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        <p class="text-sm text-sombre-200">Cliquez pour ajouter une vidéo</p>
                        <p class="text-xs text-sombre-700 mt-1">MP4, WebM, MOV - Max 100 Mo</p>
                    </div>
                    <input type="file" id="input-video" accept="video/*" class="hidden" onchange="Pages.previsualiserVideo(this)">
                    <div id="apercu-video" class="hidden mt-2 rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-48"></div>
                </div>
                ${Composants.champFormulaire('pub-titre', 'Titre *', 'text', { obligatoire: true, placeholder: 'Ex: Bel appartement 3 chambres à Gombe' })}
                ${Composants.champFormulaire('pub-description', 'Description *', 'textarea', { obligatoire: true, placeholder: 'Décrivez le bien en détail...', lignes: 4 })}
                ${Composants.champFormulaire('pub-type-bien', 'Type de bien *', 'select', {
                    obligatoire: true,
                    options: [
                        {valeur:'appartement',label:'Appartement'},{valeur:'maison',label:'Maison'},
                        {valeur:'terrain',label:'Terrain'},{valeur:'bureau',label:'Bureau/Commerce'},
                        {valeur:'studio',label:'Studio'},{valeur:'villa',label:'Villa'},
                        {valeur:'duplex',label:'Duplex'},{valeur:'immeuble',label:'Immeuble'},
                    ]
                })}
                ${Composants.champFormulaire('pub-type-offre', 'Type d\'offre *', 'select', {
                    obligatoire: true,
                    options: [
                        {valeur:'vente',label:'Vente'},{valeur:'location',label:'Location'},
                        {valeur:'colocation',label:'Colocation'},{valeur:'location_meublee',label:'Location meublée'},
                    ]
                })}
                ${Composants.champFormulaire('pub-prix', 'Prix (USD) *', 'number', { obligatoire: true, placeholder: 'Ex: 500', min: '0' })}
                <div class="grid grid-cols-2 gap-3">
                    ${Composants.champFormulaire('pub-chambres', 'Chambres', 'number', { min: '0' })}
                    ${Composants.champFormulaire('pub-salles-bain', 'Salles de bain', 'number', { min: '0' })}
                </div>
                ${Composants.champFormulaire('pub-surface', 'Surface (m²)', 'number', { min: '0' })}

                <p class="text-xs font-semibold text-primaire-400 mt-4 mb-2">Localisation</p>
                ${Composants.champFormulaire('pub-ville', 'Ville *', 'select', { obligatoire: true })}
                ${Composants.champFormulaire('pub-commune', 'Commune *', 'select', { obligatoire: true })}
                ${Composants.champFormulaire('pub-quartier', 'Quartier', 'select', {})}
                ${Composants.champFormulaire('pub-avenue', 'Avenue / Rue', 'text', { placeholder: 'Ex: Avenue de la Libération' })}

                <div class="flex gap-3 pt-4 pb-4">
                    ${Composants.bouton('Enregistrer brouillon', "Pages.sauvegarderBien('brouillon')", { variante: 'secondaire', plein: true })}
                    ${Composants.bouton('Soumettre', "Pages.sauvegarderBien('soumettre')", { variante: 'primaire', plein: true })}
                </div>
            </form>
        </div>`;
    }

    async function initialiserPublier() {
        if (!EtatApp.estAgent()) return;
        try {
            const villes = await ApiEsikaTok.localisations.villes();
            const selVille = document.getElementById('pub-ville');
            if (!selVille) return;
            villes.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id; opt.textContent = v.nom;
                selVille.appendChild(opt);
            });
            selVille.addEventListener('change', async () => {
                const selCommune = document.getElementById('pub-commune');
                const selQuartier = document.getElementById('pub-quartier');
                selCommune.innerHTML = '<option value="">Sélectionner...</option>';
                selQuartier.innerHTML = '<option value="">Sélectionner...</option>';
                if (selVille.value) {
                    const communes = await ApiEsikaTok.localisations.communes(selVille.value);
                    communes.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id; opt.textContent = c.nom;
                        selCommune.appendChild(opt);
                    });
                }
            });
            document.getElementById('pub-commune')?.addEventListener('change', async function() {
                const selQuartier = document.getElementById('pub-quartier');
                selQuartier.innerHTML = '<option value="">Sélectionner...</option>';
                if (this.value) {
                    const quartiers = await ApiEsikaTok.localisations.quartiers(this.value);
                    quartiers.forEach(q => {
                        const opt = document.createElement('option');
                        opt.value = q.id; opt.textContent = q.nom;
                        selQuartier.appendChild(opt);
                    });
                }
            });
        } catch (e) { console.error('Erreur init publier:', e); }
    }

    function previsualiserVideo(input) {
        const fichier = input.files[0];
        if (!fichier) return;
        const apercu = document.getElementById('apercu-video');
        const zone = document.getElementById('zone-upload-video');
        apercu.innerHTML = `<video src="${URL.createObjectURL(fichier)}" class="w-full h-full object-cover" controls></video>`;
        apercu.classList.remove('hidden');
        zone.innerHTML = `<p class="text-sm text-green-400">✓ ${fichier.name}</p><p class="text-xs text-sombre-200 mt-1">Cliquez pour changer</p>`;
    }

    async function sauvegarderBien(action) {
        const formData = new FormData();
        const videoFile = document.getElementById('input-video')?.files[0];
        if (videoFile) formData.append('fichier_video', videoFile);

        formData.append('titre', document.getElementById('pub-titre')?.value || '');
        formData.append('description', document.getElementById('pub-description')?.value || '');
        formData.append('type_bien', document.getElementById('pub-type-bien')?.value || '');
        formData.append('type_offre', document.getElementById('pub-type-offre')?.value || '');
        formData.append('prix', document.getElementById('pub-prix')?.value || '0');
        formData.append('nombre_chambres', document.getElementById('pub-chambres')?.value || '0');
        formData.append('nombre_salles_bain', document.getElementById('pub-salles-bain')?.value || '0');
        const surface = document.getElementById('pub-surface')?.value;
        if (surface) formData.append('surface_m2', surface);
        formData.append('ville', document.getElementById('pub-ville')?.value || '');
        formData.append('commune', document.getElementById('pub-commune')?.value || '');
        const quartier = document.getElementById('pub-quartier')?.value;
        if (quartier) formData.append('quartier', quartier);
        const avenue = document.getElementById('pub-avenue')?.value;
        if (avenue) formData.append('avenue', avenue);

        try {
            const bien = await ApiEsikaTok.biens.creer(formData);
            if (action === 'soumettre' && bien.id) {
                await ApiEsikaTok.biens.soumettre(bien.id);
                Composants.afficherToast('Bien soumis pour modération !', 'succes');
            } else {
                Composants.afficherToast('Brouillon enregistré.', 'succes');
            }
            EsikaTok.naviguer('profil');
        } catch (e) {
            const msg = e.erreur || e.detail || Object.values(e).flat().join(', ') || 'Erreur lors de la publication.';
            Composants.afficherToast(msg, 'erreur');
        }
    }

    /* ========================================
       PAGE MESSAGES
       ======================================== */
    function messages() {
        if (!EtatApp.estConnecte()) return pageConnexionRequise('accéder à vos messages');
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            <div class="px-4 pt-4 pb-2 border-b border-sombre-700/50">
                <h2 class="text-lg font-bold text-white">Messages</h2>
            </div>
            <div id="liste-conversations" class="flex-1 overflow-y-auto pb-20">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserMessages() {
        if (!EtatApp.estConnecte()) return;
        try {
            const conversations = await ApiEsikaTok.messagerie.conversations();
            const liste = document.getElementById('liste-conversations');
            if (!liste) return;
            const convs = conversations.results || conversations;
            if (!convs || convs.length === 0) {
                liste.innerHTML = Composants.etatVide(
                    '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
                    'Aucune conversation. Contactez un agent depuis un bien pour commencer.'
                );
                return;
            }
            liste.innerHTML = convs.map(c => {
                const autre = c.initiateur?.id === EtatApp.obtenir('utilisateur')?.id ? c.agent : c.initiateur;
                const dernierMsg = c.dernier_message;
                return `
                <div onclick="Pages.ouvrirConversation(${c.id})" class="flex items-center gap-3 px-4 py-3 hover:bg-sombre-800 cursor-pointer border-b border-sombre-800/50 transition">
                    <div class="w-11 h-11 rounded-full bg-primaire-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                        ${autre?.photo ? `<img src="${autre.photo}" class="w-full h-full object-cover">` : (autre?.prenom || 'U').charAt(0)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-sm text-white truncate">${autre?.prenom || ''} ${autre?.nom || ''}</span>
                            <span class="text-[10px] text-sombre-200 flex-shrink-0">${dernierMsg ? new Date(dernierMsg.date_envoi).toLocaleDateString('fr') : ''}</span>
                        </div>
                        <p class="text-xs text-sombre-200 truncate">${c.bien_titre ? `📍 ${c.bien_titre}` : ''}</p>
                        <p class="text-xs text-sombre-200 truncate mt-0.5">${dernierMsg ? dernierMsg.contenu : 'Aucun message'}</p>
                    </div>
                    ${c.messages_non_lus > 0 ? `<span class="w-5 h-5 bg-primaire-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold flex-shrink-0">${c.messages_non_lus}</span>` : ''}
                </div>`;
            }).join('');
        } catch (e) {
            console.error('Erreur messages:', e);
        }
    }

    async function ouvrirConversation(convId) {
        const contenu = `<div id="zone-messages" class="flex flex-col h-[60vh]">
            <div id="liste-messages" class="flex-1 overflow-y-auto space-y-2 mb-3">${Composants.loader()}</div>
            <div class="flex gap-2">
                <input type="text" id="input-message" placeholder="Écrire un message..." class="flex-1 px-3 py-2.5 bg-sombre-700 border border-sombre-600 rounded-xl text-sm text-white focus:outline-none focus:border-primaire-500">
                <button onclick="Pages.envoyerMessage(${convId})" class="px-4 py-2.5 bg-primaire-600 rounded-xl text-sm text-white font-medium hover:bg-primaire-700 transition">Envoyer</button>
            </div>
        </div>`;
        Composants.ouvrirModal(contenu, { titre: 'Conversation', pleinEcran: true });

        try {
            const donnees = await ApiEsikaTok.messagerie.messages(convId);
            const liste = document.getElementById('liste-messages');
            if (!liste) return;
            const msgs = donnees.messages || [];
            if (msgs.length === 0) {
                liste.innerHTML = '<p class="text-center text-sombre-200 text-sm py-4">Aucun message.</p>';
                return;
            }
            liste.innerHTML = msgs.map(m => `
                <div class="flex ${m.est_moi ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.est_moi ? 'bg-primaire-600 text-white rounded-br-md' : 'bg-sombre-700 text-sombre-100 rounded-bl-md'}">
                        <p>${m.contenu}</p>
                        <p class="text-[10px] mt-1 opacity-60">${new Date(m.date_envoi).toLocaleTimeString('fr', {hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                </div>
            `).join('');
            liste.scrollTop = liste.scrollHeight;
        } catch (e) {
            console.error('Erreur ouverture conversation:', e);
        }

        document.getElementById('input-message')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') Pages.envoyerMessage(convId);
        });
    }

    async function envoyerMessage(convId) {
        const input = document.getElementById('input-message');
        const contenu = input?.value?.trim();
        if (!contenu) return;
        input.value = '';
        try {
            await ApiEsikaTok.messagerie.envoyer(convId, contenu);
            ouvrirConversation(convId); // Recharger
        } catch (e) {
            Composants.afficherToast('Erreur lors de l\'envoi.', 'erreur');
        }
    }

    /* ========================================
       PAGE PROFIL
       ======================================== */
    function profil() {
        if (!EtatApp.estConnecte()) return pageConnexionRequise('voir votre profil');
        const u = EtatApp.obtenir('utilisateur');
        const estAgent = EtatApp.estAgent();

        return `
        <div class="h-full overflow-y-auto pb-24 bg-sombre-900">
            <!-- En-tête profil -->
            <div class="bg-gradient-to-b from-primaire-900/40 to-sombre-900 px-4 pt-6 pb-4">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full bg-primaire-600 flex items-center justify-center text-2xl font-bold text-white overflow-hidden flex-shrink-0">
                        ${u.photo ? `<img src="${u.photo}" class="w-full h-full object-cover">` : (u.prenom || 'U').charAt(0)}
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-white">${u.prenom || ''} ${u.nom || ''}</h2>
                        <p class="text-sm text-sombre-200">${u.email}</p>
                        <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${estAgent ? 'bg-accent-500/20 text-accent-400' : 'bg-primaire-500/20 text-primaire-400'}">
                            ${estAgent ? 'Agent immobilier' : 'Utilisateur'}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Sections -->
            <div class="px-4 mt-4 space-y-2">
                ${estAgent ? `
                <!-- Statistiques agent -->
                <div id="stats-agent" class="bg-sombre-800 rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-white mb-3">Performance</h3>
                    <div id="stats-contenu" class="grid grid-cols-2 gap-3">${Composants.loader('sm')}</div>
                </div>

                <!-- Abonnement -->
                <div id="section-abonnement" class="bg-sombre-800 rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-white mb-2">Mon abonnement</h3>
                    <div id="abonnement-contenu">${Composants.loader('sm')}</div>
                </div>

                <!-- Mes biens -->
                <button onclick="Pages.voirMesBiens()" class="w-full flex items-center justify-between bg-sombre-800 rounded-xl p-4 hover:bg-sombre-700 transition">
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-primaire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        <span class="text-sm text-white font-medium">Mes biens</span>
                    </div>
                    <svg class="w-4 h-4 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>

                <!-- Mes boosts -->
                <button onclick="Pages.voirMesBoosts()" class="w-full flex items-center justify-between bg-sombre-800 rounded-xl p-4 hover:bg-sombre-700 transition">
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        <span class="text-sm text-white font-medium">Mes boosts</span>
                    </div>
                    <svg class="w-4 h-4 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
                ` : ''}

                <!-- Favoris -->
                <button onclick="Pages.voirFavoris()" class="w-full flex items-center justify-between bg-sombre-800 rounded-xl p-4 hover:bg-sombre-700 transition">
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                        <span class="text-sm text-white font-medium">Mes favoris</span>
                    </div>
                    <svg class="w-4 h-4 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>

                <!-- Paramètres -->
                <button onclick="Pages.voirParametres()" class="w-full flex items-center justify-between bg-sombre-800 rounded-xl p-4 hover:bg-sombre-700 transition">
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <span class="text-sm text-white font-medium">Paramètres</span>
                    </div>
                    <svg class="w-4 h-4 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>

                <!-- Déconnexion -->
                <button onclick="EsikaTok.deconnecter()" class="w-full flex items-center gap-3 bg-red-900/20 rounded-xl p-4 hover:bg-red-900/30 transition mt-4">
                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    <span class="text-sm text-red-400 font-medium">Se déconnecter</span>
                </button>
            </div>
        </div>`;
    }

    async function initialiserProfil() {
        if (!EtatApp.estConnecte()) return;
        if (EtatApp.estAgent()) {
            // Charger stats
            try {
                const stats = await ApiEsikaTok.statistiques.agent();
                const el = document.getElementById('stats-contenu');
                if (el) {
                    el.innerHTML = `
                    <div class="text-center"><p class="text-xl font-bold text-white">${stats.biens?.publies || 0}</p><p class="text-[10px] text-sombre-200">Biens publiés</p></div>
                    <div class="text-center"><p class="text-xl font-bold text-white">${stats.engagement?.vues_totales || 0}</p><p class="text-[10px] text-sombre-200">Vues totales</p></div>
                    <div class="text-center"><p class="text-xl font-bold text-white">${stats.engagement?.favoris_totaux || 0}</p><p class="text-[10px] text-sombre-200">Favoris</p></div>
                    <div class="text-center"><p class="text-xl font-bold text-white">${stats.boosts?.actifs || 0}</p><p class="text-[10px] text-sombre-200">Boosts actifs</p></div>`;
                }
            } catch(e) {}
            // Charger abonnement
            try {
                const abo = await ApiEsikaTok.abonnements.monAbonnement();
                const el = document.getElementById('abonnement-contenu');
                if (el) {
                    if (abo.abonnement) {
                        const a = abo.abonnement;
                        const c = abo.cycle;
                        el.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-bold text-accent-400">${a.plan_detail?.nom?.toUpperCase() || 'N/A'}</span>
                            <span class="text-xs px-2 py-0.5 rounded-full ${a.est_actif_ou_essai ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${a.statut}</span>
                        </div>
                        <p class="text-xs text-sombre-200">Expire : ${new Date(a.date_fin).toLocaleDateString('fr')}</p>
                        ${c ? `<div class="mt-2 grid grid-cols-2 gap-2 text-center">
                            <div class="bg-sombre-700 rounded-lg p-2"><p class="text-sm font-bold">${c.publications_utilisees}/${a.plan_detail?.nombre_publications_max || '∞'}</p><p class="text-[10px] text-sombre-200">Publications</p></div>
                            <div class="bg-sombre-700 rounded-lg p-2"><p class="text-sm font-bold">${c.boosts_utilises}/${a.plan_detail?.nombre_boosts_inclus || '∞'}</p><p class="text-[10px] text-sombre-200">Boosts</p></div>
                        </div>` : ''}
                        <button onclick="Pages.voirPlans()" class="mt-3 text-xs text-primaire-400 hover:underline">Changer de plan →</button>`;
                    } else {
                        el.innerHTML = `<p class="text-sm text-sombre-200">Aucun abonnement actif.</p>
                        ${Composants.bouton('Voir les plans', "Pages.voirPlans()", { variante: 'primaire', plein: true, classe: 'mt-2' })}`;
                    }
                }
            } catch(e) {}
        }
    }

    async function voirFavoris() {
        Composants.ouvrirModal(Composants.loader(), { titre: 'Mes favoris', pleinEcran: true });
        try {
            const donnees = await ApiEsikaTok.favoris.liste();
            const favs = donnees.results || donnees;
            const modal = document.querySelector('#modal-global .p-4');
            if (!modal) return;
            if (!favs || favs.length === 0) {
                modal.innerHTML = Composants.etatVide('<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>', 'Aucun favori pour le moment.');
                return;
            }
            modal.innerHTML = `<div class="space-y-3">${favs.map(f => {
                const b = f.bien_detail || f;
                return `<div onclick="Composants.fermerModal(); EsikaTok.voirDetail(${b.id})" class="flex gap-3 p-3 bg-sombre-700 rounded-xl cursor-pointer hover:bg-sombre-600 transition">
                    <div class="w-16 h-20 bg-sombre-800 rounded-lg overflow-hidden flex-shrink-0">${b.miniature_url ? `<img src="${b.miniature_url}" class="w-full h-full object-cover">` : ''}</div>
                    <div class="flex-1 min-w-0"><p class="text-sm font-medium text-white truncate">${b.titre}</p><p class="text-xs text-accent-400 font-bold">${new Intl.NumberFormat('fr-FR').format(b.prix)} USD</p><p class="text-xs text-sombre-200">${b.commune_nom || ''}</p></div>
                </div>`;
            }).join('')}</div>`;
        } catch(e) { Composants.afficherToast('Erreur chargement favoris.', 'erreur'); }
    }

    async function voirMesBiens() {
        Composants.ouvrirModal(Composants.loader(), { titre: 'Mes biens', pleinEcran: true });
        try {
            const donnees = await ApiEsikaTok.biens.mesBiens();
            const biens = donnees.results || donnees;
            const modal = document.querySelector('#modal-global .p-4');
            if (!modal) return;
            if (!biens || biens.length === 0) {
                modal.innerHTML = Composants.etatVide('<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>', 'Aucun bien publié.');
                return;
            }
            const statutCouleurs = { brouillon: 'bg-gray-500', en_attente: 'bg-yellow-500', publie: 'bg-green-500', refuse: 'bg-red-500', suspendu: 'bg-orange-500' };
            modal.innerHTML = `<div class="space-y-3">${biens.map(b => `
                <div class="p-3 bg-sombre-700 rounded-xl">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-sm font-medium text-white truncate flex-1">${b.titre}</p>
                        <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] text-white ${statutCouleurs[b.statut] || 'bg-gray-500'}">${b.statut}</span>
                    </div>
                    <p class="text-xs text-accent-400 font-bold">${new Intl.NumberFormat('fr-FR').format(b.prix)} USD</p>
                    <p class="text-xs text-sombre-200">${b.commune_nom || ''} · ${b.type_offre}</p>
                    <div class="flex gap-2 mt-2 text-[10px]">
                        <span class="text-sombre-200">${b.nombre_vues || 0} vues</span>
                        <span class="text-sombre-200">${b.nombre_favoris || 0} favoris</span>
                        <span class="text-sombre-200">${b.est_booste ? '⚡ Boosté' : ''}</span>
                    </div>
                </div>`).join('')}</div>`;
        } catch(e) { Composants.afficherToast('Erreur.', 'erreur'); }
    }

    async function voirMesBoosts() {
        Composants.ouvrirModal(Composants.loader(), { titre: 'Mes boosts', pleinEcran: true });
        try {
            const donnees = await ApiEsikaTok.boosts.mesBoosts();
            const boosts = donnees.results || donnees;
            const modal = document.querySelector('#modal-global .p-4');
            if (!modal) return;
            if (!boosts || boosts.length === 0) {
                modal.innerHTML = Composants.etatVide('<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>', 'Aucun boost actif.');
                return;
            }
            modal.innerHTML = `<div class="space-y-3">${boosts.map(b => `
                <div class="p-3 bg-sombre-700 rounded-xl">
                    <p class="text-sm font-medium text-white">${b.video_titre || 'Vidéo'}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs px-2 py-0.5 rounded-full ${b.est_actif ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">${b.statut}</span>
                        <span class="text-xs text-sombre-200">${b.source === 'abonnement' ? 'Inclus' : 'Payant'}</span>
                    </div>
                    <p class="text-xs text-sombre-200 mt-1">Expire: ${new Date(b.date_fin).toLocaleDateString('fr')}</p>
                    <p class="text-xs text-sombre-200">${b.impressions} impressions · ${b.clics} clics</p>
                </div>`).join('')}</div>`;
        } catch(e) { Composants.afficherToast('Erreur.', 'erreur'); }
    }

    async function voirPlans() {
        Composants.ouvrirModal(Composants.loader(), { titre: 'Plans d\'abonnement' });
        try {
            const plans = await ApiEsikaTok.abonnements.plans();
            const modal = document.querySelector('#modal-global .p-4');
            if (!modal) return;
            modal.innerHTML = `<div class="space-y-3">${plans.map(p => `
                <div class="p-4 bg-sombre-700 rounded-xl border ${p.nom === 'premium' ? 'border-accent-500' : 'border-sombre-600'}">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-bold text-white">${p.nom.charAt(0).toUpperCase() + p.nom.slice(1)}</h4>
                        <span class="text-lg font-bold text-accent-400">${p.prix_mensuel_usd} USD<span class="text-xs font-normal text-sombre-200">/mois</span></span>
                    </div>
                    <ul class="space-y-1 text-xs text-sombre-200">
                        <li>📹 ${p.nombre_publications_max === 0 ? 'Publications illimitées' : p.nombre_publications_max + ' publications/mois'}</li>
                        <li>⚡ ${p.nombre_boosts_inclus === 0 ? 'Boosts illimités' : p.nombre_boosts_inclus + ' boosts/mois'}</li>
                        <li>💬 Messages illimités</li>
                    </ul>
                    ${Composants.bouton('Choisir ce plan', `Pages.souscrirePlan(${p.id})`, { variante: p.nom === 'premium' ? 'accent' : 'primaire', plein: true, classe: 'mt-3' })}
                </div>`).join('')}</div>`;
        } catch(e) { Composants.afficherToast('Erreur.', 'erreur'); }
    }

    async function souscrirePlan(planId) {
        try {
            const r = await ApiEsikaTok.abonnements.souscrire({ plan_id: planId, moyen_paiement: 'mpesa' });
            Composants.afficherToast(r.message || 'Abonnement activé !', 'succes');
            Composants.fermerModal();
            EsikaTok.naviguer('profil');
        } catch(e) {
            Composants.afficherToast(e.erreur || 'Erreur.', 'erreur');
        }
    }

    function voirParametres() {
        Composants.ouvrirModal(`
        <div class="space-y-3">
            <p class="text-sm text-sombre-200">Paramètres du compte</p>
            <div class="bg-sombre-700 rounded-xl p-4">
                <p class="text-xs text-sombre-200 mb-2">Modifier le profil</p>
                ${Composants.champFormulaire('param-nom', 'Nom', 'text', { placeholder: EtatApp.obtenir('utilisateur')?.nom })}
                ${Composants.champFormulaire('param-prenom', 'Prénom', 'text', { placeholder: EtatApp.obtenir('utilisateur')?.prenom })}
                ${Composants.champFormulaire('param-telephone', 'Téléphone', 'text', { placeholder: EtatApp.obtenir('utilisateur')?.telephone })}
                ${Composants.bouton('Enregistrer', "Pages.sauvegarderParametres()", { variante: 'primaire', plein: true })}
            </div>
        </div>`, { titre: 'Paramètres' });
    }

    async function sauvegarderParametres() {
        const donnees = {};
        const nom = document.getElementById('param-nom')?.value;
        const prenom = document.getElementById('param-prenom')?.value;
        const tel = document.getElementById('param-telephone')?.value;
        if (nom) donnees.nom = nom;
        if (prenom) donnees.prenom = prenom;
        if (tel) donnees.telephone = tel;
        try {
            const r = await ApiEsikaTok.profil.modifier(donnees);
            localStorage.setItem('esikatok_utilisateur', JSON.stringify(r));
            EtatApp.connecter(r);
            Composants.afficherToast('Profil mis à jour.', 'succes');
            Composants.fermerModal();
        } catch(e) { Composants.afficherToast('Erreur.', 'erreur'); }
    }

    /* ========================================
       PAGE CONNEXION / INSCRIPTION
       ======================================== */
    function pageConnexionRequise(action) {
        return `
        <div class="h-full flex flex-col items-center justify-center px-6 bg-sombre-900">
            <div class="w-full max-w-sm">
                <div class="text-center mb-6">
                    <h1 class="text-2xl font-bold text-white mb-1">EsikaTok</h1>
                    <p class="text-sm text-sombre-200">Connectez-vous pour ${action}</p>
                </div>
                <div id="zone-auth-form">
                    ${formulaireConnexion()}
                </div>
            </div>
        </div>`;
    }

    function formulaireConnexion() {
        return `
        <form id="form-connexion" onsubmit="return false;" class="space-y-1">
            ${Composants.champFormulaire('auth-email', 'Adresse e-mail', 'email', { obligatoire: true, placeholder: 'votre@email.com' })}
            ${Composants.champFormulaire('auth-mdp', 'Mot de passe', 'password', { obligatoire: true, placeholder: '••••••••' })}
            <div class="pt-2">
                ${Composants.bouton('Se connecter', 'Pages.soumettreConnexion()', { variante: 'primaire', plein: true })}
            </div>
            <p class="text-center text-sm text-sombre-200 mt-4">
                Pas de compte ? <button onclick="Pages.afficherInscription()" class="text-primaire-400 hover:underline">S'inscrire</button>
            </p>
            <p class="text-center text-sm text-sombre-200">
                Agent ? <button onclick="Pages.afficherInscriptionAgent()" class="text-accent-400 hover:underline">Inscription agent</button>
            </p>
        </form>`;
    }

    function afficherInscription() {
        const zone = document.getElementById('zone-auth-form');
        if (!zone) return;
        zone.innerHTML = `
        <form id="form-inscription" onsubmit="return false;" class="space-y-1">
            ${Composants.champFormulaire('reg-nom', 'Nom', 'text', { obligatoire: true })}
            ${Composants.champFormulaire('reg-prenom', 'Prénom', 'text', { obligatoire: true })}
            ${Composants.champFormulaire('reg-email', 'E-mail', 'email', { obligatoire: true })}
            ${Composants.champFormulaire('reg-telephone', 'Téléphone', 'text', {})}
            ${Composants.champFormulaire('reg-mdp', 'Mot de passe', 'password', { obligatoire: true })}
            ${Composants.champFormulaire('reg-mdp2', 'Confirmer le mot de passe', 'password', { obligatoire: true })}
            <div class="pt-2">
                ${Composants.bouton("S'inscrire", 'Pages.soumettreInscription()', { variante: 'primaire', plein: true })}
            </div>
            <p class="text-center text-sm text-sombre-200 mt-3">
                Déjà un compte ? <button onclick="Pages.afficherConnexion()" class="text-primaire-400 hover:underline">Se connecter</button>
            </p>
        </form>`;
    }

    function afficherInscriptionAgent() {
        const zone = document.getElementById('zone-auth-form');
        if (!zone) return;
        zone.innerHTML = `
        <form id="form-inscription-agent" onsubmit="return false;" class="space-y-1">
            <p class="text-xs text-accent-400 mb-2">✨ 30 jours d'essai Premium gratuit !</p>
            ${Composants.champFormulaire('rega-nom', 'Nom', 'text', { obligatoire: true })}
            ${Composants.champFormulaire('rega-prenom', 'Prénom', 'text', { obligatoire: true })}
            ${Composants.champFormulaire('rega-email', 'E-mail professionnel', 'email', { obligatoire: true })}
            ${Composants.champFormulaire('rega-telephone', 'Téléphone', 'text', {})}
            ${Composants.champFormulaire('rega-nom-pro', 'Nom professionnel', 'text', { placeholder: 'Ex: Agence Immobilière Excellence' })}
            ${Composants.champFormulaire('rega-mdp', 'Mot de passe', 'password', { obligatoire: true })}
            ${Composants.champFormulaire('rega-mdp2', 'Confirmer le mot de passe', 'password', { obligatoire: true })}
            <div class="pt-2">
                ${Composants.bouton("Créer mon compte agent", 'Pages.soumettreInscriptionAgent()', { variante: 'accent', plein: true })}
            </div>
            <p class="text-center text-sm text-sombre-200 mt-3">
                <button onclick="Pages.afficherConnexion()" class="text-primaire-400 hover:underline">Retour connexion</button>
            </p>
        </form>`;
    }

    function afficherConnexion() {
        const zone = document.getElementById('zone-auth-form');
        if (zone) zone.innerHTML = formulaireConnexion();
    }

    async function soumettreConnexion() {
        const email = document.getElementById('auth-email')?.value;
        const mdp = document.getElementById('auth-mdp')?.value;
        if (!email || !mdp) return Composants.afficherToast('Remplissez tous les champs.', 'attention');
        try {
            const r = await ApiEsikaTok.auth.connexion(email, mdp);
            EtatApp.connecter(r.utilisateur);
            Composants.afficherToast('Connexion réussie !', 'succes');
            EsikaTok.naviguer('accueil');
        } catch(e) {
            Composants.afficherToast(e.erreur || 'Identifiants incorrects.', 'erreur');
        }
    }

    async function soumettreInscription() {
        const donnees = {
            nom: document.getElementById('reg-nom')?.value,
            prenom: document.getElementById('reg-prenom')?.value,
            email: document.getElementById('reg-email')?.value,
            telephone: document.getElementById('reg-telephone')?.value || '',
            mot_de_passe: document.getElementById('reg-mdp')?.value,
            confirmation_mot_de_passe: document.getElementById('reg-mdp2')?.value,
        };
        if (!donnees.nom || !donnees.prenom || !donnees.email || !donnees.mot_de_passe) {
            return Composants.afficherToast('Remplissez les champs obligatoires.', 'attention');
        }
        try {
            const r = await ApiEsikaTok.auth.inscription(donnees);
            EtatApp.connecter(r.utilisateur);
            Composants.afficherToast('Compte créé !', 'succes');
            EsikaTok.naviguer('accueil');
        } catch(e) {
            const msg = e.email || e.mot_de_passe || e.confirmation_mot_de_passe || e.erreur || 'Erreur d\'inscription.';
            Composants.afficherToast(Array.isArray(msg) ? msg[0] : msg, 'erreur');
        }
    }

    async function soumettreInscriptionAgent() {
        const donnees = {
            nom: document.getElementById('rega-nom')?.value,
            prenom: document.getElementById('rega-prenom')?.value,
            email: document.getElementById('rega-email')?.value,
            telephone: document.getElementById('rega-telephone')?.value || '',
            nom_professionnel: document.getElementById('rega-nom-pro')?.value || '',
            mot_de_passe: document.getElementById('rega-mdp')?.value,
            confirmation_mot_de_passe: document.getElementById('rega-mdp2')?.value,
        };
        try {
            const r = await ApiEsikaTok.auth.inscriptionAgent(donnees);
            EtatApp.connecter(r.utilisateur);
            Composants.afficherToast(r.message || 'Compte agent créé !', 'succes');
            EsikaTok.naviguer('accueil');
        } catch(e) {
            const msg = e.email || e.erreur || 'Erreur.';
            Composants.afficherToast(Array.isArray(msg) ? msg[0] : msg, 'erreur');
        }
    }

    /* ========================================
       PAGE DÉTAIL BIEN
       ======================================== */
    async function afficherDetailBien(bienId) {
        Composants.ouvrirModal(Composants.loader(), { titre: 'Détail du bien', pleinEcran: true });
        try {
            const bien = await ApiEsikaTok.biens.detail(bienId);
            const modal = document.querySelector('#modal-global .p-4');
            if (!modal) return;
            const prixFormate = new Intl.NumberFormat('fr-FR').format(bien.prix);
            const localisation = [bien.commune_nom, bien.quartier_nom, bien.avenue].filter(Boolean).join(', ');

            modal.innerHTML = `
            <div class="space-y-4">
                <!-- Vidéo -->
                ${bien.video_url ? `<div class="aspect-[9/16] max-h-64 bg-black rounded-xl overflow-hidden"><video src="${bien.video_url}" class="w-full h-full object-cover" controls playsinline></video></div>` : ''}

                <!-- Images -->
                ${bien.images && bien.images.length > 0 ? `
                <div class="flex gap-2 overflow-x-auto pb-2">${bien.images.map(img => `<img src="${img.image}" class="h-24 rounded-lg object-cover flex-shrink-0">`).join('')}</div>` : ''}

                <!-- Infos -->
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium ${bien.type_offre === 'vente' ? 'bg-green-500/20 text-green-400' : 'bg-primaire-500/20 text-primaire-400'}">${bien.type_offre}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs bg-sombre-700 text-sombre-200">${bien.type_bien}</span>
                    </div>
                    <h2 class="text-lg font-bold text-white">${bien.titre}</h2>
                    <p class="text-2xl font-bold text-accent-400 mt-1">${prixFormate} ${bien.devise || 'USD'}</p>
                </div>

                <!-- Caractéristiques -->
                <div class="grid grid-cols-3 gap-2">
                    ${bien.nombre_chambres ? `<div class="bg-sombre-700 rounded-lg p-3 text-center"><p class="text-sm font-bold text-white">${bien.nombre_chambres}</p><p class="text-[10px] text-sombre-200">Chambres</p></div>` : ''}
                    ${bien.nombre_salles_bain ? `<div class="bg-sombre-700 rounded-lg p-3 text-center"><p class="text-sm font-bold text-white">${bien.nombre_salles_bain}</p><p class="text-[10px] text-sombre-200">SdB</p></div>` : ''}
                    ${bien.surface_m2 ? `<div class="bg-sombre-700 rounded-lg p-3 text-center"><p class="text-sm font-bold text-white">${bien.surface_m2}</p><p class="text-[10px] text-sombre-200">m²</p></div>` : ''}
                </div>

                <!-- Localisation -->
                <div class="bg-sombre-700 rounded-xl p-3">
                    <p class="text-xs font-semibold text-white mb-1">📍 Localisation</p>
                    <p class="text-sm text-sombre-200">${bien.ville_nom || ''}, ${localisation}</p>
                    ${bien.latitude && bien.longitude ? `<div class="mt-2 rounded-lg overflow-hidden h-32 bg-sombre-800"><iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${bien.longitude-0.01},${bien.latitude-0.01},${parseFloat(bien.longitude)+0.01},${parseFloat(bien.latitude)+0.01}&layer=mapnik&marker=${bien.latitude},${bien.longitude}" class="w-full h-full border-0"></iframe></div>` : ''}
                </div>

                <!-- Description -->
                <div>
                    <p class="text-xs font-semibold text-white mb-1">Description</p>
                    <p class="text-sm text-sombre-200 whitespace-pre-line">${bien.description}</p>
                </div>

                <!-- Agent -->
                <div class="bg-sombre-700 rounded-xl p-3 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primaire-600 flex items-center justify-center text-white font-bold overflow-hidden">
                        ${bien.agent_photo ? `<img src="${bien.agent_photo}" class="w-full h-full object-cover">` : (bien.agent_nom || 'A').charAt(0)}
                    </div>
                    <div class="flex-1"><p class="text-sm font-medium text-white">${bien.agent_nom}</p><p class="text-xs text-sombre-200">Agent immobilier</p></div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2">
                    ${Composants.bouton('💬 Contacter', `EsikaTok.contacterAgent(${bien.id})`, { variante: 'primaire', plein: true })}
                    ${Composants.bouton('❤️ Favori', `EsikaTok.toggleFavori(${bien.id})`, { variante: 'secondaire', plein: true })}
                </div>
            </div>`;
        } catch(e) {
            Composants.afficherToast('Erreur chargement détail.', 'erreur');
            Composants.fermerModal();
        }
    }

    return {
        accueil, initialiserAccueil,
        recherche, initialiserRecherche, ouvrirFiltres, lancerRecherche,
        publier, initialiserPublier, previsualiserVideo, sauvegarderBien,
        messages, initialiserMessages, ouvrirConversation, envoyerMessage,
        profil, initialiserProfil,
        voirFavoris, voirMesBiens, voirMesBoosts, voirPlans, souscrirePlan,
        voirParametres, sauvegarderParametres,
        pageConnexionRequise, afficherInscription, afficherInscriptionAgent, afficherConnexion,
        soumettreConnexion, soumettreInscription, soumettreInscriptionAgent,
        afficherDetailBien,
    };
})();
