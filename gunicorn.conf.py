"""
Configuration Gunicorn pour EsikaTok en production.
Utiliser avec : gunicorn -c gunicorn.conf.py esikatok.wsgi:application
"""
import multiprocessing

# --- Réseau ---
bind = "0.0.0.0:8000"
backlog = 2048

# --- Workers ---
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gthread"
threads = 2
timeout = 120
keepalive = 5

# --- Requêtes ---
max_requests = 1000
max_requests_jitter = 50
graceful_timeout = 30

# --- Logging ---
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# --- Sécurité ---
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190
