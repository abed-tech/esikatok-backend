"""
Commande de gestion pour créer les données de démonstration EsikaTok.
Crée un super-admin, des agents, des utilisateurs, des plans d'abonnement,
et des biens immobiliers de démonstration.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.comptes.models import Utilisateur, ProfilAgent, ProfilAdministrateur
from apps.localisations.models import Ville, Commune
from apps.abonnements.models import PlanAbonnement, Abonnement, CycleAbonnement
from apps.biens.models import BienImmobilier
from apps.videos.models import Video
from apps.comptes.services import creer_essai_gratuit_agent


class Command(BaseCommand):
    help = 'Crée les données de démonstration pour EsikaTok'

    def handle(self, *args, **options):
        self.stdout.write('=== Création des données de démonstration EsikaTok ===\n')

        # 1. Plans d'abonnement
        self.creer_plans()

        # 2. Directeur (Super Admin)
        self.creer_directeur()

        # 3. Autres administrateurs
        self.creer_admins()

        # 4. Agents immobiliers
        self.creer_agents()

        # 5. Utilisateurs simples
        self.creer_utilisateurs()

        # 6. Biens immobiliers de démo
        self.creer_biens_demo()

        self.stdout.write(self.style.SUCCESS('\n=== Données de démonstration créées avec succès ==='))
        self.stdout.write(self.style.SUCCESS('Directeur     : Matricule DG19032004CEO / Ma_societe_CE0'))
        self.stdout.write(self.style.SUCCESS('Gestionnaire  : Matricule GES-001 / EsikaTok2024!'))
        self.stdout.write(self.style.SUCCESS('Modérateur    : Matricule MOD-001 / EsikaTok2024!'))
        self.stdout.write(self.style.SUCCESS('Agent 1       : agent1@esikatok.com / EsikaTok2024!'))
        self.stdout.write(self.style.SUCCESS('Agent 2       : agent2@esikatok.com / EsikaTok2024!'))
        self.stdout.write(self.style.SUCCESS('Utilisateur   : utilisateur@esikatok.com / EsikaTok2024!'))

    def creer_plans(self):
        plans = [
            {
                'nom': 'standard',
                'prix_mensuel_usd': 10,
                'nombre_publications_max': 10,
                'nombre_boosts_inclus': 2,
                'messages_illimites': True,
                'description': 'Plan standard pour démarrer. 10 publications et 2 boosts par mois.',
                'ordre_affichage': 1,
            },
            {
                'nom': 'pro',
                'prix_mensuel_usd': 15,
                'nombre_publications_max': 30,
                'nombre_boosts_inclus': 5,
                'messages_illimites': True,
                'description': 'Plan professionnel. 30 publications et 5 boosts par mois.',
                'ordre_affichage': 2,
            },
            {
                'nom': 'premium',
                'prix_mensuel_usd': 20,
                'nombre_publications_max': 0,  # Illimité
                'nombre_boosts_inclus': 0,  # Illimité
                'messages_illimites': True,
                'description': 'Plan premium illimité. Publications et boosts sans limite.',
                'ordre_affichage': 3,
            },
        ]
        for p in plans:
            _, cree = PlanAbonnement.objects.get_or_create(
                nom=p['nom'], defaults=p,
            )
            if cree:
                self.stdout.write(f'  Plan créé : {p["nom"]}')

    def creer_directeur(self):
        if ProfilAdministrateur.objects.filter(matricule='DG19032004CEO').exists():
            self.stdout.write('  Directeur existant.')
            return
        directeur = Utilisateur.objects.create_user(
            email='directeur@esikatok.com',
            password='Ma_societe_CE0',
            nom='Kabila',
            prenom='Jean-Pierre',
            type_compte='administrateur',
            est_actif=True,
            is_staff=True,
        )
        ProfilAdministrateur.objects.create(
            utilisateur=directeur,
            matricule='DG19032004CEO',
            role_admin='directeur',
        )
        self.stdout.write(self.style.SUCCESS('  Directeur créé (DG19032004CEO)'))

    def creer_admins(self):
        admins_data = [
            {
                'email': 'gestion@esikatok.com',
                'nom': 'Lukaku',
                'prenom': 'Marie',
                'matricule': 'GES-001',
                'role_admin': 'gestion',
                'label': 'Gestionnaire',
            },
            {
                'email': 'moderateur@esikatok.com',
                'nom': 'Mbuyi',
                'prenom': 'Sarah',
                'matricule': 'MOD-001',
                'role_admin': 'moderateur',
                'label': 'Modérateur',
            },
        ]
        for a in admins_data:
            if ProfilAdministrateur.objects.filter(matricule=a['matricule']).exists():
                self.stdout.write(f'  {a["label"]} existant.')
                continue
            utilisateur = Utilisateur.objects.create_user(
                email=a['email'],
                password='EsikaTok2024!',
                nom=a['nom'],
                prenom=a['prenom'],
                type_compte='administrateur',
                est_actif=True,
                is_staff=True,
            )
            ProfilAdministrateur.objects.create(
                utilisateur=utilisateur,
                matricule=a['matricule'],
                role_admin=a['role_admin'],
            )
            self.stdout.write(self.style.SUCCESS(f'  {a["label"]} créé ({a["matricule"]})'))


    def creer_agents(self):
        agents_data = [
            {
                'email': 'agent1@esikatok.com',
                'nom': 'Mbemba',
                'prenom': 'Patrick',
                'telephone': '+243 812 345 678',
                'nom_pro': 'Agence Immobilière Excellence',
                'description': 'Spécialiste en immobilier résidentiel à Gombe et Ngaliema. Plus de 5 ans d\'expérience.',
            },
            {
                'email': 'agent2@esikatok.com',
                'nom': 'Tshimanga',
                'prenom': 'Grace',
                'telephone': '+243 823 456 789',
                'nom_pro': 'Grace Immo Services',
                'description': 'Experte en location et vente dans toutes les communes de Kinshasa.',
            },
        ]
        for a in agents_data:
            if Utilisateur.objects.filter(email=a['email']).exists():
                self.stdout.write(f'  Agent existant : {a["email"]}')
                continue
            utilisateur = Utilisateur.objects.create_user(
                email=a['email'],
                password='EsikaTok2024!',
                nom=a['nom'],
                prenom=a['prenom'],
                telephone=a['telephone'],
                type_compte='agent',
                est_actif=True,
            )
            ProfilAgent.objects.create(
                utilisateur=utilisateur,
                nom_professionnel=a['nom_pro'],
                bio=a['description'],
                est_verifie_agent=True,
            )
            creer_essai_gratuit_agent(utilisateur)
            self.stdout.write(self.style.SUCCESS(f'  Agent créé : {a["email"]}'))

    def creer_utilisateurs(self):
        if Utilisateur.objects.filter(email='utilisateur@esikatok.com').exists():
            self.stdout.write('  Utilisateur existant.')
            return
        Utilisateur.objects.create_user(
            email='utilisateur@esikatok.com',
            password='EsikaTok2024!',
            nom='Mutombo',
            prenom='David',
            telephone='+243 834 567 890',
            type_compte='simple',
            est_actif=True,
        )
        self.stdout.write(self.style.SUCCESS('  Utilisateur simple créé'))

    def creer_biens_demo(self):
        agent1 = Utilisateur.objects.filter(email='agent1@esikatok.com').first()
        agent2 = Utilisateur.objects.filter(email='agent2@esikatok.com').first()
        kinshasa = Ville.objects.filter(nom='Kinshasa').first()

        if not agent1 or not agent2 or not kinshasa:
            self.stdout.write(self.style.WARNING('  Impossible de créer les biens : données manquantes.'))
            return

        communes = {c.nom: c for c in Commune.objects.filter(ville=kinshasa)}

        biens_data = [
            {
                'agent': agent1,
                'titre': 'Bel appartement meublé 3 chambres à Gombe',
                'description': 'Magnifique appartement entièrement meublé au cœur de Gombe. '
                    '3 chambres, 2 salles de bain, salon spacieux, cuisine équipée. '
                    'Parking inclus. Sécurité 24h/24. Idéal pour famille ou expatrié.',
                'type_bien': 'appartement',
                'type_offre': 'location',
                'prix': 1500,
                'commune': 'Gombe',
                'nombre_chambres': 3,
                'nombre_salles_bain': 2,
                'surface_m2': 120,
            },
            {
                'agent': agent1,
                'titre': 'Villa luxe avec piscine à Ngaliema',
                'description': 'Superbe villa de standing avec piscine privée à Ngaliema. '
                    '5 chambres, 4 salles de bain, jardin tropical, garage double. '
                    'Vue panoramique sur le fleuve Congo. Quartier résidentiel sécurisé.',
                'type_bien': 'villa',
                'type_offre': 'vente',
                'prix': 450000,
                'commune': 'Ngaliema',
                'nombre_chambres': 5,
                'nombre_salles_bain': 4,
                'surface_m2': 350,
            },
            {
                'agent': agent2,
                'titre': 'Studio moderne au centre de Lemba',
                'description': 'Studio moderne et lumineux au centre de Lemba, proche de l\'université. '
                    'Idéal pour étudiant ou jeune professionnel. Eau et électricité incluses.',
                'type_bien': 'studio',
                'type_offre': 'location',
                'prix': 250,
                'commune': 'Lemba',
                'nombre_chambres': 1,
                'nombre_salles_bain': 1,
                'surface_m2': 35,
            },
            {
                'agent': agent2,
                'titre': 'Terrain constructible 500m² à Mont-Ngafula',
                'description': 'Terrain plat et constructible de 500m² à Mont-Ngafula. '
                    'Titre foncier disponible. Accès route goudronnée. '
                    'Quartier calme et en plein développement.',
                'type_bien': 'terrain',
                'type_offre': 'vente',
                'prix': 35000,
                'commune': 'Mont-Ngafula',
                'nombre_chambres': 0,
                'nombre_salles_bain': 0,
                'surface_m2': 500,
            },
            {
                'agent': agent1,
                'titre': 'Duplex spacieux 4 chambres à Limete',
                'description': 'Grand duplex de 4 chambres à Limete résidentiel. '
                    'Rez-de-chaussée : salon, cuisine, salle d\'eau. '
                    'Étage : 4 chambres, 2 salles de bain. Cour privée.',
                'type_bien': 'duplex',
                'type_offre': 'location',
                'prix': 800,
                'commune': 'Limete',
                'nombre_chambres': 4,
                'nombre_salles_bain': 3,
                'surface_m2': 180,
            },
            {
                'agent': agent2,
                'titre': 'Local commercial sur avenue principale à Kintambo',
                'description': 'Local commercial de 80m² sur l\'avenue principale de Kintambo. '
                    'Grande visibilité, forte fréquentation. Idéal pour boutique, '
                    'restaurant ou bureau. Disponible immédiatement.',
                'type_bien': 'bureau',
                'type_offre': 'location',
                'prix': 600,
                'commune': 'Kintambo',
                'nombre_chambres': 0,
                'nombre_salles_bain': 1,
                'surface_m2': 80,
            },
        ]

        compteur = 0
        maintenant = timezone.now()

        for i, bd in enumerate(biens_data):
            commune = communes.get(bd['commune'])
            if not commune:
                continue

            if BienImmobilier.objects.filter(
                titre=bd['titre'], agent=bd['agent']
            ).exists():
                continue

            bien = BienImmobilier.objects.create(
                agent=bd['agent'],
                titre=bd['titre'],
                description=bd['description'],
                type_bien=bd['type_bien'],
                type_offre=bd['type_offre'],
                prix=bd['prix'],
                devise='USD',
                nombre_chambres=bd['nombre_chambres'],
                nombre_salles_bain=bd['nombre_salles_bain'],
                surface_m2=bd.get('surface_m2'),
                ville=kinshasa,
                commune=commune,
                statut='publie',
                date_publication=maintenant - timedelta(days=i),
                nombre_vues=50 + (i * 30),
                nombre_favoris=5 + i,
                est_booste=(i < 2),  # Les 2 premiers sont boostés
            )
            compteur += 1

        self.stdout.write(self.style.SUCCESS(f'  {compteur} bien(s) de démonstration créé(s)'))
