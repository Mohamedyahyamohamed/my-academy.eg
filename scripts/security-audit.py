from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
source_files = sorted(list((root / 'app').rglob('*.ts')) + list((root / 'app').rglob('*.tsx')) + list((root / 'components').rglob('*.ts')) + list((root / 'components').rglob('*.tsx')) + list((root / 'services').rglob('*.ts')) + list((root / 'lib').rglob('*.ts')))
source_files = [p for p in source_files if not any(part in {'.next', 'node_modules', '.git'} for part in p.parts)]
server_entrypoints = sorted(list((root / 'app/api').rglob('route.ts')) + list((root / 'app/actions').glob('*.ts')))
markers = ('requireScopedRole', 'requireAuth', 'getUser', 'getSession', 'loadCurrentUser', 'currentUser', 'verify', 'webhook', 'public')

print('=== AUTH REVIEW CANDIDATES ===')
for path in server_entrypoints:
    text = path.read_text(errors='ignore')
    if not any(marker in text for marker in markers):
        print(path.relative_to(root))

print('\n=== DANGEROUS PATTERNS ===')

def is_client_module(path: Path, text: str) -> bool:
    return path.suffix in {'.ts', '.tsx'} and re.search(r"^['\"]use client['\"]", text, re.M) is not None

# These patterns intentionally avoid matching ordinary variable names or safe
# server-only imports. Findings should be reviewed with the surrounding line.
patterns = {
    'dangerous_html': re.compile(r'dangerouslySetInnerHTML|\.innerHTML\s*=', re.I),
    'hardcoded_secret_like': re.compile(r'(?:sk_live_|sk_test_|whsec_|Bearer\s+[A-Za-z0-9_-]{30,})', re.I),
    'service_role_in_client_module': re.compile(r'(?i)(?:SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY|service_role)'),
    'raw_sql_template_interpolation': re.compile(r"(?:query|rpc|sql)\s*\(\s*`[^`]*\$\{", re.I | re.S),
}

for name, rx in patterns.items():
    for path in source_files:
        text = path.read_text(errors='ignore')
        if name == 'service_role_in_client_module' and not is_client_module(path, text):
            continue
        match = rx.search(text)
        if match:
            line = text.count('\n', 0, match.start()) + 1
            print(f'{name}: {path.relative_to(root)}:{line}')
