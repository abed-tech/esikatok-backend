/**
 * Page Carte / Localisation - EsikaTok.
 * Affiche l'emplacement d'un bien sur une carte OpenStreetMap via Leaflet.
 * Position exacte ou approximative selon le niveau de précision.
 */
const PageCarte = (() => {
    let _carte = null;

    function afficher(params) {
        const titre = params?.titre ? decodeURIComponent(params.titre) : 'Localisation';
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage(titre)}
            <div id="conteneur-carte" class="flex-1 relative">
                <div id="carte-leaflet" class="w-full h-full"></div>
                <div id="carte-loader" class="absolute inset-0 flex items-center justify-center bg-sombre-900/80 z-10">
                    ${Composants.loader()}
                </div>
            </div>
            <!-- Barre d'info en bas -->
            <div id="carte-info" class="bg-sombre-800 border-t border-sombre-700/50 px-4 py-3 safe-bottom hidden">
                <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                        <p id="carte-info-titre" class="text-sm font-medium text-white truncate"></p>
                        <p id="carte-info-loc" class="text-xs text-sombre-200 mt-0.5"></p>
                    </div>
                    <a id="btn-google-maps" href="#" target="_blank" rel="noopener" class="hidden flex-shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs text-white font-medium transition flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        Google Maps
                    </a>
                </div>
            </div>
        </div>`;
    }

    async function initialiser(params) {
        const lat = parseFloat(params?.lat);
        const lng = parseFloat(params?.lng);

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            document.getElementById('carte-loader').innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>',
                'Coordonnées non disponibles pour ce bien.'
            );
            return;
        }

        /* Charger Leaflet si pas encore chargé */
        if (!window.L) {
            await chargerLeaflet();
        }

        const loader = document.getElementById('carte-loader');
        if (loader) loader.remove();

        /* Initialiser la carte */
        const el = document.getElementById('carte-leaflet');
        if (!el) return;

        _carte = L.map(el, {
            zoomControl: false,
            attributionControl: false,
        }).setView([lat, lng], 16);

        /* Tuiles sombres pour cohérence avec le thème */
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(_carte);

        /* Contrôle zoom en haut à droite */
        L.control.zoom({ position: 'topright' }).addTo(_carte);

        /* Marqueur */
        const iconeMarqueur = L.divIcon({
            className: '',
            html: `<div class="flex items-center justify-center w-10 h-10 -ml-5 -mt-10">
                <div class="w-8 h-8 bg-primaire-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/></svg>
                </div>
            </div>`,
            iconSize: [10, 10],
        });

        L.marker([lat, lng], { icon: iconeMarqueur }).addTo(_carte);

        /* Cercle approximatif */
        L.circle([lat, lng], {
            radius: 200,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
            weight: 1,
        }).addTo(_carte);

        /* Barre d'info */
        if (params?.titre) {
            const info = document.getElementById('carte-info');
            const infoTitre = document.getElementById('carte-info-titre');
            if (info && infoTitre) {
                infoTitre.textContent = decodeURIComponent(params.titre);
                const infoLoc = document.getElementById('carte-info-loc');
                if (infoLoc) infoLoc.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                info.classList.remove('hidden');
            }
        }

        /* Bouton Google Maps externe */
        const btnGmaps = document.getElementById('btn-google-maps');
        if (btnGmaps) {
            btnGmaps.href = `https://www.google.com/maps?q=${lat},${lng}`;
            btnGmaps.classList.remove('hidden');
        }

        /* Forcer le recalcul de la taille */
        setTimeout(() => _carte.invalidateSize(), 100);
    }

    /* Charger Leaflet CSS + JS dynamiquement */
    function chargerLeaflet() {
        return new Promise((resolve) => {
            if (window.L) return resolve();
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);

            const js = document.createElement('script');
            js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            js.onload = resolve;
            js.onerror = resolve;
            document.head.appendChild(js);
        });
    }

    function detruire() {
        if (_carte) { _carte.remove(); _carte = null; }
    }

    return { afficher, initialiser, detruire };
})();
