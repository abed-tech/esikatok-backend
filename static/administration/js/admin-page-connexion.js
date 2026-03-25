/**
 * Module Page Connexion - EsikaTok Administration.
 * Gère l'authentification admin par email + mot de passe.
 */
const PageConnexion = (() => {

    function afficher() {
        const contenu = document.getElementById('admin-contenu');
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('lg:flex');
        document.getElementById('admin-header').classList.add('hidden');

        contenu.innerHTML = `
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="w-full max-w-sm">
                <div class="text-center mb-8 logo-apparition">
                    <img src="/static/images/logo-complet.svg" alt="EsikaTok" class="w-32 h-auto mx-auto mb-4 drop-shadow-[0_0_24px_rgba(59,130,246,0.3)]">
                    <p class="text-sombre-400 text-sm mt-1">Panneau d'administration</p>
                </div>

                <div class="bg-sombre-900 border border-sombre-800 rounded-2xl p-6">
                    <div id="erreur-connexion" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"></div>

                    <div class="mb-4">
                        <label class="block text-xs font-medium text-sombre-300 mb-1.5">Numéro matricule</label>
                        <input type="text" id="champ-matricule" placeholder="Votre matricule"
                            autocomplete="username"
                            class="w-full px-4 py-3 bg-sombre-800 border border-sombre-700 rounded-xl text-sm text-white placeholder-sombre-400 focus:border-primaire-500 focus:ring-1 focus:ring-primaire-500/30 focus:outline-none transition">
                    </div>

                    <div class="mb-6">
                        <label class="block text-xs font-medium text-sombre-300 mb-1.5">Mot de passe</label>
                        <input type="password" id="champ-mdp" placeholder="Votre mot de passe"
                            autocomplete="current-password"
                            class="w-full px-4 py-3 bg-sombre-800 border border-sombre-700 rounded-xl text-sm text-white placeholder-sombre-400 focus:border-primaire-500 focus:ring-1 focus:ring-primaire-500/30 focus:outline-none transition"
                            onkeydown="if(event.key==='Enter')PageConnexion.soumettre()">
                    </div>

                    <button id="btn-connexion" onclick="PageConnexion.soumettre()"
                        class="w-full py-3 bg-primaire-600 hover:bg-primaire-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-primaire-600/20">
                        Se connecter
                    </button>
                </div>

                <p class="text-center text-sombre-400 text-[11px] mt-6">&copy; ${new Date().getFullYear()} EsikaTok. Tous droits réservés.</p>
            </div>
        </div>`;
    }

    async function soumettre() {
        const matricule = document.getElementById('champ-matricule').value.trim();
        const mdp = document.getElementById('champ-mdp').value;
        const erreurEl = document.getElementById('erreur-connexion');
        const btnEl = document.getElementById('btn-connexion');

        if (!matricule || !mdp) {
            erreurEl.textContent = 'Veuillez remplir tous les champs.';
            erreurEl.classList.remove('hidden');
            return;
        }

        btnEl.disabled = true;
        btnEl.innerHTML = '<div class="loader mx-auto" style="width:20px;height:20px;border-width:2px"></div>';
        erreurEl.classList.add('hidden');

        try {
            await AdminApi.auth.connexion(matricule, mdp);
            AdminApp.apresConnexion();
        } catch (e) {
            erreurEl.textContent = e.erreur || e.detail || 'Matricule ou mot de passe incorrect.';
            erreurEl.classList.remove('hidden');
            btnEl.disabled = false;
            btnEl.textContent = 'Se connecter';
        }
    }

    return { afficher, soumettre };
})();
