/**
 * Page Feed Recherche - EsikaTok.
 * Feed vidéo TikTok dédié aux résultats de recherche, classés par pertinence décroissante.
 * Quand les résultats de recherche sont épuisés, enchaîne avec le feed général (transition invisible).
 */
const PageFeedRecherche = (() => {
    let _observer = null;
    let _longPressTimer = null;
    let _isLongPress = false;
    let _filtres = {};
    let _pageRecherche = 1;
    let _pageFil = 1;
    let _rechercheTerminee = false;
    let _filTermine = false;
    let _chargementEnCours = false;
    let _biensCharges = [];
    let _idsRecherche = new Set();
    let _startId = null;
    let _scrolledToStart = false;

    function afficher(params) {
        _filtres = params.filtres || {};
        _startId = params.startId || null;
        return `
        <div class="h-full flex flex-col bg-sombre-900 relative">
            <!-- Bouton retour -->
            <div class="absolute top-0 left-0 right-0 z-30 pointer-events-none">
                <div class="flex items-center justify-between px-3 pt-3 pb-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
                    <button onclick="EsikaTok.retour()" class="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <span id="badge-recherche-feed" class="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-medium"></span>
                </div>
            </div>
            <!-- Feed vidéo -->
            <div id="fil-recherche" class="fil-video h-full w-full">
                <div id="conteneur-cartes-recherche" class="flex flex-col"></div>
                <div id="loader-fil-recherche" class="flex justify-center py-8">${Composants.loader()}</div>
            </div>
        </div>`;
    }

    async function initialiser(params) {
        _filtres = params.filtres || {};
        _startId = params.startId || null;
        _pageRecherche = 1;
        _pageFil = 1;
        _rechercheTerminee = false;
        _filTermine = false;
        _chargementEnCours = false;
        _biensCharges = [];
        _idsRecherche = new Set();
        _scrolledToStart = false;

        const badge = document.getElementById('badge-recherche-feed');
        if (badge) {
            const nbFiltres = Object.values(_filtres).filter(Boolean).length;
            badge.textContent = nbFiltres > 0 ? `Recherche (${nbFiltres} filtre${nbFiltres > 1 ? 's' : ''})` : 'Recherche';
        }

        /* Charger les premières pages de résultats de recherche */
        await chargerPlus();

        /* Scroll infini */
        const filEl = document.getElementById('fil-recherche');
        if (filEl) {
            filEl.addEventListener('scroll', async () => {
                if (_chargementEnCours || (_rechercheTerminee && _filTermine)) return;
                if (filEl.scrollTop + filEl.clientHeight >= filEl.scrollHeight - 500) {
                    await chargerPlus();
                }
            });
        }

        /* IntersectionObserver pour autoplay */
        _observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('.video-lecteur');
                if (!video) return;
                if (entry.isIntersecting) {
                    if (!video.src && video.dataset.src) video.src = video.dataset.src;
                    video.muted = EtatApp.obtenir('feedMute') !== false;
                    video.play().catch(() => {});
                    activerProgression(entry.target, video);
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.6 });

        observerNouvellesCartes();
        attacherInteractions();

        /* Scroll vers la vidéo de départ */
        if (_startId) {
            scrollVersStart();
        }
    }

    /* --- Tap pour pause/reprise, Long press pour pause temporaire --- */
    function attacherInteractions() {
        const filEl = document.getElementById('fil-recherche');
        if (!filEl) return;

        filEl.addEventListener('pointerdown', (e) => {
            const zone = e.target.closest('.zone-tap-video');
            if (!zone) return;
            _isLongPress = false;
            _longPressTimer = setTimeout(() => {
                _isLongPress = true;
                const carte = zone.closest('.carte-video');
                const video = carte?.querySelector('.video-lecteur');
                if (video && !video.paused) {
                    video.pause();
                    carte.setAttribute('data-longpress-paused', '1');
                }
            }, 400);
        });

        filEl.addEventListener('pointerup', (e) => {
            clearTimeout(_longPressTimer);
            const zone = e.target.closest('.zone-tap-video');
            if (!zone) return;
            const carte = zone.closest('.carte-video');

            if (_isLongPress || carte?.getAttribute('data-longpress-paused') === '1') {
                const video = carte?.querySelector('.video-lecteur');
                if (video) video.play().catch(() => {});
                carte?.removeAttribute('data-longpress-paused');
                _isLongPress = false;
                return;
            }

            const video = carte?.querySelector('.video-lecteur');
            const indicateur = carte?.querySelector('.indicateur-pause');
            if (!video) return;

            if (video.paused) {
                video.play().catch(() => {});
                if (indicateur) indicateur.style.opacity = '0';
            } else {
                video.pause();
                if (indicateur) indicateur.style.opacity = '1';
            }
        });

        filEl.addEventListener('pointercancel', () => {
            clearTimeout(_longPressTimer);
            document.querySelectorAll('[data-longpress-paused]').forEach(c => {
                const v = c.querySelector('.video-lecteur');
                if (v) v.play().catch(() => {});
                c.removeAttribute('data-longpress-paused');
            });
        });
    }

    /* --- Progression vidéo discrète --- */
    function activerProgression(carte, video) {
        const barre = carte.querySelector('.barre-progression');
        if (!barre) return;
        const maj = () => {
            if (!video.duration) return;
            barre.style.width = ((video.currentTime / video.duration) * 100) + '%';
        };
        video.removeEventListener('timeupdate', video._majProg);
        video._majProg = maj;
        video.addEventListener('timeupdate', maj);
    }

    async function chargerPlus() {
        if (_chargementEnCours) return;
        _chargementEnCours = true;

        try {
            let biens = [];

            if (!_rechercheTerminee) {
                /* Phase 1 : résultats de recherche par pertinence */
                const donnees = await ApiEsikaTok.recherche.chercher(_filtres, _pageRecherche);
                biens = donnees.results || [];

                if (biens.length > 0) {
                    biens.forEach(b => _idsRecherche.add(b.id));
                    _pageRecherche++;
                }

                if (!donnees.next) {
                    _rechercheTerminee = true;
                }

                if (biens.length === 0 && _rechercheTerminee) {
                    /* Aucun résultat de recherche restant, passer au feed général */
                    biens = await chargerDepuisFil();
                }
            } else {
                /* Phase 2 : feed général (contenu complémentaire) */
                biens = await chargerDepuisFil();
            }

            ajouterCartes(biens);
        } catch (e) {
            console.error('Erreur chargement feed recherche:', e);
            const loaderEl = document.getElementById('loader-fil-recherche');
            if (loaderEl && _biensCharges.length === 0) {
                loaderEl.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-sombre-200 text-sm mb-3">Erreur de chargement</p>
                        ${Composants.bouton('Réessayer', 'PageFeedRecherche.reessayer()', { variante:'secondaire' })}
                    </div>`;
            }
        } finally {
            _chargementEnCours = false;
        }
    }

    async function chargerDepuisFil() {
        if (_filTermine) return [];
        try {
            const donnees = await ApiEsikaTok.biens.fil(_pageFil);
            const tous = donnees.results || [];
            /* Exclure les biens déjà affichés depuis la recherche */
            const biens = tous.filter(b => !_idsRecherche.has(b.id) && !_biensCharges.some(bc => bc.id === b.id));
            _pageFil++;
            if (!donnees.next) _filTermine = true;
            return biens;
        } catch (e) {
            _filTermine = true;
            return [];
        }
    }

    function ajouterCartes(biens) {
        const conteneur = document.getElementById('conteneur-cartes-recherche');
        const loaderEl = document.getElementById('loader-fil-recherche');
        if (!conteneur) return;

        if (biens.length === 0 && _biensCharges.length === 0) {
            if (loaderEl) loaderEl.innerHTML = Composants.etatVide(
                '<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
                'Aucun résultat pour cette recherche.'
            );
            return;
        }

        const indexDebut = _biensCharges.length;
        _biensCharges = [..._biensCharges, ...biens];

        biens.forEach((bien, i) => {
            conteneur.insertAdjacentHTML('beforeend', Composants.carteVideo(bien, indexDebut + i));
        });

        observerNouvellesCartes();

        /* Masquer ou mettre à jour le loader */
        if (_rechercheTerminee && _filTermine) {
            if (loaderEl) loaderEl.innerHTML = _biensCharges.length > 0 ?
                '<p class="text-center text-sombre-200 text-sm py-4">Fin du fil</p>' : '';
        } else if (loaderEl && biens.length > 0) {
            loaderEl.innerHTML = Composants.loader();
        }

        /* Scroll vers start si pas encore fait */
        if (!_scrolledToStart && _startId) {
            scrollVersStart();
        }
    }

    function observerNouvellesCartes() {
        if (!_observer) return;
        const conteneur = document.getElementById('conteneur-cartes-recherche');
        if (!conteneur) return;
        conteneur.querySelectorAll('.carte-video:not([data-observed])').forEach(c => {
            _observer.observe(c);
            c.setAttribute('data-observed', '1');
        });
    }

    function scrollVersStart() {
        if (_scrolledToStart || !_startId) return;
        const carte = document.querySelector(`.carte-video[data-bien-id="${_startId}"]`);
        if (carte) {
            _scrolledToStart = true;
            setTimeout(() => {
                carte.scrollIntoView({ behavior: 'instant', block: 'start' });
            }, 100);
        }
    }

    function reessayer() {
        initialiser({ filtres: _filtres, startId: _startId });
    }

    function detruire() {
        if (_observer) { _observer.disconnect(); _observer = null; }
        clearTimeout(_longPressTimer);
        document.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
        _biensCharges = [];
        _idsRecherche = new Set();
    }

    return { afficher, initialiser, detruire, reessayer };
})();
