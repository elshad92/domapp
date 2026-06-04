import os, paramiko
import sys

HOST = os.getenv("DOMAPP_SSH_HOST", "")
USER = os.getenv("DOMAPP_SSH_USER", "root")
PASS = os.getenv("DOMAPP_SSH_PASSWORD", "")

def run(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
except Exception as e:
    print("CONNECT ERROR:", e)
    sys.exit(1)

checks = [
    ("PM2 / services status", "systemctl is-active domapp-backend domapp-bot 2>&1 || pm2 list 2>&1"),
    ("Backend on :8000", "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/health 2>&1"),
    ("Backend health body", "curl -s http://127.0.0.1:8000/health 2>&1"),
    ("nginx api proxy", "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/v1/requests 2>&1"),
    ("backend service log tail", "journalctl -u domapp-backend -n 15 --no-pager --output=cat 2>&1 || tail -15 /opt/domapp/backend.log 2>&1"),
]

for label, cmd in checks:
    out, err = run(ssh, cmd)
    result = (out + err).strip()
    try:
        print(f"=== {label} ===")
        print(result.encode("cp1251", errors="replace").decode("cp1251"))
        print()
    except Exception:
        print(result)
        print()

ssh.close()
