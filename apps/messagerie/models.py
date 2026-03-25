"""
Modèles de messagerie pour EsikaTok.
La première conversation est toujours déclenchée à partir d'un bien.
"""
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """Conversation entre un utilisateur et un agent, liée à un bien."""

    bien = models.ForeignKey(
        'biens.BienImmobilier',
        on_delete=models.SET_NULL,
        null=True,
        related_name='conversations',
        verbose_name='Bien concerné',
    )
    initiateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_initiees',
        verbose_name='Initiateur',
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_recues',
        verbose_name='Agent',
    )
    est_active = models.BooleanField('Active', default=True)
    date_creation = models.DateTimeField('Date de création', auto_now_add=True)
    date_dernier_message = models.DateTimeField('Dernier message', auto_now=True)

    class Meta:
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'
        ordering = ['-date_dernier_message']
        unique_together = [('initiateur', 'agent', 'bien')]

    def __str__(self):
        return f"Conversation {self.id}: {self.initiateur} → {self.agent} (Bien: {self.bien_id})"


class Message(models.Model):
    """Message dans une conversation."""

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Conversation',
    )
    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='messages_envoyes',
        verbose_name='Expéditeur',
    )
    contenu = models.TextField('Contenu du message')
    est_lu = models.BooleanField('Lu', default=False)
    date_envoi = models.DateTimeField('Date d\'envoi', auto_now_add=True)
    date_lecture = models.DateTimeField('Date de lecture', null=True, blank=True)

    class Meta:
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['date_envoi']

    def __str__(self):
        return f"Message de {self.expediteur} - {self.date_envoi}"
