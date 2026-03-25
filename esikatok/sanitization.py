"""
Utilitaires de nettoyage des entrées utilisateur pour EsikaTok.
Protège contre les injections XSS dans les champs texte libres.
"""
import bleach


# Tags et attributs autorisés pour le contenu riche (si nécessaire à l'avenir)
TAGS_AUTORISES = []
ATTRIBUTS_AUTORISES = {}


def nettoyer_texte(valeur):
    """
    Nettoie une chaîne de caractères en supprimant tout HTML/script.
    À utiliser sur les champs texte libres soumis par les utilisateurs.
    """
    if not isinstance(valeur, str):
        return valeur
    return bleach.clean(valeur, tags=TAGS_AUTORISES, attributes=ATTRIBUTS_AUTORISES, strip=True).strip()


def nettoyer_dict(donnees, champs):
    """
    Nettoie les champs spécifiés d'un dictionnaire.
    Utile pour nettoyer request.data avant traitement.
    """
    for champ in champs:
        if champ in donnees and isinstance(donnees[champ], str):
            donnees[champ] = nettoyer_texte(donnees[champ])
    return donnees
