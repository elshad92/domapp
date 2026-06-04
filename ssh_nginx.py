import os, paramiko

HOST = os.getenv("DOMAPP_SSH_HOST", "")
USER = os.getenv("DOMAPP_SSH_USER", "root")
PASS = os.getenv("DOMAPP_SSH_PASSWORD", "")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return (stdout.read().decode("utf-8","replace") + stderr.read().decode("utf-8","replace"))

# Найти активный конфиг nginx и показать location /api
print("=== active nginx config files ===")
print(run("ls -la /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>&1"))

print("=== grep api proxy in all nginx configs ===")
print(run("grep -rn 'proxy_pass\\|location /api\\|location /v1' /etc/nginx/ 2>&1"))

ssh.close()
