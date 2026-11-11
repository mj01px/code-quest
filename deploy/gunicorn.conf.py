# Gunicorn da API, chamado por deploy/codequest-api.service a partir de backend/:
#   gunicorn -c ../deploy/gunicorn.conf.py config.wsgi

# Só o loopback: quem fala com o Django é o Next (rewrite /api), nunca a
# internet. É a premissa do NUM_PROXIES=1 em config/settings.py.
bind = "127.0.0.1:8000"

# (2 x vCPU) + 1 num droplet de 1 vCPU. Os contadores de throttle ficam no
# DatabaseCache, então mais workers não multiplicam os limites.
workers = 3

# A correção chama o Judge0 com JUDGE0_TIMEOUT (15 s por padrão); o worker não
# pode morrer antes da resposta voltar.
timeout = 30

# Log no stdout/stderr: o journald do systemd guarda e rotaciona.
accesslog = "-"
errorlog = "-"
