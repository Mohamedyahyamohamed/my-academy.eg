from pathlib import Path
import re

for root in (Path("app"), Path("components")):
    for path in sorted(root.rglob("*.tsx")):
        text = path.read_text(errors="ignore")
        for i, line in enumerate(text.splitlines(), 1):
            if not re.search(r"[\u0600-\u06ff]", line):
                continue
            stripped = line.strip()
            if stripped.startswith(("//", "*", "/*", "*")):
                continue
            if any(token in line for token in ("en ?", "en:", "titleAr", "ar:", "Arabic", "العربية", "dir=", "getLangFromCookie", "useClientLang")):
                continue
            print(f"{path}:{i}:{stripped}")
