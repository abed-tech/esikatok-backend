/**
 * Pages Agent - EsikaTok.
 * - Profil public agent (photo, description, zone, biens publiés)
 * - Espace agent / Dashboard (stats, abonnement, performance)
 * - Mes publications (statuts: en_attente, publie, refuse, suspendu)
 * - Abonnement (plans Standard/Pro/Premium, paiements M-Pesa/Airtel/Orange/Visa/MC)
 * - Mes boosts (auto selon plan + manuel 1$)
 * - Paiements (historique transactions)
 */
const PageAgent = (() => {

    /* ===========================================
       PROFIL PUBLIC AGENT
       =========================================== */
    function afficherPublic(params) {
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Profil agent')}
            <div id="agent-public-contenu" class="flex-1 overflow-y-auto pb-6">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserPublic(params) {
        const el = document.getElementById('agent-public-contenu');
        if (!el || !params.id) return;
        try {
            const agent = await ApiEsikaTok.profil.agentPublic(params.id);
            el.innerHTML = renduProfilPublic(agent);
        } catch (e) {
            el.innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
                'Profil agent introuvable.'
            );
        }
    }

    function renduProfilPublic(agent) {
        const nom = agent.nom_professionnel || `${agent.utilisateur?.prenom || ''} ${agent.utilisateur?.nom || ''}`;
        const biens = agent.biens_publies || agent.biens || [];
        return `
        <div class="fondu-entree">
            <!-- En-tête agent -->
            <div class="bg-gradient-to-b from-primaire-900/50 to-sombre-900 px-4 pt-6 pb-5 text-center">
                <div class="w-20 h-20 rounded-full bg-primaire-600 flex items-center justify-center text-3xl font-bold text-white overflow-hidden mx-auto ring-3 ring-primaire-400/30">
                    ${agent.photo ? `<img src="${agent.photo}" class="w-full h-full object-cover">` : nom.charAt(0)}
                </div>
                <h2 class="text-lg font-bold text-white mt-3">${nom}</h2>
                <p class="text-sm text-sombre-200 mt-1 max-w-xs mx-auto">${agent.description || 'Agent immobilier sur EsikaTok'}</p>
                ${agent.zone_geographique ? `<p class="text-xs text-primaire-400 mt-1">📍 ${agent.zone_geographique}</p>` : ''}
                <div class="flex justify-center gap-6 mt-4">
                    <div class="text-center"><p class="text-xl font-bold text-white">${agent.nombre_biens_publies || biens.length || 0}</p><p class="text-[10px] text-sombre-200">Biens</p></div>
                    <div class="text-center"><p class="text-xl font-bold text-white">${agent.note_moyenne || '-'}</p><p class="text-[10px] text-sombre-200">Note</p></div>
                    <div class="text-center"><p class="text-xl font-bold text-white">${agent.vues_totales || 0}</p><p class="text-[10px] text-sombre-200">Vues</p></div>
                </div>
            </div>
            <!-- Biens publiés -->
            ${biens.length > 0 ? `
            <div class="px-4 mt-4">
                <p class="text-sm font-semibold text-white mb-3">Biens publiés</p>
                <div class="grid grid-cols-2 gap-2">${biens.map(b => Composants.carteBienMini(b)).join('')}</div>
            </div>` : ''}
        </div>`;
    }

    /* ===========================================
       ESPACE AGENT / DASHBOARD
       =========================================== */
    function afficherEspace() {
        if (!EtatApp.estAgent()) return PageConnexion.afficher({ action: "accéder à l'espace agent" });
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Tableau de bord')}
            <div id="espace-contenu" class="flex-1 overflow-y-auto px-4 pb-6 pt-3">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserEspace() {
        const el = document.getElementById('espace-contenu');
        if (!el) return;
        try {
            const [stats, abo] = await Promise.all([
                ApiEsikaTok.statistiques.agent().catch(() => null),
                ApiEsikaTok.abonnements.monAbonnement().catch(() => null),
            ]);
            el.innerHTML = renduDashboard(stats, abo);
        } catch (e) {
            el.innerHTML = `<div class="text-center py-12">
                <p class="text-sombre-200 text-sm mb-3">Erreur de chargement</p>
                ${Composants.bouton('Réessayer', "PageAgent.initialiserEspace()", { variante:'secondaire' })}
            </div>`;
        }
    }

    function renduDashboard(stats, abo) {
        const s = stats || {};
        const a = abo?.abonnement;
        const c = abo?.cycle;
        return `
        <div class="space-y-4 fondu-entree">
            <!-- Stats rapides -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-sombre-800 rounded-xl p-4 text-center">
                    <p class="text-2xl font-bold text-white">${s.biens?.publies || 0}</p>
                    <p class="text-[10px] text-sombre-200 mt-0.5">Biens publiés</p>
                </div>
                <div class="bg-sombre-800 rounded-xl p-4 text-center">
                    <p class="text-2xl font-bold text-white">${s.engagement?.vues_totales || 0}</p>
                    <p class="text-[10px] text-sombre-200 mt-0.5">Vues totales</p>
                </div>
                <div class="bg-sombre-800 rounded-xl p-4 text-center">
                    <p class="text-2xl font-bold text-white">${s.engagement?.favoris_totaux || 0}</p>
                    <p class="text-[10px] text-sombre-200 mt-0.5">Favoris</p>
                </div>
                <div class="bg-sombre-800 rounded-xl p-4 text-center">
                    <p class="text-2xl font-bold text-white">${s.boosts?.actifs || 0}</p>
                    <p class="text-[10px] text-sombre-200 mt-0.5">Boosts actifs</p>
                </div>
            </div>
            <!-- Abonnement -->
            <div class="bg-sombre-800 rounded-xl p-4">
                <h3 class="text-sm font-semibold text-white mb-2">Mon abonnement</h3>
                ${a ? `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-bold text-accent-400">${(a.plan_detail?.nom || 'N/A').toUpperCase()}</span>
                    ${Composants.badgeStatut(a.statut)}
                </div>
                <p class="text-xs text-sombre-200">Expire : ${new Date(a.date_fin).toLocaleDateString('fr')}</p>
                ${c ? `<div class="mt-3 grid grid-cols-2 gap-2">
                    <div class="bg-sombre-700 rounded-lg p-2.5 text-center">
                        <p class="text-sm font-bold text-white">${c.publications_utilisees}/${a.plan_detail?.nombre_publications_max || '∞'}</p>
                        <p class="text-[10px] text-sombre-200">Publications</p>
                    </div>
                    <div class="bg-sombre-700 rounded-lg p-2.5 text-center">
                        <p class="text-sm font-bold text-white">${c.boosts_utilises}/${a.plan_detail?.nombre_boosts_inclus || '∞'}</p>
                        <p class="text-[10px] text-sombre-200">Boosts</p>
                    </div>
                </div>` : ''}
                <button onclick="EsikaTok.naviguer('agent-abonnement')" class="mt-3 text-xs text-primaire-400 hover:underline">Gérer l'abonnement →</button>
                ` : `<p class="text-sm text-sombre-200 mb-2">Aucun abonnement actif.</p>
                ${Composants.bouton('Voir les plans', "EsikaTok.naviguer('agent-abonnement')", { variante:'accent', plein:true })}`}
            </div>
            <!-- Accès rapides -->
            <div class="space-y-2">
                ${Composants.menuItem('<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>', 'Publier un bien', "EsikaTok.naviguer('publier')", { couleur:'text-green-400' })}
                ${Composants.menuItem('<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/></svg>', 'Mes publications', "EsikaTok.naviguer('agent-publications')", { couleur:'text-primaire-400' })}
            </div>
        </div>`;
    }

    /* ===========================================
       MES PUBLICATIONS
       =========================================== */
    function afficherPublications() {
        if (!EtatApp.estAgent()) return PageConnexion.afficher({ action: 'gérer vos publications' });
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Mes publications', {
                droite: `<button onclick="EsikaTok.naviguer('publier')" class="p-1.5 rounded-full hover:bg-sombre-800 transition text-primaire-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></button>`
            })}
            <div id="publications-contenu" class="flex-1 overflow-y-auto px-4 pb-6 pt-3">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserPublications() {
        const el = document.getElementById('publications-contenu');
        if (!el) return;
        try {
            const donnees = await ApiEsikaTok.biens.mesBiens();
            const biens = donnees.results || donnees;
            if (!biens || biens.length === 0) {
                el.innerHTML = Composants.etatVide(
                    '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/></svg>',
                    'Aucune publication. Publiez votre premier bien !'
                ) + `<div class="text-center mt-4">${Composants.bouton('Publier un bien', "EsikaTok.naviguer('publier')", { variante:'primaire' })}</div>`;
                return;
            }
            el.innerHTML = `<p class="text-xs text-sombre-200 mb-3">${biens.length} bien(s)</p>
            <div class="space-y-2">${biens.map(b => `
                <div class="bg-sombre-800 rounded-xl p-3.5">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-white truncate">${b.titre}</p>
                            <p class="text-xs text-accent-400 font-bold mt-0.5">${Composants.formatPrix(b.prix)}</p>
                            <p class="text-[10px] text-sombre-200 mt-0.5">${b.commune_nom || ''} · ${b.type_offre}</p>
                        </div>
                        ${Composants.badgeStatut(b.statut)}
                    </div>
                    <div class="flex items-center gap-3 mt-2 text-[10px] text-sombre-200">
                        <span>${b.nombre_vues || 0} vues</span>
                        <span>${b.nombre_favoris || 0} favoris</span>
                        ${b.est_booste ? '<span class="text-accent-400 font-medium">⚡ Boosté</span>' : ''}
                    </div>
                    ${b.statut === 'brouillon' ? `
                    <div class="flex gap-2 mt-2">
                        ${Composants.bouton('Soumettre', `PageAgent.soumettreBien(${b.id})`, { variante:'primaire', classe:'text-xs py-1.5' })}
                    </div>` : ''}
                </div>`).join('')}</div>`;
        } catch (e) {
            el.innerHTML = `<div class="text-center py-12">
                <p class="text-sombre-200 text-sm mb-3">Erreur de chargement</p>
                ${Composants.bouton('Réessayer', 'PageAgent.initialiserPublications()', { variante:'secondaire' })}
            </div>`;
        }
    }

    async function soumettreBien(id) {
        try {
            await ApiEsikaTok.biens.soumettre(id);
            Composants.afficherToast('Bien soumis pour modération !', 'succes');
            initialiserPublications();
        } catch (e) { Composants.afficherToast(e.erreur || 'Erreur.', 'erreur'); }
    }

    /* ===========================================
       ABONNEMENT
       =========================================== */
    function afficherAbonnement() {
        if (!EtatApp.estAgent()) return PageConnexion.afficher({ action: 'gérer votre abonnement' });
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Mon abonnement')}
            <div id="abo-contenu" class="flex-1 overflow-y-auto px-4 pb-6 pt-3">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserAbonnement() {
        const el = document.getElementById('abo-contenu');
        if (!el) return;
        try {
            const [plans, abo] = await Promise.all([
                ApiEsikaTok.abonnements.plans(),
                ApiEsikaTok.abonnements.monAbonnement().catch(() => null),
            ]);
            el.innerHTML = renduAbonnement(plans, abo);
        } catch (e) {
            el.innerHTML = `<div class="text-center py-12"><p class="text-sombre-200 text-sm mb-3">Erreur</p>
                ${Composants.bouton('Réessayer', 'PageAgent.initialiserAbonnement()', { variante:'secondaire' })}</div>`;
        }
    }

    function renduAbonnement(plans, abo) {
        const actuel = abo?.abonnement;
        const couleursPlan = { standard:'border-sombre-600', pro:'border-primaire-500', premium:'border-accent-500' };
        const bgPlan = { standard:'', pro:'bg-primaire-500/5', premium:'bg-accent-500/5' };

        let html = '';
        if (actuel) {
            html += `<div class="bg-sombre-800 rounded-xl p-4 mb-4">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-bold text-accent-400">${(actuel.plan_detail?.nom || '').toUpperCase()}</span>
                    ${Composants.badgeStatut(actuel.statut)}
                </div>
                <p class="text-xs text-sombre-200">Expire le ${new Date(actuel.date_fin).toLocaleDateString('fr')}</p>
            </div>`;
        }

        html += `<p class="text-sm font-semibold text-white mb-3">Choisir un plan</p>`;
        html += `<div class="space-y-3">${(plans || []).map(p => {
            const estActuel = actuel?.plan_detail?.id === p.id;
            const bord = couleursPlan[p.nom] || 'border-sombre-600';
            const bg = bgPlan[p.nom] || '';
            return `
            <div class="border ${bord} ${bg} rounded-xl p-4 ${estActuel ? 'ring-2 ring-accent-500/50' : ''}">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-bold text-white text-base">${p.nom.charAt(0).toUpperCase() + p.nom.slice(1)}${estActuel ? ' <span class="text-xs text-accent-400">(actuel)</span>' : ''}</h4>
                    <span class="text-lg font-bold text-accent-400">${p.prix_mensuel_usd}$<span class="text-xs font-normal text-sombre-200">/mois</span></span>
                </div>
                <ul class="space-y-1 text-xs text-sombre-200 mb-3">
                    <li>📹 ${p.nombre_publications_max === 0 ? 'Publications illimitées' : p.nombre_publications_max + ' publications/mois'}</li>
                    <li>⚡ ${p.nombre_boosts_inclus === 0 ? 'Boosts illimités' : p.nombre_boosts_inclus + ' boosts inclus/mois'}</li>
                    <li>💬 Messages illimités</li>
                </ul>
                ${!estActuel ? Composants.bouton('Choisir ce plan', `PageAgent.choisirPlan(${p.id})`, { variante: p.nom === 'premium' ? 'accent' : 'primaire', plein:true }) : '<p class="text-center text-xs text-green-400">Plan actif</p>'}
            </div>`;
        }).join('')}</div>`;

        return html;
    }

    function choisirPlan(planId) {
        const C = Composants;
        const moyens = [
            { id:'mpesa', label:'M-Pesa', icone:'📱' },
            { id:'airtel', label:'Airtel Money', icone:'📱' },
            { id:'orange', label:'Orange Money', icone:'📱' },
            { id:'visa', label:'Visa', icone:'💳' },
            { id:'mastercard', label:'Mastercard', icone:'💳' },
        ];
        C.ouvrirModal(`
        <div class="space-y-3">
            <p class="text-sm text-sombre-200 mb-2">Choisissez votre moyen de paiement</p>
            ${moyens.map(m => `
            <button onclick="PageAgent.souscrire(${planId},'${m.id}')" class="w-full flex items-center gap-3 p-3.5 bg-sombre-700 rounded-xl hover:bg-sombre-600 transition">
                <span class="text-xl">${m.icone}</span>
                <span class="text-sm font-medium text-white">${m.label}</span>
                <svg class="w-4 h-4 text-sombre-200 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>`).join('')}
        </div>`, { titre: 'Moyen de paiement' });
    }

    async function souscrire(planId, moyen) {
        try {
            const r = await ApiEsikaTok.abonnements.souscrire({ plan_id: planId, moyen_paiement: moyen });
            Composants.afficherToast(r.message || 'Abonnement activé !', 'succes');
            Composants.fermerModal();
            initialiserAbonnement();
        } catch (e) { Composants.afficherToast(e.erreur || 'Erreur de paiement.', 'erreur'); }
    }

    /* ===========================================
       MES BOOSTS (Revamped)
       =========================================== */
    let _boostsData = [];
    let _mesVideos = [];
    let _boostOnglet = 'actifs'; // 'actifs' | 'selection' | 'historique'

    function afficherBoosts() {
        if (!EtatApp.estAgent()) return PageConnexion.afficher({ action: 'gérer vos boosts' });
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Mes boosts')}
            <div class="flex border-b border-sombre-800">
                <button id="boost-tab-actifs" onclick="PageAgent.changerOngletBoost('actifs')"
                    class="flex-1 py-3 text-xs font-semibold text-center transition border-b-2 border-primaire-500 text-primaire-400">
                    Boosts actifs
                </button>
                <button id="boost-tab-selection" onclick="PageAgent.changerOngletBoost('selection')"
                    class="flex-1 py-3 text-xs font-semibold text-center transition border-b-2 border-transparent text-sombre-400">
                    Booster une vidéo
                </button>
                <button id="boost-tab-historique" onclick="PageAgent.changerOngletBoost('historique')"
                    class="flex-1 py-3 text-xs font-semibold text-center transition border-b-2 border-transparent text-sombre-400">
                    Historique
                </button>
            </div>
            <div id="boosts-contenu" class="flex-1 overflow-y-auto px-4 pb-6 pt-3">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserBoosts() {
        _boostOnglet = 'actifs';
        await chargerBoosts();
    }

    function changerOngletBoost(onglet) {
        _boostOnglet = onglet;
        ['actifs', 'selection', 'historique'].forEach(o => {
            const btn = document.getElementById(`boost-tab-${o}`);
            if (!btn) return;
            btn.classList.toggle('border-primaire-500', o === onglet);
            btn.classList.toggle('text-primaire-400', o === onglet);
            btn.classList.toggle('border-transparent', o !== onglet);
            btn.classList.toggle('text-sombre-400', o !== onglet);
        });
        if (onglet === 'actifs') rendreBoostsActifs();
        else if (onglet === 'selection') chargerVideosSelection();
        else rendreHistoriqueBoosts();
    }

    async function chargerBoosts() {
        const el = document.getElementById('boosts-contenu');
        if (!el) return;
        el.innerHTML = Composants.loader();
        try {
            const donnees = await ApiEsikaTok.boosts.mesBoosts();
            _boostsData = donnees.results || donnees || [];
            rendreBoostsActifs();
        } catch (e) {
            el.innerHTML = `<div class="text-center py-12"><p class="text-sombre-200 text-sm mb-3">Erreur de chargement</p>
                ${Composants.bouton('Réessayer', 'PageAgent.initialiserBoosts()', { variante:'secondaire' })}</div>`;
        }
    }

    function dureeRestante(dateFin) {
        const now = new Date();
        const fin = new Date(dateFin);
        const diff = fin - now;
        if (diff <= 0) return 'Expiré';
        const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
        const heures = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (jours > 0) return `${jours}j ${heures}h restantes`;
        return `${heures}h restantes`;
    }

    function rendreBoostsActifs() {
        const el = document.getElementById('boosts-contenu');
        if (!el) return;
        const actifs = _boostsData.filter(b => b.est_actif);

        if (actifs.length === 0) {
            el.innerHTML = `
            <div class="fondu-entree">
                <div class="bg-gradient-to-br from-primaire-900/30 to-sombre-900 rounded-xl p-5 mb-4 border border-primaire-800/30">
                    <div class="flex items-center gap-3 mb-2">
                        <svg class="w-6 h-6 text-primaire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        <p class="text-sm font-semibold text-white">Aucun boost actif</p>
                    </div>
                    <p class="text-xs text-sombre-300 leading-relaxed">Boostez vos vidéos pour apparaître en priorité dans le fil et la recherche. Les boosts augmentent significativement la visibilité de vos biens.</p>
                    <button onclick="PageAgent.changerOngletBoost('selection')" class="mt-3 px-4 py-2 bg-primaire-600 hover:bg-primaire-700 text-white rounded-xl text-xs font-semibold transition">
                        Booster une vidéo
                    </button>
                </div>
            </div>`;
            return;
        }

        el.innerHTML = `
        <div class="fondu-entree space-y-3">
            <p class="text-xs text-sombre-300">${actifs.length} boost(s) actif(s)</p>
            ${actifs.map(b => `
            <div class="bg-sombre-800 rounded-xl p-4 border border-primaire-800/20">
                <div class="flex items-start gap-3">
                    <div class="w-14 h-14 rounded-lg bg-sombre-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        ${b.video_miniature ? `<img src="${b.video_miniature}" class="w-full h-full object-cover">` : '<svg class="w-6 h-6 text-sombre-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-white truncate">${b.video_titre || 'Vidéo'}</p>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 flex-shrink-0 ml-2">Actif</span>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <svg class="w-3 h-3 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span class="text-xs text-accent-400 font-medium">${dureeRestante(b.date_fin)}</span>
                        </div>
                        <div class="flex items-center gap-3 mt-1.5 text-[10px] text-sombre-400">
                            <span>${b.source === 'abonnement' ? '📦 Inclus' : '💰 Payant'}</span>
                            <span>${b.impressions || 0} impressions</span>
                            <span>${b.clics || 0} clics</span>
                        </div>
                    </div>
                </div>
            </div>`).join('')}
        </div>`;
    }

    async function chargerVideosSelection() {
        const el = document.getElementById('boosts-contenu');
        if (!el) return;
        el.innerHTML = Composants.loader();
        try {
            const donnees = await ApiEsikaTok.biens.mesBiens();
            _mesVideos = (donnees.results || donnees || []).filter(b => b.statut === 'publie');
            rendreSelectionVideo();
        } catch (e) {
            el.innerHTML = `<div class="text-center py-12"><p class="text-sombre-200 text-sm">Erreur de chargement des vidéos</p></div>`;
        }
    }

    function rendreSelectionVideo() {
        const el = document.getElementById('boosts-contenu');
        if (!el) return;
        const boostsActifsIds = _boostsData.filter(b => b.est_actif).map(b => b.video_id || b.video);

        if (_mesVideos.length === 0) {
            el.innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
                'Aucune vidéo publiée. Publiez un bien pour pouvoir le booster.'
            );
            return;
        }

        el.innerHTML = `
        <div class="fondu-entree">
            <div class="bg-sombre-800/50 rounded-xl p-3 mb-4">
                <p class="text-xs text-sombre-300 leading-relaxed">
                    <strong class="text-white">Choisissez une vidéo</strong> à booster. Le boost dure 7 jours et augmente la visibilité dans le fil et la recherche.
                </p>
            </div>
            <div class="space-y-2">
                ${_mesVideos.map(v => {
                    const dejaBooste = boostsActifsIds.includes(v.id);
                    return `
                    <div class="bg-sombre-800 rounded-xl p-3 flex items-center gap-3">
                        <div class="w-16 h-16 rounded-lg bg-sombre-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            ${v.video_miniature || v.miniature ? `<img src="${v.video_miniature || v.miniature}" class="w-full h-full object-cover">` : '<svg class="w-6 h-6 text-sombre-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-white truncate">${v.titre}</p>
                            <p class="text-xs text-accent-400 font-bold">${Composants.formatPrix(v.prix)}</p>
                            <p class="text-[10px] text-sombre-400">${v.commune_nom || ''} · ${new Date(v.date_creation || v.date_publication).toLocaleDateString('fr')}</p>
                        </div>
                        ${dejaBooste
                            ? '<span class="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-green-500/20 text-green-400 flex-shrink-0">Boosté</span>'
                            : `<button onclick="PageAgent.confirmerBoost(${v.id})" class="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-[11px] font-semibold transition flex-shrink-0">Booster</button>`
                        }
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    function confirmerBoost(videoId) {
        const video = _mesVideos.find(v => v.id === videoId);
        if (!video) return;
        const C = Composants;

        C.ouvrirModal(`
        <div class="space-y-4">
            <div class="flex items-center gap-3 bg-sombre-700 rounded-xl p-3">
                <div class="w-14 h-14 rounded-lg bg-sombre-600 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    ${video.video_miniature || video.miniature ? `<img src="${video.video_miniature || video.miniature}" class="w-full h-full object-cover">` : '<svg class="w-6 h-6 text-sombre-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-white">${video.titre}</p>
                    <p class="text-xs text-sombre-300">${video.commune_nom || ''}</p>
                </div>
            </div>

            <div class="bg-sombre-700/50 rounded-xl p-4 space-y-2.5">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-sombre-300">Durée du boost</span>
                    <span class="text-sm font-medium text-white">7 jours</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-sombre-300">Prix</span>
                    <span class="text-sm font-bold text-accent-400">1.00 $</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-sombre-300">Avantages</span>
                    <span class="text-xs text-primaire-400">Priorité fil + recherche</span>
                </div>
            </div>

            <div class="space-y-2">
                <p class="text-xs text-sombre-300 font-medium">Moyen de paiement</p>
                ${['mpesa', 'airtel', 'orange', 'visa', 'mastercard'].map(m => {
                    const labels = { mpesa:'M-Pesa', airtel:'Airtel Money', orange:'Orange Money', visa:'Visa', mastercard:'Mastercard' };
                    const icones = { mpesa:'📱', airtel:'📱', orange:'📱', visa:'💳', mastercard:'💳' };
                    return `<button onclick="PageAgent.acheterBoost(${videoId},'${m}')" class="w-full flex items-center gap-3 p-3 bg-sombre-700 rounded-xl hover:bg-sombre-600 transition">
                        <span class="text-lg">${icones[m]}</span>
                        <span class="text-sm font-medium text-white flex-1 text-left">${labels[m]}</span>
                        <span class="text-xs text-accent-400 font-bold">1.00 $</span>
                    </button>`;
                }).join('')}
            </div>
        </div>`, { titre: 'Booster cette vidéo' });
    }

    async function acheterBoost(videoId, moyen) {
        try {
            Composants.afficherToast('Traitement du paiement...', 'info');
            const r = await ApiEsikaTok.boosts.acheter({ video_id: videoId, moyen_paiement: moyen });
            Composants.fermerModal();
            Composants.afficherToast(r.message || 'Boost activé avec succès !', 'succes');
            await chargerBoosts();
        } catch (e) {
            Composants.afficherToast(e.erreur || 'Erreur de paiement.', 'erreur');
        }
    }

    function rendreHistoriqueBoosts() {
        const el = document.getElementById('boosts-contenu');
        if (!el) return;
        const expires = _boostsData.filter(b => !b.est_actif);

        if (_boostsData.length === 0) {
            el.innerHTML = Composants.etatVide(
                '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
                'Aucun historique de boost.'
            );
            return;
        }

        const toutes = [..._boostsData].sort((a, b) => new Date(b.date_debut || b.date_creation) - new Date(a.date_debut || a.date_creation));

        el.innerHTML = `
        <div class="fondu-entree space-y-3">
            <div class="grid grid-cols-2 gap-3 mb-2">
                <div class="bg-sombre-800 rounded-xl p-3 text-center">
                    <p class="text-lg font-bold text-white">${_boostsData.filter(b => b.est_actif).length}</p>
                    <p class="text-[10px] text-green-400">Actifs</p>
                </div>
                <div class="bg-sombre-800 rounded-xl p-3 text-center">
                    <p class="text-lg font-bold text-white">${expires.length}</p>
                    <p class="text-[10px] text-sombre-400">Expirés</p>
                </div>
            </div>
            <p class="text-xs text-sombre-300">${toutes.length} boost(s) au total</p>
            ${toutes.map(b => `
            <div class="bg-sombre-800 rounded-xl p-3.5">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-white truncate flex-1">${b.video_titre || 'Vidéo'}</p>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.est_actif ? 'bg-green-500/20 text-green-400' : 'bg-sombre-700 text-sombre-400'} flex-shrink-0 ml-2">${b.est_actif ? 'Actif' : 'Expiré'}</span>
                </div>
                <div class="flex items-center gap-3 mt-1.5 text-xs text-sombre-400">
                    <span>${b.source === 'abonnement' ? '📦 Inclus' : '💰 1.00 $'}</span>
                    <span>${new Date(b.date_debut || b.date_creation).toLocaleDateString('fr')} → ${new Date(b.date_fin).toLocaleDateString('fr')}</span>
                </div>
                <div class="flex items-center gap-4 mt-1 text-[10px] text-sombre-500">
                    <span>${b.impressions || 0} impressions</span>
                    <span>${b.clics || 0} clics</span>
                    ${b.est_actif ? `<span class="text-accent-400">${dureeRestante(b.date_fin)}</span>` : ''}
                </div>
            </div>`).join('')}
        </div>`;
    }

    /* ===========================================
       PAIEMENTS
       =========================================== */
    function afficherPaiements() {
        if (!EtatApp.estAgent()) return PageConnexion.afficher({ action: 'voir vos paiements' });
        return `
        <div class="h-full flex flex-col bg-sombre-900">
            ${Composants.enTetePage('Mes paiements')}
            <div id="paiements-contenu" class="flex-1 overflow-y-auto px-4 pb-6 pt-3">${Composants.loader()}</div>
        </div>`;
    }

    async function initialiserPaiements() {
        const el = document.getElementById('paiements-contenu');
        if (!el) return;
        try {
            const donnees = await ApiEsikaTok.paiements.transactions();
            const txs = donnees.results || donnees;
            if (!txs || txs.length === 0) {
                el.innerHTML = Composants.etatVide(
                    '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>',
                    'Aucune transaction.'
                );
                return;
            }
            el.innerHTML = `<p class="text-xs text-sombre-200 mb-3">${txs.length} transaction(s)</p>
            <div class="space-y-2">${txs.map(tx => `
                <div class="bg-sombre-800 rounded-xl p-3.5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-white">${tx.type_transaction || tx.description || 'Transaction'}</p>
                            <p class="text-[10px] text-sombre-200 mt-0.5">${tx.reference || ''} · ${new Date(tx.date_creation).toLocaleDateString('fr')}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-bold ${tx.statut === 'reussie' ? 'text-green-400' : tx.statut === 'echouee' ? 'text-red-400' : 'text-accent-400'}">${Composants.formatPrix(tx.montant)}</p>
                            ${Composants.badgeStatut(tx.statut)}
                        </div>
                    </div>
                    ${tx.moyen_paiement ? `<p class="text-[10px] text-sombre-200 mt-1">Via ${tx.moyen_paiement}</p>` : ''}
                </div>`).join('')}</div>`;
        } catch (e) {
            el.innerHTML = `<div class="text-center py-12"><p class="text-sombre-200 text-sm mb-3">Erreur</p>
                ${Composants.bouton('Réessayer', 'PageAgent.initialiserPaiements()', { variante:'secondaire' })}</div>`;
        }
    }

    return {
        /* Profil public */
        afficherPublic, initialiserPublic,
        /* Dashboard */
        afficherEspace, initialiserEspace,
        /* Publications */
        afficherPublications, initialiserPublications, soumettreBien,
        /* Abonnement */
        afficherAbonnement, initialiserAbonnement, choisirPlan, souscrire,
        /* Boosts */
        afficherBoosts, initialiserBoosts, changerOngletBoost, confirmerBoost, acheterBoost,
        /* Paiements */
        afficherPaiements, initialiserPaiements,
    };
})();
