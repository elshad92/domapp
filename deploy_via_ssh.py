#!/usr/bin/env python3
"""DomApp — деплой на сервер через SSH"""
import paramiko
import time
import os

HOST = os.getenv("DOMAPP_SSH_HOST", "")
USER = os.getenv("DOMAPP_SSH_USER", "root")
PASSWORD = os.getenv("DOMAPP_SSH_PASSWORD", "")
LOCAL_DIR = r"C:\Users\user\Desktop\domapp"
REMOTE_DIR = "/opt/domapp"

def run_ssh(ssh, cmd, timeout=60):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out: print(out)
    if err: print(f"STDERR: {err}")
    return exit_status, out, err

def main():
    print("=== DomApp Deploy via SSH ===")
    
    # 1. Подключение
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    ssh.connect(HOST, username=USER, password=PASSWORD, look_for_keys=False)
    print("Connected!")
    
    # 2. Проверим текущее состояние сервера
    run_ssh(ssh, "cat /etc/os-release | head -3")
    run_ssh(ssh, "ls -la /opt/domapp/ 2>/dev/null || echo 'Directory not found'")
    run_ssh(ssh, "systemctl list-units --type=service --state=running | grep -E 'domapp|bot' 2>/dev/null || echo 'No domapp services'")
    
    # 3. Создадим директорию если нет
    run_ssh(ssh, f"mkdir -p {REMOTE_DIR}")
    
    # 4. Загрузим файлы через SFTP
    print("\n=== Uploading files ===")
    sftp = ssh.open_sftp()
    
    # Файлы для загрузки
    files_to_upload = [
        "backend/main.py", "backend/auth.py", "backend/db.py",
        "backend/requirements.txt",
        "bot/main.py", "bot/api.py", "bot/deepseek.py", "bot/keyboards.py",
        "bot/requirements.txt",
        ".env", "run_migrations.py",
        "deploy.sh", "nginx.conf",
        "domapp-backend.service", "domapp-bot.service",
    ]
    
    # Создаём структуру директорий
    dirs = ["backend/routers", "bot/handlers", "frontend", "mobile", "supabase"]
    for d in dirs:
        try:
            sftp.mkdir(f"{REMOTE_DIR}/{d}")
        except:
            pass
    
    # Загружаем файлы
    for f in files_to_upload:
        local_path = os.path.join(LOCAL_DIR, f)
        remote_path = f"{REMOTE_DIR}/{f}"
        if os.path.exists(local_path):
            print(f"Uploading {f}...")
            sftp.put(local_path, remote_path)
    
    # Загружаем роутеры
    routers = ["auth.py", "buildings.py", "residents.py", "requests.py", "announcements.py", "payme.py"]
    for r in routers:
        local_path = os.path.join(LOCAL_DIR, "backend/routers", r)
        remote_path = f"{REMOTE_DIR}/backend/routers/{r}"
        if os.path.exists(local_path):
            print(f"Uploading backend/routers/{r}...")
            sftp.put(local_path, remote_path)
    
    # Загружаем хендлеры бота
    handlers = ["ai_chat.py", "notifications.py"]
    for h in handlers:
        local_path = os.path.join(LOCAL_DIR, "bot/handlers", h)
        remote_path = f"{REMOTE_DIR}/bot/handlers/{h}"
        if os.path.exists(local_path):
            print(f"Uploading bot/handlers/{h}...")
            sftp.put(local_path, remote_path)
    
    # Загружаем models
    models = ["__init__.py", "requests.py", "buildings.py", "residents.py", "announcements.py"]
    for m in models:
        local_path = os.path.join(LOCAL_DIR, "backend/models", m)
        remote_path = f"{REMOTE_DIR}/backend/models/{m}"
        if os.path.exists(local_path):
            print(f"Uploading backend/models/{m}...")
            sftp.put(local_path, remote_path)
    
    # Загружаем frontend (без node_modules)
    print("\n=== Uploading frontend ===")
    for root, dirs, files in os.walk(os.path.join(LOCAL_DIR, "frontend")):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "build")]
        for f in files:
            local_path = os.path.join(root, f)
            rel_path = os.path.relpath(local_path, LOCAL_DIR)
            remote_path = f"{REMOTE_DIR}/{rel_path}".replace("\\", "/")
            remote_dir = os.path.dirname(remote_path)
            try:
                sftp.mkdir(remote_dir)
            except:
                pass
            print(f"Uploading {rel_path}...")
            sftp.put(local_path, remote_path)
    
    # Загружаем mobile (без node_modules, .git)
    print("\n=== Uploading mobile ===")
    for root, dirs, files in os.walk(os.path.join(LOCAL_DIR, "mobile")):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git")]
        for f in files:
            local_path = os.path.join(root, f)
            rel_path = os.path.relpath(local_path, LOCAL_DIR)
            remote_path = f"{REMOTE_DIR}/{rel_path}".replace("\\", "/")
            remote_dir = os.path.dirname(remote_path)
            try:
                sftp.mkdir(remote_dir)
            except:
                pass
            print(f"Uploading {rel_path}...")
            sftp.put(local_path, remote_path)
    
    sftp.close()
    
    # 5. Установка зависимостей и сборка
    print("\n=== Setting up server ===")
    
    # Python venv
    run_ssh(ssh, "cd /opt/domapp && python3 -m venv venv 2>/dev/null || python3 -m venv venv")
    run_ssh(ssh, "cd /opt/domapp && source venv/bin/activate && pip install -r backend/requirements.txt -q")
    run_ssh(ssh, "cd /opt/domapp && source venv/bin/activate && pip install -r bot/requirements.txt -q")
    
    # Миграции
    run_ssh(ssh, "cd /opt/domapp && source venv/bin/activate && python run_migrations.py 2>/dev/null || echo 'Migrations done or not needed'")
    
    # Frontend build
    print("\n=== Building frontend ===")
    run_ssh(ssh, "cd /opt/domapp/frontend && npm install 2>&1 | tail -5")
    run_ssh(ssh, "cd /opt/domapp/frontend && npm run build 2>&1 | tail -10")
    
    # Mobile build
    print("\n=== Building mobile web ===")
    run_ssh(ssh, "cd /opt/domapp/mobile && npm install 2>&1 | tail -5")
    run_ssh(ssh, "cd /opt/domapp/mobile && npx expo install react-dom react-native-web 2>&1 | tail -5")
    run_ssh(ssh, "cd /opt/domapp/mobile && npx expo export --platform web 2>&1 | tail -10")
    
    # 6. Настройка nginx
    print("\n=== Setting up nginx ===")
    nginx_conf = """server {
    listen 80;
    server_name _;
    
    location / {
        root /opt/domapp/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /mobile/ {
        alias /opt/domapp/mobile/dist/;
        index index.html;
        try_files $uri $uri/ /mobile/index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}"""
    stdin, stdout, stderr = ssh.exec_command("cat > /etc/nginx/conf.d/domapp.conf")
    stdin.write(nginx_conf)
    stdin.flush()
    stdin.channel.shutdown_write()
    stdout.channel.recv_exit_status()
    print("Nginx config created")
    
    run_ssh(ssh, "nginx -t 2>&1")
    run_ssh(ssh, "systemctl restart nginx 2>&1")
    
    # 7. Проверка
    print("\n=== Checking services ===")
    run_ssh(ssh, "systemctl status nginx --no-pager | head -5")
    run_ssh(ssh, "systemctl status domapp-backend --no-pager | head -5")
    run_ssh(ssh, "systemctl status domapp-bot --no-pager | head -5")
    
    ssh.close()
    print("\n=== Deploy completed! ===")

if __name__ == "__main__":
    main()
