from bs4 import BeautifulSoup
from pathlib import Path

html_path = Path('/home/ubuntu/upload/my-academy-eg.vercel.app_platform_tab_users_1787153863702.html')
soup = BeautifulSoup(html_path.read_text(encoding='utf-8'), 'html.parser')
rows = []
for a in soup.find_all('a', href=True):
    text = ' '.join(a.get_text(' ', strip=True).split())
    href = a.get('href', '')
    if 'sara.qr.demo@example.com' in text or 'student' in href.lower() or '/students/' in href:
        rows.append({'text': text, 'href': href})
print(rows)
