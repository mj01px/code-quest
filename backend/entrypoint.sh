#!/bin/sh
set -e

# Tambem cria a tabela do cache de throttle (apps/core, migracao 0001).
python manage.py migrate --noinput

# Conteudo inicial: trilhas, licoes, desafios, exercicios da demo, bonus de XP
# e casos de teste da correcao, nesta ordem (cada um depende dos anteriores).
# Sao idempotentes, mas so rodam com RODAR_SEEDS=1 para nao sobrescrever o que
# foi editado pelo painel a cada restart. Ligar no primeiro deploy e desligar.
if [ "${RODAR_SEEDS:-0}" = "1" ]; then
    python manage.py seed_trilhas
    python manage.py seed_licoes
    python manage.py seed_desafios
    python manage.py seed_demo_pfc
    python manage.py seed_bonus_xp
    python manage.py seed_correcao
fi

# Admin inicial: so com ADMIN_EMAIL definido. Se o e-mail ja existe, nao mexe.
if [ -n "${ADMIN_EMAIL:-}" ]; then
    python manage.py criar_admin
fi

# O cache de throttle e o DatabaseCache, entao mais workers nao multiplicam os
# limites. 2 cabe num droplet de 512MB; subir com GUNICORN_WORKERS em maquina
# maior. timeout acima do JUDGE0_TIMEOUT (15 s) para a correcao responder.
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-2}" \
    --timeout 30 \
    --access-logfile - \
    --error-logfile -
