#!/usr/bin/env python3
"""Исправление nginx - комментируем встроенный server block"""
import os
import paramiko

HOST = os.getenv("DOMAPP_SSH_HOST", "")
USER = os.getenv("DOMAPP_SSH_USER", "root")
PASSWORD = os.getenv("DOMAPP_SSH_PASSWORD", "")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, look_for_keys=False)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"$ {cmd}")
    if out: print(out[:1000])
    if err: print(f"ERR: {err[:200]}")
    print("---")

# 1. Читаем nginx.conf
stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/nginx.conf")
nginx_conf = stdout.read().decode()
print("Original nginx.conf read")

# 2. Комментируем встроенный server block
# Находим server { listen 80; ... } и комментируем его
lines = nginx_conf.split("\n")
new_lines = []
in_default_server = False
for line in lines:
    stripped = line.strip()
    if stripped == "server {" and not in_default_server:
        # Проверяем, что это наш default server (ищем listen 80)
        in_default_server = True
        new_lines.append("# " + line)
    elif in_default_server:
        if stripped == "}":
            in_default_server = False
            new_lines.append("# " + line)
        else:
            new_lines.append("# " + line)
    else:
        new_lines.append(line)

new_nginx_conf = "\n".join(new_lines)

# 3. Записываем изменённый nginx.conf
stdin, stdout, stderr = ssh.exec_command("cat > /etc/nginx/nginx.conf")
stdin.write(new_nginx_conf)
stdin.flush()
stdin.channel.shutdown_write()
stdout.channel.recv_exit_status()
print("nginx.conf updated - default server block commented out")

# 4. Записываем наш конфиг
nginx_conf_domapp = r"""server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /opt/domapp/frontend/dist;
    index index.html;

    location / {
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
stdin.write(nginx_conf_domapp)
stdin.flush()
stdin.channel.shutdown_write()
stdout.channel.recv_exit_status()
print("domapp.conf written")

# 5. Проверяем и перезапускаем
run("nginx -t 2>&1")
run("systemctl restart nginx 2>&1")
run("curl -s http://localhost/ | head -5")
run("curl -s http://localhost/mobile/ | head -5")
run("curl -s http://localhost:8000/ | head -5")

ssh.close()
print("Done!")
