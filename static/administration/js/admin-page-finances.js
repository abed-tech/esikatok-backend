/**
 * Module Page Finances - EsikaTok Administration.
 * Revenus abonnements/boosts, historique transactions, graphiques.
 */
const PageFinances = (() => {

    async function afficher() {
        const contenu = document.getElementById('admin-contenu');
        contenu.innerHTML = AdminComposants.loader();

        try {
            const data = await AdminApi.finances.resume();
            rendu(data);
        } catch (e) {
            contenu.innerHTML = AdminComposants.etatErreur(
                e.erreur || 'Accès refusé ou chargement impossible.',
                'PageFinances.afficher()'
            );
        }
    }

    function rendu(data) {
        const contenu = document.getElementById('admin-contenu');
        const C = AdminComposants;

        // Cartes principales
        const cartesHtml = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            ${C.carteStatistique('Revenu total', '$' + C.formaterMontant(data.total_general || 0),
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                'vert')}
            ${C.carteStatistique('Abonnements', '$' + C.formaterMontant(data.revenus_abonnements || 0),
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.157.733.514 1.4 1.023 1.946a3.42 3.42 0 010 4.438c-.509.546-.866 1.213-1.023 1.946a3.42 3.42 0 01-3.138 3.138c-.733.157-1.4.514-1.946 1.023a3.42 3.42 0 01-4.438 0c-.546-.509-1.213-.866-1.946-1.023a3.42 3.42 0 01-3.138-3.138c-.157-.733-.514-1.4-1.023-1.946a3.42 3.42 0 010-4.438c.509-.546.866-1.213 1.023-1.946a3.42 3.42 0 013.138-3.138z"/></svg>',
                'primaire')}
            ${C.carteStatistique('Boosts', '$' + C.formaterMontant(data.revenus_boosts || 0),
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
                'violet')}
            ${C.carteStatistique('Ce mois', '$' + C.formaterMontant(data.ce_mois?.total || 0),
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
                'orange')}
        </div>`;

        // Graphique revenus mensuels
        const donneesGraphique = (data.revenus_mensuels || []).map(m => ({
            label: m.label,
            valeur: m.total,
        }));

        const graphiqueHtml = C.panneau('Revenus mensuels (6 derniers mois)',
            donneesGraphique.length > 0
                ? C.graphiqueBarres(donneesGraphique, 180)
                : C.etatVide('Aucune donnée de revenu.'),
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>'
        );

        // Moyens de paiement
        const moyensLabels = { mpesa: 'M-Pesa', airtel_money: 'Airtel Money', orange_money: 'Orange Money', visa: 'Visa', mastercard: 'Mastercard', afri_money: 'Afri Money' };
        const moyensHtml = (data.par_moyen_paiement || []).length === 0
            ? '<p class="text-sombre-400 text-sm">Aucune donnée.</p>'
            : data.par_moyen_paiement.map(m => `
                <div class="flex items-center justify-between py-2.5 border-b border-sombre-800 last:border-0">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-primaire-500"></div>
                        <span class="text-white text-sm">${moyensLabels[m.moyen] || m.moyen}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-white text-sm font-medium">$${C.formaterMontant(m.total)}</span>
                        <span class="text-sombre-400 text-xs ml-2">(${m.nombre} tx)</span>
                    </div>
                </div>
            `).join('');

        const panneauMoyens = C.panneau('Par moyen de paiement', moyensHtml,
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>'
        );

        // Dernières transactions
        const txs = data.dernieres_transactions || [];
        const txHtml = txs.length === 0
            ? C.etatVide('Aucune transaction.')
            : txs.slice(0, 15).map(t => `
                <div class="flex items-center justify-between py-2.5 border-b border-sombre-800 last:border-0">
                    <div>
                        <p class="text-white text-xs font-medium">${t.reference || '#' + t.id}</p>
                        <p class="text-sombre-400 text-[11px]">${t.type_transaction || ''} - ${t.moyen_paiement || ''}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-green-400 text-sm font-medium">+$${Number(t.montant).toFixed(2)}</span>
                        <p class="text-sombre-400 text-[11px]">${C.formaterDate(t.date_validation)}</p>
                    </div>
                </div>
            `).join('');

        const panneauTx = C.panneau('Dernières transactions', txHtml,
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
        );

        contenu.innerHTML = `
        <div class="fondu-entree">
            ${C.sectionTitre('Finances', 'Revenus, transactions et moyens de paiement',
                C.boutonRecharger('PageFinances.afficher()')
            )}
            ${cartesHtml}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                ${graphiqueHtml}
                ${panneauMoyens}
            </div>
            ${panneauTx}
        </div>`;
    }

    return { afficher, rendu };
})();
