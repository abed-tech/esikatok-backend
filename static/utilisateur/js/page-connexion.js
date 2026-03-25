/**
 * Page Connexion / Inscription - EsikaTok.
 * Connexion email+mdp, inscription utilisateur simple, inscription agent.
 */
const PageConnexion = (() => {

    function afficher(params) {
        const action = params?.action || 'accéder à cette fonctionnalité';
        return `
        <div class="h-full flex flex-col items-center justify-center px-6 bg-sombre-900 overflow-y-auto">
            <div class="w-full max-w-sm py-8">
                <div class="text-center mb-6 logo-apparition">
                    <img src="/static/images/logo-complet.svg" alt="EsikaTok" class="w-28 h-auto mx-auto mb-3 drop-shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                    <p class="text-sm text-sombre-200">Connectez-vous pour ${action}</p>
                </div>
                <div id="zone-auth-form">${formulaireConnexion()}</div>
            </div>
        </div>`;
    }

    function initialiser() {}

    /* --- Formulaire connexion --- */
    function formulaireConnexion() {
        const C = Composants;
        return `
        <form id="form-connexion" onsubmit="return false;" class="space-y-1 fondu-entree">
            ${C.champFormulaire('auth-email', 'Adresse e-mail', 'email', { obligatoire: true, placeholder: 'votre@email.com' })}
            ${C.champFormulaire('auth-mdp', 'Mot de passe', 'password', { obligatoire: true, placeholder: '••••••••' })}
            <div class="pt-2">
                ${C.bouton('Se connecter', 'PageConnexion.soumettreConnexion()', { variante:'primaire', plein:true })}
            </div>
            <p class="text-center text-sm text-sombre-200 mt-4">
                Pas de compte ? <button onclick="PageConnexion.versInscription()" class="text-primaire-400 hover:underline font-medium">S'inscrire</button>
            </p>
            <p class="text-center text-sm text-sombre-200">
                Agent ? <button onclick="PageConnexion.versInscriptionAgent()" class="text-accent-400 hover:underline font-medium">Inscription agent</button>
            </p>
        </form>`;
    }

    /* --- Formulaire inscription utilisateur --- */
    function versInscription() {
        const C = Composants;
        const zone = document.getElementById('zone-auth-form');
        if (!zone) return;
        zone.innerHTML = `
        <form id="form-inscription" onsubmit="return false;" class="space-y-1 fondu-entree">
            <div class="grid grid-cols-2 gap-3">
                ${C.champFormulaire('reg-nom', 'Nom', 'text', { obligatoire: true })}
                ${C.champFormulaire('reg-prenom', 'Prénom', 'text', { obligatoire: true })}
            </div>
            ${C.champFormulaire('reg-email', 'E-mail', 'email', { obligatoire: true, placeholder: 'votre@email.com' })}
            ${C.champFormulaire('reg-telephone', 'Téléphone', 'text', { placeholder: '+243 ...' })}
            ${C.champFormulaire('reg-mdp', 'Mot de passe', 'password', { obligatoire: true, placeholder: 'Minimum 8 caractères' })}
            ${C.champFormulaire('reg-mdp2', 'Confirmer le mot de passe', 'password', { obligatoire: true })}
            <div class="pt-2">
                ${C.bouton("S'inscrire", 'PageConnexion.soumettreInscription()', { variante:'primaire', plein:true })}
            </div>
            <p class="text-center text-sm text-sombre-200 mt-3">
                Déjà un compte ? <button onclick="PageConnexion.versConnexion()" class="text-primaire-400 hover:underline font-medium">Se connecter</button>
            </p>
        </form>`;
    }

    /* --- Formulaire inscription agent --- */
    function versInscriptionAgent() {
        const C = Composants;
        const zone = document.getElementById('zone-auth-form');
        if (!zone) return;
        zone.innerHTML = `
        <form id="form-inscription-agent" onsubmit="return false;" class="space-y-1 fondu-entree">
            <div class="bg-accent-500/10 border border-accent-500/20 rounded-xl p-3 mb-2 text-center">
                <p class="text-xs text-accent-400 font-medium">✨ 30 jours d'essai Premium gratuit !</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
                ${C.champFormulaire('rega-nom', 'Nom', 'text', { obligatoire: true })}
                ${C.champFormulaire('rega-prenom', 'Prénom', 'text', { obligatoire: true })}
            </div>
            ${C.champFormulaire('rega-email', 'E-mail professionnel', 'email', { obligatoire: true })}
            ${C.champFormulaire('rega-telephone', 'Téléphone', 'text', { placeholder: '+243 ...' })}
            ${C.champFormulaire('rega-nom-pro', 'Nom professionnel / Agence', 'text', { placeholder: 'Ex: Agence Immobilière Excellence' })}
            ${C.champFormulaire('rega-mdp', 'Mot de passe', 'password', { obligatoire: true })}
            ${C.champFormulaire('rega-mdp2', 'Confirmer le mot de passe', 'password', { obligatoire: true })}
            <div class="pt-2">
                ${C.bouton("Créer mon compte agent", 'PageConnexion.soumettreInscriptionAgent()', { variante:'accent', plein:true })}
            </div>
            <p class="text-center text-sm text-sombre-200 mt-3">
                <button onclick="PageConnexion.versConnexion()" class="text-primaire-400 hover:underline font-medium">Retour connexion</button>
            </p>
        </form>`;
    }

    function versConnexion() {
        const zone = document.getElementById('zone-auth-form');
        if (zone) zone.innerHTML = formulaireConnexion();
    }

    /* --- Soumission connexion --- */
    async function soumettreConnexion() {
        const email = document.getElementById('auth-email')?.value;
        const mdp = document.getElementById('auth-mdp')?.value;
        if (!email || !mdp) return Composants.afficherToast('Remplissez tous les champs.', 'attention');
        try {
            const r = await ApiEsikaTok.auth.connexion(email, mdp);
            EtatApp.connecter(r.utilisateur);
            BadgeManager.demarrer();
            Composants.afficherToast('Connexion réussie !', 'succes');
            EsikaTok.naviguer('accueil');
        } catch (e) {
            Composants.afficherToast(e.erreur || e.detail || 'Identifiants incorrects.', 'erreur');
        }
    }

    /* --- Soumission inscription --- */
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
        if (donnees.mot_de_passe !== donnees.confirmation_mot_de_passe) {
            return Composants.afficherToast('Les mots de passe ne correspondent pas.', 'attention');
        }
        try {
            const r = await ApiEsikaTok.auth.inscription(donnees);
            EtatApp.connecter(r.utilisateur);
            BadgeManager.demarrer();
            Composants.afficherToast('Compte créé !', 'succes');
            EsikaTok.naviguer('accueil');
        } catch (e) {
            const msg = e.email || e.mot_de_passe || e.confirmation_mot_de_passe || e.erreur || "Erreur d'inscription.";
            Composants.afficherToast(Array.isArray(msg) ? msg[0] : msg, 'erreur');
        }
    }

    /* --- Soumission inscription agent --- */
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
        if (!donnees.nom || !donnees.prenom || !donnees.email || !donnees.mot_de_passe) {
            return Composants.afficherToast('Remplissez les champs obligatoires.', 'attention');
        }
        try {
            const r = await ApiEsikaTok.auth.inscriptionAgent(donnees);
            EtatApp.connecter(r.utilisateur);
            BadgeManager.demarrer();
            Composants.afficherToast(r.message || 'Compte agent créé !', 'succes');
            EsikaTok.naviguer('accueil');
        } catch (e) {
            const msg = e.email || e.erreur || 'Erreur.';
            Composants.afficherToast(Array.isArray(msg) ? msg[0] : msg, 'erreur');
        }
    }

    return {
        afficher, initialiser,
        versConnexion, versInscription, versInscriptionAgent,
        soumettreConnexion, soumettreInscription, soumettreInscriptionAgent,
    };
})();
