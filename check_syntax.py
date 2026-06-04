import ast
import sys

files = [
    'backend/routers/requests.py',
    'bot/api.py',
]

ok = True
for f in files:
    try:
        with open(f, encoding='utf-8') as fh:
            ast.parse(fh.read())
        print(f'OK: {f}')
    except SyntaxError as e:
        ok = False
        print(f'SYNTAX ERROR in {f}: {e}')

sys.exit(0 if ok else 1)
