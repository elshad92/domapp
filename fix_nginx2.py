#!/usr/bin/env python3
"""Полная диагностика и исправление nginx"""
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
    if out: print(out[:2000])
    if err: print(f"ERR: {err[:300]}")
    print("---")

# 1. Смотрим все конфиги nginx
print("=== ALL NGINX CONFIGS ===")
run("find /etc/nginx -name '*.conf' -exec echo '--- {} ---' ; -exec cat {} ;")

# 2. Смотрим что в /etc/nginx/conf.d/
print("=== CONF.D ===")
run("ls -la /etc/nginx/conf.d/")

# 3. Смотрим default.d
print("=== DEFAULT.D ===")
run("ls -la /etc/nginx/default.d/")

# 4. Проверяем есть ли default.conf в conf.d
print("=== CHECK DEFAULT ===")
run("cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo 'no default.conf'")

# 5. Смотрим nginx.conf полностью
print("=== NGINX.CONF ===")
run("cat /etc/nginx/nginx.conf")

# 6. Проверяем что отдаёт curl
print("=== CURL LOCALHOST ===")
run("curl -s -D - http://localhost/ | head -20")

ssh.close()
