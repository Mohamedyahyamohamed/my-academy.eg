from pathlib import Path

root = Path('.')
changes = {
    'app/(app)/groups/[id]/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(l.date)', 'formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/homework/[id]/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(hw.deadline)', 'formatDate(hw.deadline, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/homework/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(h.deadline)', 'formatDate(h.deadline, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/lessons/[id]/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(lesson.date)', 'formatDate(lesson.date, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatDate(h.deadline)', 'formatDate(h.deadline, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/lessons/new/page.tsx': [
        ('<div className="mx-auto max-w-2xl space-y-6">', '<div className="mx-auto max-w-2xl space-y-6" dir={en ? "ltr" : "rtl"}>'),
    ],
    'app/(app)/parent/attendance/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(lesson.date)', 'formatDate(lesson.date, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/parent/grades/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(exam.date)', 'formatDate(exam.date, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/parent/homework/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(s.homework?.deadline)', 'formatDate(s.homework?.deadline, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/parent/payments/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
    ],
    'app/(app)/parents/[id]/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
    ],
    'app/(app)/students/[id]/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
        ('formatDate(s.homework?.deadline)', 'formatDate(s.homework?.deadline, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatDate(l.date)', 'formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)', 'formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/students/import/page.tsx': [
        ('<div className="space-y-6">', '<div className="space-y-6" dir={en ? "ltr" : "rtl"}>'),
    ],
}

for name, replacements in changes.items():
    path = root / name
    text = path.read_text()
    for old, new in replacements:
        count = text.count(old)
        if count >= 1:
            text = text.replace(old, new, 1)
    path.write_text(text)
    print(name)
