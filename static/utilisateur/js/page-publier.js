/**
 * Page Publier - EsikaTok.
 * Agents : formulaire de publication (vidéo, titre, type, offre, prix, localisation avec quartier texte libre).
 * Utilisateurs simples : message explicatif + boutons contacter agent / devenir agent.
 * Envoi → validation admin obligatoire.
 */
const PagePublier = (() => {

    function afficher() {
        if (!EtatApp.estConnecte()) return PageConnexion.afficher({ action: 'publier un bien' });
        if (!EtatApp.estAgent()) return pageNonAgent();
        return formulairePublication();
    }

    /* --- Page pour utilisateurs non-agents --- */
    function pageNonAgent() {
        return `
        <div class="h-full flex flex-col items-center justify-center px-6 text-center bg-sombre-900">
            <div class="w-20 h-20 bg-primaire-600/20 rounded-full flex items-center justify-center mb-5">
                <svg class="w-10 h-10 text-primaire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <h2 class="text-xl font-bold text-white mb-2">Publication réservée aux agents</h2>
            <p class="text-sombre-200 text-sm mb-6 max-w-xs leading-relaxed">Seuls les agents immobiliers certifiés peuvent publier des biens sur EsikaTok. Vous pouvez contacter un agent ou devenir agent vous-même.</p>
            <div class="flex flex-col gap-3 w-full max-w-xs">
                ${Composants.bouton('Parcourir les biens', "EsikaTok.naviguer('accueil')", { variante:'primaire', plein:true })}
                ${Composants.bouton('Devenir agent', "EsikaTok.naviguer('connexion',{action:'devenir agent'}); setTimeout(()=>PageConnexion.versInscriptionAgent(),100)", { variante:'accent', plein:true })}
            </div>
        </div>`;
    }

    /* --- Formulaire de publication pour agents --- */
    function formulairePublication() {
        const C = Composants;
        return `
        <div class="h-full overflow-y-auto pb-24 bg-sombre-900">
            <div class="px-4 pt-4 pb-2">
                <h2 class="text-lg font-bold text-white mb-0.5">Publier un bien</h2>
                <p class="text-sombre-200 text-xs">Remplissez les informations et ajoutez une vidéo. Soumission = modération admin obligatoire.</p>
            </div>
            <form id="form-publication" class="px-4 space-y-1" onsubmit="return false;">
                <!-- Vidéo -->
                <div class="mb-4">
                    <label class="block text-xs font-medium text-sombre-200 mb-1">Vidéo du bien *</label>
                    <div id="zone-upload-video" onclick="document.getElementById('input-video').click()"
                        class="border-2 border-dashed border-sombre-600 rounded-xl p-6 text-center cursor-pointer hover:border-primaire-500 transition">
                        <svg class="w-10 h-10 mx-auto text-sombre-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        <p class="text-sm text-sombre-200">Cliquez pour ajouter une vidéo</p>
                        <p class="text-xs text-sombre-700 mt-1">MP4, WebM, MOV - Max 100 Mo</p>
                    </div>
                    <input type="file" id="input-video" accept="video/*" class="hidden" onchange="PagePublier.previsualiser(this)">
                    <div id="apercu-video" class="hidden mt-2 rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-48"></div>
                </div>

                ${C.champFormulaire('pub-titre', 'Titre *', 'text', { obligatoire: true, placeholder: 'Ex: Bel appartement 3 chambres à Gombe' })}
                ${C.champFormulaire('pub-description', 'Description *', 'textarea', { obligatoire: true, placeholder: 'Décrivez le bien en détail...', lignes: 4 })}

                ${C.champFormulaire('pub-type-bien', 'Type de bien *', 'select', {
                    obligatoire: true,
                    options: [
                        {valeur:'appartement',label:'Appartement'},{valeur:'maison',label:'Maison'},
                        {valeur:'terrain',label:'Terrain'},{valeur:'bureau',label:'Bureau/Commerce'},
                        {valeur:'studio',label:'Studio'},{valeur:'villa',label:'Villa'},
                        {valeur:'duplex',label:'Duplex'},{valeur:'immeuble',label:'Immeuble'},
                    ]
                })}
                ${C.champFormulaire('pub-type-offre', "Type d'offre *", 'select', {
                    obligatoire: true,
                    options: [
                        {valeur:'vente',label:'Vente'},{valeur:'location',label:'Location'},
                        {valeur:'colocation',label:'Colocation'},{valeur:'location_meublee',label:'Location meublée'},
                    ]
                })}
                ${C.champFormulaire('pub-prix', 'Prix (USD) *', 'number', { obligatoire: true, placeholder: 'Ex: 500', min: '0' })}

                <div class="grid grid-cols-2 gap-3">
                    ${C.champFormulaire('pub-chambres', 'Chambres', 'number', { min: '0' })}
                    ${C.champFormulaire('pub-superficie', 'Superficie (m²)', 'number', { min: '0' })}
                </div>

                <p class="text-xs font-semibold text-primaire-400 mt-4 mb-2">📍 Localisation</p>
                ${C.champFormulaire('pub-ville', 'Ville *', 'select', { obligatoire: true })}
                ${C.champFormulaire('pub-commune', 'Commune *', 'select', { obligatoire: true })}
                ${C.champFormulaire('pub-quartier', 'Quartier (texte libre)', 'text', { placeholder: 'Ex: Bandalungwa, Kintambo...' })}
                ${C.champFormulaire('pub-avenue', 'Avenue / Rue', 'text', { placeholder: 'Ex: Avenue de la Libération' })}
                ${C.champFormulaire('pub-numero', 'Numéro parcelle', 'text', { placeholder: 'Ex: 42' })}

                <p class="text-xs font-semibold text-primaire-400 mt-4 mb-2">📏 Précision</p>
                ${C.champFormulaire('pub-precision', 'Niveau de précision', 'select', {
                    options: [
                        {valeur:'quartier',label:'Quartier uniquement'},
                        {valeur:'avenue',label:'Jusqu\'à l\'avenue'},
                        {valeur:'exact',label:'Adresse exacte'},
                    ]
                })}

                <div class="flex gap-3 pt-6 pb-6">
                    ${C.bouton('Brouillon', "PagePublier.sauvegarder('brouillon')", { variante:'secondaire', plein:true })}
                    ${C.bouton('Soumettre', "PagePublier.sauvegarder('soumettre')", { variante:'primaire', plein:true })}
                </div>
            </form>
        </div>`;
    }

    async function initialiser() {
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

            /* Pré-sélectionner Kinshasa et charger ses 24 communes immédiatement */
            const kinshasa = villes.find(v => v.nom === 'Kinshasa');
            if (kinshasa) {
                selVille.value = kinshasa.id;
                await chargerCommunes(kinshasa.id);
            }

            selVille.addEventListener('change', async () => {
                await chargerCommunes(selVille.value);
            });
        } catch (e) { console.error('Erreur init publier:', e); }
    }

    async function chargerCommunes(villeId) {
        const selCommune = document.getElementById('pub-commune');
        if (!selCommune) return;
        selCommune.innerHTML = '<option value="">Sélectionner une commune...</option>';
        if (!villeId) return;
        try {
            const communes = await ApiEsikaTok.localisations.communes(villeId);
            communes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id; opt.textContent = c.nom;
                selCommune.appendChild(opt);
            });
        } catch (e) { console.error('Erreur chargement communes:', e); }
    }

    function previsualiser(input) {
        const fichier = input.files[0];
        if (!fichier) return;
        const apercu = document.getElementById('apercu-video');
        const zone = document.getElementById('zone-upload-video');
        apercu.innerHTML = `<video src="${URL.createObjectURL(fichier)}" class="w-full h-full object-cover" controls></video>`;
        apercu.classList.remove('hidden');
        zone.innerHTML = `<p class="text-sm text-green-400">✓ ${fichier.name}</p><p class="text-xs text-sombre-200 mt-1">Cliquez pour changer</p>`;
    }

    async function sauvegarder(action) {
        const v = (id) => document.getElementById(id)?.value || '';
        const videoFile = document.getElementById('input-video')?.files[0];

        /* --- Validation côté client --- */
        const erreurs = [];
        if (!videoFile) erreurs.push('Vidéo obligatoire : veuillez sélectionner un fichier vidéo.');
        if (!v('pub-titre').trim()) erreurs.push('Le titre est obligatoire.');
        if (!v('pub-description').trim()) erreurs.push('La description est obligatoire.');
        if (!v('pub-type-bien')) erreurs.push('Sélectionnez un type de bien.');
        if (!v('pub-type-offre')) erreurs.push("Sélectionnez un type d'offre.");
        if (!v('pub-prix') || Number(v('pub-prix')) <= 0) erreurs.push('Indiquez un prix valide.');
        if (!v('pub-ville')) erreurs.push('Sélectionnez une ville.');
        if (!v('pub-commune')) erreurs.push('Sélectionnez une commune.');

        if (erreurs.length > 0) {
            Composants.afficherToast(erreurs[0], 'erreur');
            return;
        }

        /* --- Construction du FormData --- */
        const formData = new FormData();
        formData.append('fichier_video', videoFile);
        formData.append('titre', v('pub-titre').trim());
        formData.append('description', v('pub-description').trim());
        formData.append('type_bien', v('pub-type-bien'));
        formData.append('type_offre', v('pub-type-offre'));
        formData.append('prix', v('pub-prix'));
        if (v('pub-chambres')) formData.append('nombre_chambres', v('pub-chambres'));
        if (v('pub-superficie')) formData.append('surface_m2', v('pub-superficie'));
        formData.append('ville', v('pub-ville'));
        formData.append('commune', v('pub-commune'));
        if (v('pub-quartier').trim()) formData.append('quartier_texte', v('pub-quartier').trim());
        if (v('pub-avenue').trim()) formData.append('avenue', v('pub-avenue').trim());
        if (v('pub-numero').trim()) formData.append('numero_adresse', v('pub-numero').trim());

        try {
            const bien = await ApiEsikaTok.biens.creer(formData);
            if (action === 'soumettre' && bien.id) {
                await ApiEsikaTok.biens.soumettre(bien.id);
                Composants.afficherToast('Bien soumis pour modération !', 'succes');
            } else {
                Composants.afficherToast('Brouillon enregistré.', 'succes');
            }
            EsikaTok.naviguer('agent-publications');
        } catch (e) {
            const msg = e.erreur || e.detail || (typeof e === 'object' ? Object.values(e).flat().join(', ') : '') || 'Erreur lors de la publication.';
            Composants.afficherToast(msg, 'erreur');
        }
    }

    return { afficher, initialiser, previsualiser, sauvegarder };
})();
