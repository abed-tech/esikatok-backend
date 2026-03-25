/**
 * Page Profil utilisateur - EsikaTok.
 * Infos personnelles, favoris, messages, paramètres, sécurité.
 * Les agents voient aussi les liens vers leur espace pro.
 */
const PageProfil = (() => {
    const SVG = {
        maison: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>',
        coeur: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
        boost: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
        abo: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>',
        stats: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
        paiement: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>',
        param: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
        deco: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>',
        cadenas: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>',
        aide: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        photo: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    };

    function afficher() {
        if (!EtatApp.estConnecte()) return PageConnexion.afficher({ action: 'voir votre profil' });
        const u = EtatApp.obtenir('utilisateur');
        const estAgent = EtatApp.estAgent();
        const C = Composants;

        return `
        <div class="h-full overflow-y-auto pb-24 bg-sombre-900">
            <!-- En-tête profil -->
            <div class="bg-gradient-to-b from-primaire-900/40 to-sombre-900 px-4 pt-6 pb-5">
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <div class="w-16 h-16 rounded-full bg-primaire-600 flex items-center justify-center text-2xl font-bold text-white overflow-hidden flex-shrink-0 ring-2 ring-primaire-400/30">
                            ${u.photo ? `<img src="${u.photo}" class="w-full h-full object-cover">` : (u.prenom || 'U').charAt(0)}
                        </div>
                        <button onclick="PageProfil.gererPhoto()" class="absolute -bottom-1 -right-1 w-7 h-7 bg-primaire-600 rounded-full flex items-center justify-center ring-2 ring-sombre-900 hover:bg-primaire-500 transition">
                            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </button>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-lg font-bold text-white truncate">${u.prenom || ''} ${u.nom || ''}</h2>
                        <p class="text-sm text-sombre-200 truncate">${u.email}</p>
                        <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${estAgent ? 'bg-accent-500/20 text-accent-400' : 'bg-primaire-500/20 text-primaire-400'}">
                            ${estAgent ? 'Agent immobilier' : 'Utilisateur'}
                        </span>
                    </div>
                </div>
            </div>

            <div class="px-4 mt-4 space-y-2">
                ${estAgent ? `
                <!-- Section agent -->
                <p class="text-xs font-semibold text-sombre-200 uppercase tracking-wider px-1 mb-1">Espace agent</p>
                ${C.menuItem(SVG.stats, 'Tableau de bord', "EsikaTok.naviguer('agent-espace')", { couleur: 'text-primaire-400' })}
                ${C.menuItem(SVG.maison, 'Mes publications', "EsikaTok.naviguer('agent-publications')", { couleur: 'text-green-400', badge: BadgeManager.html(BadgeManager.pubsEnAttente() + BadgeManager.pubsRefusees(), { id: 'badge-agent-pubs' }) })}
                ${C.menuItem(SVG.abo, 'Mon abonnement', "EsikaTok.naviguer('agent-abonnement')", { couleur: 'text-accent-400', badge: BadgeManager.aboExpirant() ? BadgeManager.html(1, { id: 'badge-agent-abo', variante: 'orange', texte: '!' }) : '' })}
                ${C.menuItem(SVG.boost, 'Mes boosts', "EsikaTok.naviguer('agent-boosts')", { couleur: 'text-yellow-400' })}
                ${C.menuItem(SVG.paiement, 'Mes paiements', "EsikaTok.naviguer('agent-paiements')", { couleur: 'text-emerald-400' })}
                <div class="h-3"></div>
                ` : ''}

                <p class="text-xs font-semibold text-sombre-200 uppercase tracking-wider px-1 mb-1">Mon compte</p>
                ${C.menuItem(SVG.coeur, 'Mes favoris', "EsikaTok.naviguer('favoris')", { couleur: 'text-red-400' })}
                ${C.menuItem(SVG.photo, 'Photo de profil', 'PageProfil.gererPhoto()', { couleur: 'text-violet-400' })}
                ${C.menuItem(SVG.aide, 'Aide & Annonces', "EsikaTok.naviguer('aide')", { couleur: 'text-emerald-400', badge: BadgeManager.html(BadgeManager.totalAide(), { id: 'badge-aide' }) })}
                ${C.menuItem(SVG.param, 'Paramètres', "PageProfil.voirParametres()", { couleur: 'text-sombre-200' })}
                ${C.menuItem(SVG.cadenas, 'Sécurité', "PageProfil.voirSecurite()", { couleur: 'text-sombre-200' })}

                <div class="h-3"></div>
                ${C.menuItem(SVG.deco, 'Se déconnecter', 'EsikaTok.deconnecter()', { danger: true })}
            </div>
        </div>`;
    }

    function initialiser() {}

    /* --- Modal Paramètres --- */
    function voirParametres() {
        const u = EtatApp.obtenir('utilisateur');
        const C = Composants;
        const estAgent = EtatApp.estAgent();
        let contenu = `
        <div class="space-y-4">
            <div class="bg-sombre-700 rounded-xl p-4">
                <p class="text-xs font-semibold text-white mb-3">Informations personnelles</p>
                ${C.champFormulaire('param-nom', 'Nom', 'text', { placeholder: u?.nom })}
                ${C.champFormulaire('param-prenom', 'Prénom', 'text', { placeholder: u?.prenom })}
                ${C.champFormulaire('param-telephone', 'Téléphone', 'text', { placeholder: u?.telephone || '+243...' })}
                ${C.bouton('Enregistrer', 'PageProfil.sauvegarderProfil()', { variante:'primaire', plein:true })}
            </div>
            ${estAgent ? `
            <div class="bg-sombre-700 rounded-xl p-4">
                <p class="text-xs font-semibold text-white mb-3">Profil professionnel</p>
                ${C.champFormulaire('param-nom-pro', 'Nom professionnel', 'text', { placeholder: u?.profil_agent?.nom_professionnel || '' })}
                ${C.champFormulaire('param-desc-pro', 'Description', 'textarea', { placeholder: u?.profil_agent?.description || 'Décrivez votre activité...', lignes: 3 })}
                ${C.champFormulaire('param-zone', 'Zone géographique', 'text', { placeholder: u?.profil_agent?.zone_geographique || 'Ex: Kinshasa, Gombe' })}
                ${C.bouton('Enregistrer profil pro', 'PageProfil.sauvegarderProfilAgent()', { variante:'primaire', plein:true })}
            </div>` : ''}
        </div>`;
        C.ouvrirModal(contenu, { titre: 'Paramètres' });
    }

    async function sauvegarderProfil() {
        const donnees = {};
        const v = (id) => document.getElementById(id)?.value;
        if (v('param-nom')) donnees.nom = v('param-nom');
        if (v('param-prenom')) donnees.prenom = v('param-prenom');
        if (v('param-telephone')) donnees.telephone = v('param-telephone');
        if (Object.keys(donnees).length === 0) return Composants.afficherToast('Aucun changement.', 'info');
        try {
            const r = await ApiEsikaTok.profil.modifier(donnees);
            localStorage.setItem('esikatok_utilisateur', JSON.stringify(r));
            EtatApp.connecter(r);
            Composants.afficherToast('Profil mis à jour.', 'succes');
            Composants.fermerModal();
        } catch (e) { Composants.afficherToast(e.erreur || 'Erreur.', 'erreur'); }
    }

    async function sauvegarderProfilAgent() {
        const donnees = {};
        const v = (id) => document.getElementById(id)?.value;
        if (v('param-nom-pro')) donnees.nom_professionnel = v('param-nom-pro');
        if (v('param-desc-pro')) donnees.description = v('param-desc-pro');
        if (v('param-zone')) donnees.zone_geographique = v('param-zone');
        try {
            await ApiEsikaTok.profil.modifierAgent(donnees);
            Composants.afficherToast('Profil pro mis à jour.', 'succes');
            Composants.fermerModal();
        } catch (e) { Composants.afficherToast(e.erreur || 'Erreur.', 'erreur'); }
    }

    /* --- Modal Sécurité --- */
    function voirSecurite() {
        const C = Composants;
        C.ouvrirModal(`
        <div class="space-y-4">
            <div class="bg-sombre-700 rounded-xl p-4">
                <p class="text-xs font-semibold text-white mb-3">Changer le mot de passe</p>
                ${C.champFormulaire('sec-ancien', 'Mot de passe actuel', 'password', { obligatoire: true })}
                ${C.champFormulaire('sec-nouveau', 'Nouveau mot de passe', 'password', { obligatoire: true })}
                ${C.champFormulaire('sec-confirmer', 'Confirmer', 'password', { obligatoire: true })}
                ${C.bouton('Changer le mot de passe', 'PageProfil.changerMdp()', { variante:'primaire', plein:true })}
            </div>
        </div>`, { titre: 'Sécurité' });
    }

    async function changerMdp() {
        const ancien = document.getElementById('sec-ancien')?.value;
        const nouveau = document.getElementById('sec-nouveau')?.value;
        const confirmer = document.getElementById('sec-confirmer')?.value;
        if (!ancien || !nouveau || !confirmer) return Composants.afficherToast('Remplissez tous les champs.', 'attention');
        if (nouveau !== confirmer) return Composants.afficherToast('Les mots de passe ne correspondent pas.', 'attention');
        try {
            await ApiEsikaTok.profil.modifier({ ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau });
            Composants.afficherToast('Mot de passe changé.', 'succes');
            Composants.fermerModal();
        } catch (e) { Composants.afficherToast(e.erreur || e.ancien_mot_de_passe?.[0] || 'Erreur.', 'erreur'); }
    }

    /* --- Gestion photo de profil --- */
    function gererPhoto() {
        const u = EtatApp.obtenir('utilisateur');
        const C = Composants;
        const aPhoto = !!u.photo;

        C.ouvrirModal(`
        <div class="space-y-4">
            <div class="flex flex-col items-center py-4">
                <div class="w-24 h-24 rounded-full bg-primaire-600 flex items-center justify-center text-3xl font-bold text-white overflow-hidden ring-3 ring-primaire-400/30 mb-4">
                    ${aPhoto ? `<img src="${u.photo}" class="w-full h-full object-cover">` : (u.prenom || 'U').charAt(0)}
                </div>
                <p class="text-sm text-white font-medium">${u.prenom || ''} ${u.nom || ''}</p>
            </div>

            <div class="space-y-2">
                <label class="block w-full">
                    <input type="file" id="input-photo-profil" accept="image/jpeg,image/png,image/webp" class="hidden" onchange="PageProfil.uploaderPhoto()" />
                    <div class="w-full py-3 bg-primaire-600 hover:bg-primaire-700 text-white rounded-xl text-sm font-semibold transition text-center cursor-pointer">
                        ${aPhoto ? 'Modifier la photo' : 'Ajouter une photo'}
                    </div>
                </label>
                ${aPhoto ? `
                <button onclick="PageProfil.supprimerPhoto()" class="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-semibold transition">
                    Supprimer la photo
                </button>` : ''}
            </div>

            <p class="text-[11px] text-sombre-400 text-center">Formats : JPG, PNG, WEBP — 5 MB max</p>
        </div>`, { titre: 'Photo de profil' });
    }

    async function uploaderPhoto() {
        const input = document.getElementById('input-photo-profil');
        if (!input?.files?.[0]) return;

        const fichier = input.files[0];
        if (fichier.size > 5 * 1024 * 1024) {
            return Composants.afficherToast('Image trop volumineuse (5 MB max).', 'erreur');
        }

        const formData = new FormData();
        formData.append('photo', fichier);

        try {
            Composants.afficherToast('Envoi en cours...', 'info');
            const r = await ApiEsikaTok.profil.uploaderPhoto(formData);
            // Mettre à jour le state local
            const u = EtatApp.obtenir('utilisateur');
            u.photo = r.photo_url;
            EtatApp.connecter(u);
            localStorage.setItem('esikatok_utilisateur', JSON.stringify(u));
            Composants.afficherToast('Photo mise à jour !', 'succes');
            Composants.fermerModal();
            EsikaTok.naviguer('profil');
        } catch (e) {
            Composants.afficherToast(e.erreur || 'Erreur lors de l\'envoi.', 'erreur');
        }
    }

    async function supprimerPhoto() {
        try {
            await ApiEsikaTok.profil.supprimerPhoto();
            const u = EtatApp.obtenir('utilisateur');
            u.photo = null;
            EtatApp.connecter(u);
            localStorage.setItem('esikatok_utilisateur', JSON.stringify(u));
            Composants.afficherToast('Photo supprimée.', 'succes');
            Composants.fermerModal();
            EsikaTok.naviguer('profil');
        } catch (e) {
            Composants.afficherToast(e.erreur || 'Erreur.', 'erreur');
        }
    }

    return {
        afficher, initialiser,
        voirParametres, sauvegarderProfil, sauvegarderProfilAgent,
        voirSecurite, changerMdp,
        gererPhoto, uploaderPhoto, supprimerPhoto,
    };
})();
