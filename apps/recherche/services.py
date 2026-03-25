"""
Service de recherche et scoring pour EsikaTok.
Implémente un moteur de pertinence pondéré pour les biens immobiliers.
"""
from django.db.models import Q, F, Case, When, Value, IntegerField
from apps.biens.models import BienImmobilier


# --- Poids des critères de recherche ---
POIDS_VILLE = 20
POIDS_COMMUNE = 25
POIDS_QUARTIER = 15
POIDS_TYPE_BIEN = 15
POIDS_TYPE_OFFRE = 10
POIDS_PRIX = 10
POIDS_CHAMBRES = 5
POIDS_BOOST = 10  # Bonus pour les biens boostés
POIDS_FRAICHEUR = 5  # Bonus pour les publications récentes


def rechercher_biens(filtres, utilisateur=None):
    """
    Recherche des biens avec un score de pertinence pondéré.
    Retourne les biens classés de 100% à 1% de correspondance.

    Paramètres de filtres possibles :
    - ville_id, commune_id, quartier_id
    - type_bien, type_offre
    - prix_min, prix_max
    - chambres_min
    - terme_recherche (texte libre)
    """
    # Base : uniquement les biens publiés/approuvés (exclure vidéos supprimées)
    queryset = BienImmobilier.objects.filter(statut__in=['publie', 'approuve']).exclude(
        video__est_supprime=True
    ).select_related(
        'agent', 'ville', 'commune', 'quartier'
    ).prefetch_related('video', 'images')

    # Si aucun filtre, retourner les biens récents et boostés
    if not any(filtres.values()):
        return queryset.order_by('-est_booste', '-date_publication')

    # --- Construction des annotations de score ---
    annotations_score = []
    score_total_max = 0

    ville_id = filtres.get('ville_id')
    commune_id = filtres.get('commune_id')
    quartier_id = filtres.get('quartier_id')
    type_bien = filtres.get('type_bien')
    type_offre = filtres.get('type_offre')
    prix_min = filtres.get('prix_min')
    prix_max = filtres.get('prix_max')
    chambres_min = filtres.get('chambres_min')

    # Score ville
    if ville_id:
        score_total_max += POIDS_VILLE
        annotations_score.append(
            Case(
                When(ville_id=ville_id, then=Value(POIDS_VILLE)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    # Score commune
    if commune_id:
        score_total_max += POIDS_COMMUNE
        annotations_score.append(
            Case(
                When(commune_id=commune_id, then=Value(POIDS_COMMUNE)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    # Score quartier
    if quartier_id:
        score_total_max += POIDS_QUARTIER
        annotations_score.append(
            Case(
                When(quartier_id=quartier_id, then=Value(POIDS_QUARTIER)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    # Score type de bien
    if type_bien:
        score_total_max += POIDS_TYPE_BIEN
        annotations_score.append(
            Case(
                When(type_bien=type_bien, then=Value(POIDS_TYPE_BIEN)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    # Score type d'offre
    if type_offre:
        score_total_max += POIDS_TYPE_OFFRE
        annotations_score.append(
            Case(
                When(type_offre=type_offre, then=Value(POIDS_TYPE_OFFRE)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    # Score prix
    if prix_max:
        score_total_max += POIDS_PRIX
        annotations_score.append(
            Case(
                When(prix__lte=prix_max, then=Value(POIDS_PRIX)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
    elif prix_min:
        score_total_max += POIDS_PRIX
        annotations_score.append(
            Case(
                When(prix__gte=prix_min, then=Value(POIDS_PRIX)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    # Score chambres
    if chambres_min:
        score_total_max += POIDS_CHAMBRES
        annotations_score.append(
            Case(
                When(nombre_chambres__gte=chambres_min, then=Value(POIDS_CHAMBRES)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    # Bonus boost
    score_total_max += POIDS_BOOST
    annotations_score.append(
        Case(
            When(est_booste=True, then=Value(POIDS_BOOST)),
            default=Value(0),
            output_field=IntegerField(),
        )
    )

    # Calcul du score total
    if annotations_score:
        from django.db.models import Sum
        # Additionner tous les scores partiels
        score_expression = annotations_score[0]
        for annotation in annotations_score[1:]:
            score_expression = score_expression + annotation

        queryset = queryset.annotate(
            score_brut=score_expression,
        )

        # Calculer le pourcentage de correspondance
        if score_total_max > 0:
            queryset = queryset.annotate(
                score_pertinence=Case(
                    When(score_brut__gt=0, then=F('score_brut') * 100 / score_total_max),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
        else:
            queryset = queryset.annotate(
                score_pertinence=Value(50, output_field=IntegerField())
            )

        queryset = queryset.filter(score_pertinence__gte=1).order_by('-score_pertinence', '-date_publication')
    else:
        queryset = queryset.order_by('-est_booste', '-date_publication')

    # Recherche textuelle
    terme = filtres.get('terme_recherche', '').strip()
    if terme:
        queryset = queryset.filter(
            Q(titre__icontains=terme) |
            Q(description__icontains=terme) |
            Q(commune__nom__icontains=terme) |
            Q(quartier__nom__icontains=terme) |
            Q(avenue__icontains=terme)
        )

    return queryset
