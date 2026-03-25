"""
Tests pour les biens immobiliers EsikaTok.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.comptes.models import Utilisateur, ProfilAgent
from apps.localisations.models import Ville, Commune
from apps.biens.models import BienImmobilier
from apps.abonnements.models import PlanAbonnement, Abonnement, CycleAbonnement
from django.utils import timezone
from datetime import timedelta


class TestFilBiens(TestCase):
    """Tests du fil principal de biens."""

    def setUp(self):
        self.client = APIClient()
        self.ville = Ville.objects.create(nom='Kinshasa', pays='RDC', est_active=True)
        self.commune = Commune.objects.create(nom='Gombe', ville=self.ville, est_active=True)
        self.agent = Utilisateur.objects.create_user(
            email='agent@test.com', password='test1234',
            nom='Agent', prenom='Test', type_compte='agent',
        )
        ProfilAgent.objects.create(utilisateur=self.agent, nom_professionnel='Test')

    def test_fil_accessible_sans_auth(self):
        reponse = self.client.get('/api/v1/biens/fil/')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)

    def test_fil_retourne_biens_publies(self):
        BienImmobilier.objects.create(
            agent=self.agent, titre='Bien publié', description='Test',
            type_bien='appartement', type_offre='location',
            prix=500, ville=self.ville, commune=self.commune,
            statut='publie', date_publication=timezone.now(),
        )
        BienImmobilier.objects.create(
            agent=self.agent, titre='Bien brouillon', description='Test',
            type_bien='maison', type_offre='vente',
            prix=100000, ville=self.ville, commune=self.commune,
            statut='brouillon',
        )
        reponse = self.client.get('/api/v1/biens/fil/')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        resultats = reponse.data.get('results', reponse.data)
        titres = [b['titre'] for b in resultats]
        self.assertIn('Bien publié', titres)
        self.assertNotIn('Bien brouillon', titres)

    def test_detail_bien(self):
        bien = BienImmobilier.objects.create(
            agent=self.agent, titre='Détail test', description='Description test',
            type_bien='villa', type_offre='vente',
            prix=250000, ville=self.ville, commune=self.commune,
            statut='publie', date_publication=timezone.now(),
        )
        reponse = self.client.get(f'/api/v1/biens/{bien.id}/')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertEqual(reponse.data['titre'], 'Détail test')


class TestCreationBien(TestCase):
    """Tests de création de bien par un agent."""

    def setUp(self):
        self.client = APIClient()
        self.ville = Ville.objects.create(nom='Kinshasa', pays='RDC', est_active=True)
        self.commune = Commune.objects.create(nom='Gombe', ville=self.ville, est_active=True)
        self.agent = Utilisateur.objects.create_user(
            email='agent@test.com', password='test1234',
            nom='Agent', prenom='Test', type_compte='agent',
        )
        ProfilAgent.objects.create(utilisateur=self.agent, nom_professionnel='Test')
        # Créer plan et abonnement actif
        plan = PlanAbonnement.objects.create(
            nom='premium', prix_mensuel_usd=20,
            nombre_publications_max=0, nombre_boosts_inclus=0,
        )
        maintenant = timezone.now()
        abo = Abonnement.objects.create(
            agent=self.agent, plan=plan, statut='actif',
            date_debut=maintenant, date_fin=maintenant + timedelta(days=30),
        )
        CycleAbonnement.objects.create(
            abonnement=abo,
            date_debut_cycle=maintenant,
            date_fin_cycle=maintenant + timedelta(days=30),
        )

    def test_agent_peut_creer_bien(self):
        self.client.force_authenticate(user=self.agent)
        donnees = {
            'titre': 'Nouvel appartement',
            'description': 'Un bel appartement à Gombe.',
            'type_bien': 'appartement',
            'type_offre': 'location',
            'prix': 800,
            'ville': self.ville.id,
            'commune': self.commune.id,
        }
        reponse = self.client.post('/api/v1/biens/creer/', donnees, format='multipart')
        self.assertIn(reponse.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    def test_utilisateur_simple_ne_peut_pas_creer_bien(self):
        simple = Utilisateur.objects.create_user(
            email='simple@test.com', password='test1234',
            nom='Simple', prenom='User', type_compte='simple',
        )
        self.client.force_authenticate(user=simple)
        reponse = self.client.post('/api/v1/biens/creer/', {}, format='multipart')
        self.assertEqual(reponse.status_code, status.HTTP_403_FORBIDDEN)


class TestRecherche(TestCase):
    """Tests du moteur de recherche."""

    def setUp(self):
        self.client = APIClient()
        self.ville = Ville.objects.create(nom='Kinshasa', pays='RDC', est_active=True)
        self.commune = Commune.objects.create(nom='Gombe', ville=self.ville, est_active=True)
        self.agent = Utilisateur.objects.create_user(
            email='agent@test.com', password='test1234',
            nom='Agent', prenom='Test', type_compte='agent',
        )
        BienImmobilier.objects.create(
            agent=self.agent, titre='Appart Gombe', description='Appartement',
            type_bien='appartement', type_offre='location',
            prix=500, ville=self.ville, commune=self.commune,
            statut='publie', date_publication=timezone.now(),
        )
        BienImmobilier.objects.create(
            agent=self.agent, titre='Villa Gombe', description='Villa',
            type_bien='villa', type_offre='vente',
            prix=300000, ville=self.ville, commune=self.commune,
            statut='publie', date_publication=timezone.now(),
        )

    def test_recherche_par_type(self):
        reponse = self.client.get('/api/v1/recherche/?type_bien=appartement')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)

    def test_recherche_par_commune(self):
        reponse = self.client.get(f'/api/v1/recherche/?commune={self.commune.id}')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)

    def test_biens_boostes(self):
        reponse = self.client.get('/api/v1/recherche/boostes/')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)


class TestFavoris(TestCase):
    """Tests des favoris."""

    def setUp(self):
        self.client = APIClient()
        self.ville = Ville.objects.create(nom='Kinshasa', pays='RDC', est_active=True)
        self.commune = Commune.objects.create(nom='Gombe', ville=self.ville, est_active=True)
        self.agent = Utilisateur.objects.create_user(
            email='agent@test.com', password='test1234',
            nom='Agent', prenom='Test', type_compte='agent',
        )
        self.utilisateur = Utilisateur.objects.create_user(
            email='user@test.com', password='test1234',
            nom='User', prenom='Test', type_compte='simple',
        )
        self.bien = BienImmobilier.objects.create(
            agent=self.agent, titre='Bien fav', description='Test',
            type_bien='appartement', type_offre='location',
            prix=500, ville=self.ville, commune=self.commune,
            statut='publie', date_publication=timezone.now(),
        )

    def test_ajouter_favori(self):
        self.client.force_authenticate(user=self.utilisateur)
        reponse = self.client.post('/api/v1/favoris/ajouter/', {'bien': self.bien.id}, format='json')
        self.assertIn(reponse.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    def test_liste_favoris(self):
        self.client.force_authenticate(user=self.utilisateur)
        reponse = self.client.get('/api/v1/favoris/')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)

    def test_favoris_requiert_auth(self):
        reponse = self.client.get('/api/v1/favoris/')
        self.assertEqual(reponse.status_code, status.HTTP_401_UNAUTHORIZED)
