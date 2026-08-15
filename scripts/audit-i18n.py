from pathlib import Path
import re

for root in [Path("app"), Path("components")]:
    for path in sorted(root.rglob("*.tsx")):
        text = path.read_text(errors="ignore")
        if not re.search(r"[\u0600-\u06ff]", text):
            continue
        has_lang = any(token in text for token in ("getLangFromCookie", "useClientLang", "lang === \"en\"", "lang === 'en'", "en ?"))
        arabic_lines = [
            f"{i}:{line.strip()}"
            for i, line in enumerate(text.splitlines(), 1)
            if re.search(r"[\u0600-\u06ff]", line)
        ]
        print(f"{path}\t{'LANG_AWARE' if has_lang else 'NO_LANG_DETECTED'}\t{len(arabic_lines)}")
        if not has_lang:
            for line in arabic_lines[:8]:
                print(f"  {line}")
