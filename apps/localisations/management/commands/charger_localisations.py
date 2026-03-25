"""
Commande de gestion pour charger les localisations initiales.
Kinshasa et ses 24 communes.
"""
from django.core.management.base import BaseCommand
from apps.localisations.models import Ville, Commune


class Command(BaseCommand):
    help = 'Charge les données géographiques de base : Kinshasa et ses 24 communes'

    def handle(self, *args, **options):
        # Créer Kinshasa
        kinshasa, cree = Ville.objects.get_or_create(
            nom='Kinshasa',
            defaults={
                'code': 'KIN',
                'pays': 'République Démocratique du Congo',
                'latitude': -4.3217055,
                'longitude': 15.3125974,
                'est_active': True,
            }
        )
        if cree:
            self.stdout.write(self.style.SUCCESS('Ville créée : Kinshasa'))
        else:
            self.stdout.write('Ville existante : Kinshasa')

        # Les 24 communes de Kinshasa avec leurs codes
        communes_kinshasa = [
            ('Bandalungwa', 'KIN-BDL'), ('Barumbu', 'KIN-BAR'),
            ('Bumbu', 'KIN-BUM'), ('Gombe', 'KIN-GOM'),
            ('Kalamu', 'KIN-KAL'), ('Kasa-Vubu', 'KIN-KSV'),
            ('Kimbanseke', 'KIN-KIM'), ('Kinshasa', 'KIN-KIN'),
            ('Kintambo', 'KIN-KIT'), ('Kisenso', 'KIN-KIS'),
            ('Lemba', 'KIN-LEM'), ('Limete', 'KIN-LIM'),
            ('Lingwala', 'KIN-LIN'), ('Makala', 'KIN-MAK'),
            ('Maluku', 'KIN-MLK'), ('Masina', 'KIN-MAS'),
            ('Matete', 'KIN-MAT'), ('Mont-Ngafula', 'KIN-MNG'),
            ('Ndjili', 'KIN-NDJ'), ('Ngaba', 'KIN-NGA'),
            ('Ngaliema', 'KIN-NGL'), ('Ngiri-Ngiri', 'KIN-NGN'),
            ('Nsele', 'KIN-NSE'), ('Selembao', 'KIN-SEL'),
        ]

        compteur_crees = 0
        for nom_commune, code_commune in communes_kinshasa:
            _, cree = Commune.objects.get_or_create(
                nom=nom_commune,
                ville=kinshasa,
                defaults={
                    'code': code_commune,
                    'est_active': True,
                },
            )
            if cree:
                compteur_crees += 1

        self.stdout.write(self.style.SUCCESS(
            f'{compteur_crees} commune(s) créée(s) sur {len(communes_kinshasa)} au total.'
        ))
