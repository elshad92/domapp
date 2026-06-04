# DomApp — Первый деплой на VPS (AlmaLinux 9)
# Выполнять команды на сервере по SSH

# 1. Зависимости системы
dnf install -y git python3.11 python3.11-pip nodejs npm nginx certbot python3-certbot-nginx

# 2. Клонировать репо
git clone https://github.com/YOUR/domapp.git /opt/domapp
cd /opt/domapp

# 3. Python venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 4. .env — скопировать и заполнить
cp .env.example .env
nano .env

# 5. Frontend сборка
cd frontend && npm ci && npm run build && cd ..

# 6. systemd сервисы
cp domapp-backend.service /etc/systemd/system/
cp domapp-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable domapp-backend domapp-bot
systemctl start domapp-backend domapp-bot

# 7. nginx
cp nginx.conf /etc/nginx/conf.d/domapp.conf
nginx -t && systemctl restart nginx

# 8. SSL (после того как DNS domapp.uz указывает на этот сервер)
certbot --nginx -d domapp.uz -d www.domapp.uz

# 9. Проверка
curl https://domapp.uz/health
systemctl status domapp-backend domapp-bot
