from pathlib import Path

for root in (Path('components'), Path('app')):
    for p in sorted(root.rglob('*.tsx')):
        s = p.read_text(errors='ignore')
        if not any('\u0600' <= c <= '\u06ff' for c in s):
            continue
        if 'useClientLang' in s or 'getLangFromCookie' in s or 'en =' in s or 'en:' in s or 'lang' in s and 'LANG_COOKIE' in s:
            continue
        print(p)
