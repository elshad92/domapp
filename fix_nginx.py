#!/usr/bin/env python3
"""Исправление nginx конфига"""
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
    if out: print(out[:500])
    if err: print(f"ERR: {err[:200]}")
    print("---")

# Правильный конфиг - используем raw string для $ переменных
nginx_conf = r"""server {
    listen 80 default_server;
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
stdin.write(nginx_conf)
stdin.flush()
stdin.channel.shutdown_write()
stdout.channel.recv_exit_status()
print("Config written")

run("nginx -t 2>&1")
run("systemctl restart nginx 2>&1")
run("curl -s http://localhost/ | head -5")
run("curl -s http://localhost/mobile/ | head -5")
run("curl -s http://localhost:8000/ | head -5")

ssh.close()
print("Done!")
