"""
Services métier pour les comptes utilisateurs EsikaTok.
"""
from django.utils import timezone
from apps.abonnements.models import PlanAbonnement, Abonnement, CycleAbonnement
from datetime import timedelta


def creer_essai_gratuit_agent(utilisateur):
    """
    Crée un abonnement d'essai gratuit Premium de 30 jours
    pour un nouvel agent immobilier.
    """
    plan_premium = PlanAbonnement.objects.filter(nom='premium').first()
    if not plan_premium:
        return None

    maintenant = timezone.now()
    date_fin = maintenant + timedelta(days=30)

    abonnement = Abonnement.objects.create(
        agent=utilisateur,
        plan=plan_premium,
        statut='essai',
        date_debut=maintenant,
        date_fin=date_fin,
        est_essai_gratuit=True,
    )

    CycleAbonnement.objects.create(
        abonnement=abonnement,
        date_debut_cycle=maintenant,
        date_fin_cycle=date_fin,
        est_actif=True,
    )

    return abonnement


def enregistrer_connexion_admin(profil_admin, adresse_ip=None):
    """Enregistre la connexion d'un administrateur."""
    from .models import JournalConnexionAdmin
    profil_admin.est_en_ligne = True
    profil_admin.derniere_activite = timezone.now()
    profil_admin.save(update_fields=['est_en_ligne', 'derniere_activite'])

    return JournalConnexionAdmin.objects.create(
        admin=profil_admin,
        heure_connexion=timezone.now(),
        adresse_ip=adresse_ip,
    )


def enregistrer_deconnexion_admin(profil_admin):
    """Enregistre la déconnexion d'un administrateur."""
    from .models import JournalConnexionAdmin
    profil_admin.est_en_ligne = False
    profil_admin.save(update_fields=['est_en_ligne'])

    journal = JournalConnexionAdmin.objects.filter(
        admin=profil_admin, heure_deconnexion__isnull=True
    ).order_by('-heure_connexion').first()

    if journal:
        journal.heure_deconnexion = timezone.now()
        duree = (journal.heure_deconnexion - journal.heure_connexion).total_seconds() / 60
        journal.duree_session_minutes = int(duree)
        journal.save(update_fields=['heure_deconnexion', 'duree_session_minutes'])

    return journal


def journaliser_action_admin(profil_admin, action, detail='', objet_type='', objet_id=None):
    """Enregistre une action effectuée par un administrateur (rôle inclus)."""
    from .models import JournalActiviteAdmin
    role = getattr(profil_admin, 'role_admin', 'inconnu')
    detail_complet = f"[{role}] {detail}" if detail else f"[{role}]"
    return JournalActiviteAdmin.objects.create(
        admin=profil_admin,
        action=action,
        detail=detail_complet,
        objet_type=objet_type,
        objet_id=objet_id,
    )
