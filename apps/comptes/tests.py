"""
Tests pour les comptes utilisateurs EsikaTok.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .models import Utilisateur, ProfilAgent, ProfilAdministrateur


class TestInscriptionUtilisateur(TestCase):
    """Tests d'inscription d'un utilisateur simple."""

    def setUp(self):
        self.client = APIClient()

    def test_inscription_reussie(self):
        donnees = {
            'email': 'test@gmail.com',
            'nom': 'Tshimanga',
            'prenom': 'Paul',
            'mot_de_passe': 'MotDePasse123!',
            'confirmation_mot_de_passe': 'MotDePasse123!',
        }
        reponse = self.client.post('/api/v1/auth/inscription/', donnees, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', reponse.data)
        self.assertEqual(reponse.data['utilisateur']['type_compte'], 'simple')

    def test_inscription_email_duplique(self):
        Utilisateur.objects.create_user(email='deja@test.com', password='test1234')
        donnees = {
            'email': 'deja@test.com',
            'nom': 'Test',
            'prenom': 'User',
            'mot_de_passe': 'MotDePasse123!',
            'confirmation_mot_de_passe': 'MotDePasse123!',
        }
        reponse = self.client.post('/api/v1/auth/inscription/', donnees, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inscription_mots_de_passe_differents(self):
        donnees = {
            'email': 'nouveau@test.com',
            'nom': 'Test',
            'prenom': 'User',
            'mot_de_passe': 'MotDePasse123!',
            'confirmation_mot_de_passe': 'Autre123!',
        }
        reponse = self.client.post('/api/v1/auth/inscription/', donnees, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inscription_email_jetable_refuse(self):
        donnees = {
            'email': 'test@yopmail.com',
            'nom': 'Test',
            'prenom': 'User',
            'mot_de_passe': 'MotDePasse123!',
            'confirmation_mot_de_passe': 'MotDePasse123!',
        }
        reponse = self.client.post('/api/v1/auth/inscription/', donnees, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)


class TestInscriptionAgent(TestCase):
    """Tests d'inscription d'un agent immobilier."""

    def setUp(self):
        self.client = APIClient()

    def test_inscription_agent_reussie(self):
        donnees = {
            'email': 'agent@gmail.com',
            'nom': 'Mbemba',
            'prenom': 'Patrick',
            'telephone': '+243812345678',
            'nom_professionnel': 'Agence Test',
            'mot_de_passe': 'MotDePasse123!',
            'confirmation_mot_de_passe': 'MotDePasse123!',
        }
        reponse = self.client.post('/api/v1/auth/inscription-agent/', donnees, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reponse.data['utilisateur']['type_compte'], 'agent')

        # Vérifier que le profil agent a été créé
        utilisateur = Utilisateur.objects.get(email='agent@gmail.com')
        self.assertTrue(hasattr(utilisateur, 'profil_agent'))
        self.assertEqual(utilisateur.profil_agent.nom_professionnel, 'Agence Test')


class TestConnexion(TestCase):
    """Tests de connexion."""

    def setUp(self):
        self.client = APIClient()
        self.utilisateur = Utilisateur.objects.create_user(
            email='connecte@test.com',
            password='MotDePasse123!',
            nom='Test',
            prenom='User',
        )

    def test_connexion_reussie(self):
        reponse = self.client.post('/api/v1/auth/connexion/', {
            'email': 'connecte@test.com',
            'mot_de_passe': 'MotDePasse123!',
        }, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', reponse.data)

    def test_connexion_mauvais_mot_de_passe(self):
        reponse = self.client.post('/api/v1/auth/connexion/', {
            'email': 'connecte@test.com',
            'mot_de_passe': 'mauvais',
        }, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_connexion_compte_desactive(self):
        self.utilisateur.est_actif = False
        self.utilisateur.save()
        reponse = self.client.post('/api/v1/auth/connexion/', {
            'email': 'connecte@test.com',
            'mot_de_passe': 'MotDePasse123!',
        }, format='json')
        self.assertIn(reponse.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class TestPermissionsRoles(TestCase):
    """Tests des permissions par rôle."""

    def setUp(self):
        self.client = APIClient()
        self.simple = Utilisateur.objects.create_user(
            email='simple@test.com', password='test1234',
            nom='Simple', prenom='User', type_compte='simple',
        )
        self.agent = Utilisateur.objects.create_user(
            email='agent@test.com', password='test1234',
            nom='Agent', prenom='User', type_compte='agent',
        )
        ProfilAgent.objects.create(
            utilisateur=self.agent,
            nom_professionnel='Test Agent',
        )

    def test_simple_ne_peut_pas_creer_bien(self):
        self.client.force_authenticate(user=self.simple)
        reponse = self.client.post('/api/v1/biens/creer/', {}, format='multipart')
        self.assertEqual(reponse.status_code, status.HTTP_403_FORBIDDEN)

    def test_simple_ne_peut_pas_voir_stats_agent(self):
        self.client.force_authenticate(user=self.simple)
        reponse = self.client.get('/api/v1/statistiques/agent/')
        self.assertEqual(reponse.status_code, status.HTTP_403_FORBIDDEN)

    def test_simple_peut_voir_fil(self):
        reponse = self.client.get('/api/v1/biens/fil/')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)

    def test_simple_ne_peut_pas_acceder_admin(self):
        self.client.force_authenticate(user=self.simple)
        reponse = self.client.get('/api/v1/statistiques/tableau-de-bord/')
        self.assertEqual(reponse.status_code, status.HTTP_403_FORBIDDEN)


class TestModeleUtilisateur(TestCase):
    """Tests du modèle Utilisateur."""

    def test_creation_utilisateur(self):
        u = Utilisateur.objects.create_user(
            email='test@exemple.com',
            password='test1234',
            nom='Mutombo',
            prenom='David',
        )
        self.assertEqual(u.email, 'test@exemple.com')
        self.assertTrue(u.check_password('test1234'))
        self.assertTrue(u.est_actif)
        self.assertEqual(u.type_compte, 'simple')

    def test_nom_complet(self):
        u = Utilisateur(nom='Kabila', postnom='Wa', prenom='Jean')
        self.assertEqual(u.nom_complet, 'Jean Wa Kabila')

    def test_proprietes_role(self):
        u = Utilisateur(type_compte='agent')
        self.assertTrue(u.est_agent)
        self.assertFalse(u.est_administrateur)
        self.assertFalse(u.est_simple)

    def test_email_obligatoire(self):
        with self.assertRaises(ValueError):
            Utilisateur.objects.create_user(email='', password='test1234')
