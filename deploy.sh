#!/bin/bash
# DomApp — deploy.sh
# Запуск: bash deploy.sh
# VPS: AlmaLinux 9, /opt/domapp

set -e

APP_DIR=/opt/domapp
DOMAIN=${DOMAIN:-domapp.uz}
BOT_SERVICE=domapp-bot
BACKEND_SERVICE=domapp-backend

echo "=== DomApp Deploy ==="

# 1. Обновить код
cd $APP_DIR
git pull origin main

# 2. Backend — зависимости
cd $APP_DIR
source venv/bin/activate
pip install -r backend/requirements.txt --quiet

# 3. Frontend — сборка
cd $APP_DIR/frontend
npm ci --silent
npm run build

# 4. Mobile — установка зависимостей (сборка через EAS)
cd $APP_DIR/mobile
npm ci --silent

# 5. Миграции БД
cd $APP_DIR
source venv/bin/activate
python run_migrations.py

# 6. Перезапустить сервисы
systemctl daemon-reload
systemctl restart $BACKEND_SERVICE
systemctl restart $BOT_SERVICE

echo "=== Deploy OK ==="
systemctl status $BACKEND_SERVICE --no-pager
systemctl status $BOT_SERVICE --no-pager
