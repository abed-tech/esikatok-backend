"""
Commande de gestion : Nettoyer la plateforme EsikaTok.
Supprime tous les utilisateurs (sauf superusers), les biens, vidéos,
conversations, favoris, boosts, abonnements et données associées.
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = (
        "Supprime tous les comptes utilisateurs/agents (sauf superusers), "
        "toutes les vidéos, biens et données associées."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirmer',
            action='store_true',
            help='Confirmer la suppression (obligatoire).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not options['confirmer']:
            self.stderr.write(self.style.ERROR(
                "⚠️  Action destructive ! Ajoutez --confirmer pour exécuter.\n"
                "    python manage.py nettoyer_plateforme --confirmer"
            ))
            return

        from apps.videos.models import Video
        from apps.biens.models import BienImmobilier, ImageBien
        from apps.comptes.models import Utilisateur, ProfilAgent, ProfilAdministrateur
        from apps.favoris.models import Favori
        from apps.messagerie.models import Conversation, Message
        from apps.boosts.models import Boost
        from apps.abonnements.models import Abonnement
        from apps.moderation.models import ActionModeration
        from apps.statistiques.models import StatistiqueVideo
        from apps.paiements.models import Paiement

        self.stdout.write("🗑️  Nettoyage de la plateforme EsikaTok...\n")

        # 1. Vidéos (y compris soft-deleted)
        nb = Video.all_objects.all().delete()[0]
        self.stdout.write(f"   Vidéos supprimées : {nb}")

        # 2. Images de biens
        nb = ImageBien.objects.all().delete()[0]
        self.stdout.write(f"   Images de biens supprimées : {nb}")

        # 3. Biens immobiliers
        nb = BienImmobilier.objects.all().delete()[0]
        self.stdout.write(f"   Biens immobiliers supprimés : {nb}")

        # 4. Messages et conversations
        nb = Message.objects.all().delete()[0]
        self.stdout.write(f"   Messages supprimés : {nb}")
        nb = Conversation.objects.all().delete()[0]
        self.stdout.write(f"   Conversations supprimées : {nb}")

        # 5. Favoris
        nb = Favori.objects.all().delete()[0]
        self.stdout.write(f"   Favoris supprimés : {nb}")

        # 6. Boosts
        nb = Boost.objects.all().delete()[0]
        self.stdout.write(f"   Boosts supprimés : {nb}")

        # 7. Abonnements
        nb = Abonnement.objects.all().delete()[0]
        self.stdout.write(f"   Abonnements supprimés : {nb}")

        # 8. Paiements
        nb = Paiement.objects.all().delete()[0]
        self.stdout.write(f"   Paiements supprimés : {nb}")

        # 9. Modération
        nb = ActionModeration.objects.all().delete()[0]
        self.stdout.write(f"   Actions de modération supprimées : {nb}")

        # 10. Statistiques vidéo
        nb = StatistiqueVideo.objects.all().delete()[0]
        self.stdout.write(f"   Statistiques vidéo supprimées : {nb}")

        # 11. Profils agents
        nb = ProfilAgent.objects.all().delete()[0]
        self.stdout.write(f"   Profils agents supprimés : {nb}")

        # 12. Utilisateurs (sauf superusers)
        qs = Utilisateur.objects.filter(is_superuser=False)
        nb = qs.count()
        qs.delete()
        self.stdout.write(f"   Utilisateurs supprimés : {nb}")

        # Résumé superusers conservés
        superusers = Utilisateur.objects.filter(is_superuser=True)
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Nettoyage terminé. "
            f"Superusers conservés : {superusers.count()}"
        ))
        for su in superusers:
            self.stdout.write(f"   → {su.email}")
