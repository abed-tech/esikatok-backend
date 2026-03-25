/**
 * Gestion d'état léger pour EsikaTok - Frontend Utilisateur.
 * Stocke l'état global de l'application côté client.
 */
const EtatApp = (() => {
    /* --- État global --- */
    let _etat = {
        utilisateur: null,
        estConnecte: false,
        pageActive: 'accueil',
        pageParams: {},
        biensFil: [],
        pageFil: 1,
        chargementEnCours: false,
        filTermine: false,
        biensRecherche: [],
        favoris: [],
        conversations: [],
        conversationActive: null,
        messagesActifs: [],
        mesBiens: [],
        filtresRecherche: {},
    };

    /* --- Écouteurs de changement --- */
    const _ecouteurs = {};

    function surChangement(cle, callback) {
        if (!_ecouteurs[cle]) _ecouteurs[cle] = [];
        _ecouteurs[cle].push(callback);
    }

    function notifier(cle) {
        if (_ecouteurs[cle]) {
            _ecouteurs[cle].forEach(cb => cb(_etat[cle]));
        }
    }

    /* --- Accesseurs --- */
    function obtenir(cle) { return _etat[cle]; }

    function definir(cle, valeur) {
        _etat[cle] = valeur;
        notifier(cle);
    }

    /* --- Initialisation depuis le localStorage --- */
    function initialiser() {
        const utilisateurStr = localStorage.getItem('esikatok_utilisateur');
        const token = localStorage.getItem('esikatok_access_token');
        if (utilisateurStr && token) {
            try {
                _etat.utilisateur = JSON.parse(utilisateurStr);
                _etat.estConnecte = true;
            } catch (e) {
                _etat.utilisateur = null;
                _etat.estConnecte = false;
            }
        }
    }

    function connecter(utilisateur) {
        _etat.utilisateur = utilisateur;
        _etat.estConnecte = true;
        localStorage.setItem('esikatok_utilisateur', JSON.stringify(utilisateur));
        notifier('utilisateur');
        notifier('estConnecte');
    }

    function deconnecter() {
        _etat.utilisateur = null;
        _etat.estConnecte = false;
        _etat.favoris = [];
        _etat.conversations = [];
        _etat.mesBiens = [];
        notifier('utilisateur');
        notifier('estConnecte');
    }

    function estAgent() {
        return _etat.utilisateur && _etat.utilisateur.type_compte === 'agent';
    }

    function estConnecte() {
        return _etat.estConnecte && _etat.utilisateur !== null;
    }

    return {
        obtenir, definir, surChangement, initialiser,
        connecter, deconnecter, estAgent, estConnecte,
    };
})();
