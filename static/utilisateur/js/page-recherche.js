/**
 * Page Recherche - EsikaTok.
 * Barre de recherche, filtres avancés (ville/commune/quartier libre/prix/type/offre/chambres),
 * affichage grille avec vidéos boostées en vedette.
 */
const PageRecherche = (() => {
    let _filtresActuels = {};

    function afficher() {
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            <!-- Barre de recherche -->
            <div class="px-4 pt-4 pb-2 bg-sombre-900 sticky top-0 z-10">
                <div class="flex gap-2">
                    <div class="relative flex-1" onclick="PageRecherche.ouvrirFiltres()">
                        <input type="text" id="barre-recherche" placeholder="Rechercher un bien immobilier..." readonly
                            class="w-full px-4 py-3 pl-10 bg-sombre-800 border border-sombre-700 rounded-2xl text-sm text-white placeholder-sombre-200 focus:outline-none cursor-pointer">
                        <svg class="absolute left-3 top-3.5 w-4 h-4 text-sombre-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <button onclick="PageRecherche.ouvrirFiltres()" class="px-3 py-3 bg-sombre-800 border border-sombre-700 rounded-2xl hover:bg-sombre-700 transition">
                        <svg class="w-5 h-5 text-primaire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    </button>
                </div>
                <div id="filtres-actifs" class="flex gap-2 mt-2 overflow-x-auto pb-1 hidden"></div>
            </div>
            <!-- Résultats -->
            <div id="resultats-recherche" class="flex-1 overflow-y-auto px-3 pb-20">
                <p id="label-resultats" class="text-sombre-200 text-xs font-medium px-1 mb-2 mt-2">En vedette</p>
                <div id="grille-recherche" class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">${Composants.loader()}</div>
            </div>
        </div>`;
    }

    async function initialiser() {
        try {
            const biens = await ApiEsikaTok.recherche.boostes();
            const liste = biens.results || biens;
            afficherGrille(liste);
        } catch (e) {
            document.getElementById('grille-recherche').innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
                'Impossible de charger les résultats.'
            );
        }
    }

    function afficherGrille(biens, avecFeedRecherche) {
        const grille = document.getElementById('grille-recherche');
        if (!grille) return;
        if (!biens || biens.length === 0) {
            grille.innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
                'Aucun résultat trouvé.'
            );
            return;
        }
        grille.innerHTML = biens.map(b => {
            if (avecFeedRecherche) {
                return Composants.carteBienMini(b, {
                    onclick: `PageRecherche.ouvrirFeedRecherche(${b.id})`
                });
            }
            return Composants.carteBienMini(b);
        }).join('');
    }

    function ouvrirFeedRecherche(bienId) {
        EsikaTok.naviguer('feed-recherche', { filtres: _filtresActuels, startId: bienId });
    }

    function ouvrirFiltres() {
        const C = Composants;
        const contenu = `
        <form id="form-filtres" class="space-y-1">
            ${C.champFormulaire('filtre-ville', 'Ville', 'select', { options: [], placeholder: 'Toutes les villes' })}
            ${C.champFormulaire('filtre-commune', 'Commune', 'select', { options: [], placeholder: 'Toutes les communes' })}
            ${C.champFormulaire('filtre-quartier', 'Quartier (texte libre)', 'text', { placeholder: 'Ex: Gombe, Bandalungwa...' })}
            ${C.champFormulaire('filtre-type-bien', 'Type de bien', 'select', {
                options: [
                    {valeur:'appartement',label:'Appartement'},{valeur:'maison',label:'Maison'},
                    {valeur:'terrain',label:'Terrain'},{valeur:'bureau',label:'Bureau/Commerce'},
                    {valeur:'studio',label:'Studio'},{valeur:'villa',label:'Villa'},
                    {valeur:'duplex',label:'Duplex'},{valeur:'immeuble',label:'Immeuble'},
                ]
            })}
            ${C.champFormulaire('filtre-type-offre', "Type d'offre", 'select', {
                options: [
                    {valeur:'vente',label:'Vente'},{valeur:'location',label:'Location'},
                    {valeur:'colocation',label:'Colocation'},{valeur:'location_meublee',label:'Location meublée'},
                ]
            })}
            <div class="grid grid-cols-2 gap-3">
                ${C.champFormulaire('filtre-prix-min', 'Prix min (USD)', 'number', { placeholder: '0', min: '0' })}
                ${C.champFormulaire('filtre-prix-max', 'Prix max (USD)', 'number', { placeholder: 'Max', min: '0' })}
            </div>
            ${C.champFormulaire('filtre-chambres', 'Chambres minimum', 'number', { placeholder: 'Ex: 2', min: '0' })}
            <div class="pt-2 flex gap-2">
                ${C.bouton('Réinitialiser', 'PageRecherche.reinitialiser()', { variante:'secondaire', plein:true })}
                ${C.bouton('Rechercher', 'PageRecherche.lancer()', { variante:'primaire', plein:true })}
            </div>
        </form>`;
        C.ouvrirModal(contenu, { titre: 'Filtrer les biens' });

        /* Charger les villes et pré-sélectionner Kinshasa avec ses 24 communes */
        ApiEsikaTok.localisations.villes().then(async (villes) => {
            const sel = document.getElementById('filtre-ville');
            if (!sel) return;
            villes.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id; opt.textContent = v.nom;
                sel.appendChild(opt);
            });

            /* Pré-sélectionner Kinshasa et charger ses communes */
            const kinshasa = villes.find(v => v.nom === 'Kinshasa');
            if (kinshasa) {
                sel.value = kinshasa.id;
                await chargerCommunesFiltre(kinshasa.id);
            }

            sel.addEventListener('change', async () => {
                await chargerCommunesFiltre(sel.value);
            });
        }).catch(() => {});
    }

    async function lancer() {
        const params = {};
        const v = (id) => document.getElementById(id)?.value;
        if (v('filtre-ville')) params.ville = v('filtre-ville');
        if (v('filtre-commune')) params.commune = v('filtre-commune');
        if (v('filtre-quartier')) params.quartier = v('filtre-quartier');
        if (v('filtre-type-bien')) params.type_bien = v('filtre-type-bien');
        if (v('filtre-type-offre')) params.type_offre = v('filtre-type-offre');
        if (v('filtre-prix-min')) params.prix_min = v('filtre-prix-min');
        if (v('filtre-prix-max')) params.prix_max = v('filtre-prix-max');
        if (v('filtre-chambres')) params.chambres_min = v('filtre-chambres');

        _filtresActuels = { ...params };

        Composants.fermerModal();
        document.getElementById('grille-recherche').innerHTML = Composants.loader();

        try {
            const donnees = await ApiEsikaTok.recherche.chercher(params);
            const biens = donnees.results || donnees;
            const label = document.getElementById('label-resultats');
            if (label) label.textContent = `${biens.length} résultat(s)`;
            afficherGrille(biens, true);
            afficherFiltresActifs(params);
        } catch (e) {
            Composants.afficherToast('Erreur lors de la recherche.', 'erreur');
        }
    }

    function afficherFiltresActifs(params) {
        const zone = document.getElementById('filtres-actifs');
        if (!zone) return;
        const tags = Object.entries(params).filter(([,v]) => v).map(([k,v]) =>
            `<span class="flex-shrink-0 px-2.5 py-1 bg-primaire-600/20 text-primaire-300 rounded-full text-[10px] font-medium">${k}: ${v}</span>`
        );
        if (tags.length > 0) {
            zone.innerHTML = tags.join('') + `<button onclick="PageRecherche.reinitialiser()" class="flex-shrink-0 px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-medium">✕ Effacer</button>`;
            zone.classList.remove('hidden');
        } else {
            zone.classList.add('hidden');
        }
    }

    async function chargerCommunesFiltre(villeId) {
        const communeSel = document.getElementById('filtre-commune');
        if (!communeSel) return;
        communeSel.innerHTML = '<option value="">Toutes les communes</option>';
        if (!villeId) return;
        try {
            const communes = await ApiEsikaTok.localisations.communes(villeId);
            communes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id; opt.textContent = c.nom;
                communeSel.appendChild(opt);
            });
        } catch (e) { console.error('Erreur chargement communes filtre:', e); }
    }

    async function reinitialiser() {
        _filtresActuels = {};
        Composants.fermerModal();
        const zone = document.getElementById('filtres-actifs');
        if (zone) { zone.innerHTML = ''; zone.classList.add('hidden'); }
        const label = document.getElementById('label-resultats');
        if (label) label.textContent = 'En vedette';
        document.getElementById('grille-recherche').innerHTML = Composants.loader();
        await initialiser();
    }

    return { afficher, initialiser, ouvrirFiltres, lancer, reinitialiser, ouvrirFeedRecherche };
})();
