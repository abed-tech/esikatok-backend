/**
 * Page Accueil / Feed - EsikaTok.
 * Fil vidéo vertical type TikTok avec scroll snap, autoplay, tap pause,
 * long press, mute toggle, boucle automatique, progression discrète.
 */
const PageFeed = (() => {
    let _observer = null;
    let _longPressTimer = null;
    let _isLongPress = false;

    function afficher() {
        return `
        <div id="fil-video" class="fil-video h-full w-full">
            <div id="conteneur-cartes" class="flex flex-col"></div>
            <div id="loader-fil" class="flex justify-center py-8">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiser() {
        const conteneur = document.getElementById('conteneur-cartes');
        if (!conteneur) return;

        EtatApp.definir('pageFil', 1);
        EtatApp.definir('filTermine', false);
        EtatApp.definir('biensFil', []);
        conteneur.innerHTML = '';

        await chargerPlus();

        /* Scroll infini */
        const filEl = document.getElementById('fil-video');
        if (filEl) {
            filEl.addEventListener('scroll', async () => {
                if (EtatApp.obtenir('chargementEnCours') || EtatApp.obtenir('filTermine')) return;
                if (filEl.scrollTop + filEl.clientHeight >= filEl.scrollHeight - 500) {
                    await chargerPlus();
                }
            });
        }

        /* Observer IntersectionObserver pour autoplay */
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

        document.querySelectorAll('.carte-video').forEach(c => {
            _observer.observe(c);
            c.setAttribute('data-observed', '1');
        });

        /* Interaction tap / long press */
        attacherInteractions();
    }

    /* --- Tap pour pause/reprise, Long press pour pause temporaire --- */
    function attacherInteractions() {
        const filEl = document.getElementById('fil-video');
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

            /* Si c'était un long press, reprendre la vidéo */
            if (_isLongPress || carte?.getAttribute('data-longpress-paused') === '1') {
                const video = carte?.querySelector('.video-lecteur');
                if (video) video.play().catch(() => {});
                carte?.removeAttribute('data-longpress-paused');
                _isLongPress = false;
                return;
            }

            /* Tap simple : toggle pause/play */
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
            /* Reprendre si long press annulé */
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

            /* Observer les nouvelles cartes */
            if (_observer) {
                conteneur.querySelectorAll('.carte-video:not([data-observed])').forEach(c => {
                    _observer.observe(c);
                    c.setAttribute('data-observed', '1');
                });
            }

            EtatApp.definir('pageFil', page + 1);
            if (!donnees.next) EtatApp.definir('filTermine', true);
            if (loaderEl && EtatApp.obtenir('filTermine')) loaderEl.innerHTML = '';
        } catch (e) {
            console.error('Erreur chargement fil:', e);
            const loaderEl = document.getElementById('loader-fil');
            if (loaderEl) loaderEl.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-sombre-200 text-sm mb-3">Erreur de chargement</p>
                    ${Composants.bouton('Réessayer', 'PageFeed.initialiser()', { variante:'secondaire' })}
                </div>`;
        } finally {
            EtatApp.definir('chargementEnCours', false);
        }
    }

    function detruire() {
        if (_observer) { _observer.disconnect(); _observer = null; }
        clearTimeout(_longPressTimer);
        document.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
    }

    return { afficher, initialiser, detruire };
})();
