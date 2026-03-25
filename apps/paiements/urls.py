"""
URLs des paiements pour EsikaTok.
"""
from django.urls import path
from .views import VueMesTransactions

urlpatterns = [
    path('transactions/', VueMesTransactions.as_view(), name='mes_transactions'),
]
