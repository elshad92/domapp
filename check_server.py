#!/usr/bin/env python3
"""Проверка сервера"""
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
    if err: print(f"ERR: {err[:300]}")
    print("---")

run("firewall-cmd --list-all 2>/dev/null || echo 'firewalld not available'")
run("ss -tlnp | grep -E '80|443|8000'")
run("ls /etc/nginx/conf.d/")
run("cat /etc/nginx/conf.d/domapp.conf")
run("curl -s -o /dev/null -w '%{http_code}' http://localhost/")
run("curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/")
run("curl -s http://localhost/ | head -5")
run("curl -s http://localhost:8000/ | head -5")

ssh.close()
