"""
Vues API pour la modération de contenu EsikaTok.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import SoumissionModeration, DecisionModeration
from .serializers import (
    SoumissionModerationSerializer,
    DecisionModerationSerializer,
    TraiterModerationSerializer,
)
from apps.comptes.permissions import EstModerateur, EstAdministrateur
from apps.comptes.services import journaliser_action_admin


class VueListeSoumissions(generics.ListAPIView):
    """Liste des soumissions de modération."""
    permission_classes = [IsAuthenticated, EstModerateur]
    serializer_class = SoumissionModerationSerializer

    def get_queryset(self):
        queryset = SoumissionModeration.objects.select_related(
            'bien__agent', 'bien__ville', 'bien__commune', 'agent'
        ).order_by('-date_soumission')

        filtre_statut = self.request.query_params.get('statut')
        if filtre_statut:
            queryset = queryset.filter(statut=filtre_statut)
        return queryset


class VueDetailSoumission(generics.RetrieveAPIView):
    """Détail d'une soumission de modération."""
    permission_classes = [IsAuthenticated, EstModerateur]
    serializer_class = SoumissionModerationSerializer
    queryset = SoumissionModeration.objects.select_related(
        'bien__agent', 'bien__ville', 'bien__commune', 'agent'
    )


class VueTraiterModeration(APIView):
    """Traiter une soumission (approuver, refuser, etc.)."""
    permission_classes = [IsAuthenticated, EstModerateur]

    def post(self, request, pk):
        try:
            soumission = SoumissionModeration.objects.select_related('bien').get(pk=pk)
        except SoumissionModeration.DoesNotExist:
            return Response(
                {'erreur': 'Soumission introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TraiterModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision_val = serializer.validated_data['decision']
        motif = serializer.validated_data.get('motif', '')
        notes = serializer.validated_data.get('notes_internes', '')

        # Créer la décision
        DecisionModeration.objects.create(
            soumission=soumission,
            moderateur=request.user,
            decision=decision_val,
            motif=motif,
            notes_internes=notes,
        )

        # Mettre à jour le statut de la soumission
        soumission.statut = decision_val
        soumission.date_traitement = timezone.now()
        soumission.save(update_fields=['statut', 'date_traitement'])

        # Mettre à jour le statut du bien
        bien = soumission.bien
        mapping_statut = {
            'approuvee': 'publie',
            'refusee': 'refuse',
            'correction': 'brouillon',
            'suspendue': 'suspendu',
        }
        nouveau_statut = mapping_statut.get(decision_val)
        if nouveau_statut:
            bien.statut = nouveau_statut
            if nouveau_statut == 'publie':
                bien.date_publication = timezone.now()
            bien.save(update_fields=['statut', 'date_publication'] if nouveau_statut == 'publie' else ['statut'])

        # Journaliser l'action admin
        try:
            journaliser_action_admin(
                request.user.profil_admin,
                action=f'Modération: {decision_val}',
                detail=f"Bien: {bien.titre} - Motif: {motif}",
                objet_type='SoumissionModeration',
                objet_id=soumission.id,
            )
        except Exception:
            pass

        messages_decision = {
            'approuvee': 'Bien approuvé et publié.',
            'refusee': 'Bien refusé.',
            'correction': 'Correction demandée à l\'agent.',
            'suspendue': 'Bien suspendu.',
        }

        return Response({
            'message': messages_decision.get(decision_val, 'Décision enregistrée.'),
            'soumission': SoumissionModerationSerializer(soumission).data,
        })


class VueStatistiquesModeration(APIView):
    """Statistiques de modération pour le tableau de bord."""
    permission_classes = [IsAuthenticated, EstAdministrateur]

    def get(self, request):
        from django.db.models import Count
        stats = SoumissionModeration.objects.values('statut').annotate(
            total=Count('id')
        )
        return Response({s['statut']: s['total'] for s in stats})
