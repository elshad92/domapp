#!/usr/bin/env python3
"""Исправление nginx - правильное"""
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

# Восстанавливаем оригинальный nginx.conf
original = """# For more information on configuration, see:
#   * Official English Documentation: http://nginx.org/en/docs/
#   * Official Russian Documentation: http://nginx.org/ru/docs/

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    # for more information.
    include /etc/nginx/conf.d/*.conf;
}
"""

stdin, stdout, stderr = ssh.exec_command("cat > /etc/nginx/nginx.conf")
stdin.write(original)
stdin.flush()
stdin.channel.shutdown_write()
stdout.channel.recv_exit_status()
print("nginx.conf restored (without default server block)")

# Записываем наш конфиг
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

# Проверяем и перезапускаем
run("nginx -t 2>&1")
run("systemctl restart nginx 2>&1")
run("curl -s http://localhost/ | head -5")
run("curl -s http://localhost/mobile/ | head -5")
run("curl -s http://localhost:8000/ | head -5")

ssh.close()
print("Done!")
