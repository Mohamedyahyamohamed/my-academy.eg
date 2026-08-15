from pathlib import Path

changes = {
    'app/(app)/lessons/page.tsx': [
        ('formatDate(l.date)', 'formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)', 'formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/notifications/page.tsx': [
        ('formatRelative(n.created_at)', 'formatRelative(n.created_at, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/parent/children/[id]/page.tsx': [
        ('formatDate(lesson.date)', 'formatDate(lesson.date, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatDate(s.homework?.deadline)', 'formatDate(s.homework?.deadline, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatDate(l.date)', 'formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/student/grades/page.tsx': [
        ('formatDate(exam.date)', 'formatDate(exam.date, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/student/homework/page.tsx': [
        ('formatDate(s.homework?.deadline)', 'formatDate(s.homework?.deadline, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/student/lessons/page.tsx': [
        ('formatDate(l.date)', 'formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)', 'formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/student/page.tsx': [
        ('formatDate(l.date)', 'formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")'),
        ('formatDate(s.homework?.deadline)', 'formatDate(s.homework?.deadline, undefined, en ? "en-EG" : "ar-EG")'),
    ],
    'app/(app)/teacher/page.tsx': [
        ('formatDate(l.date, { month: "short" })', 'formatDate(l.date, { month: "short" }, lang === "en" ? "en-EG" : "ar-EG")'),
        ('formatDate(l.date)', 'formatDate(l.date, undefined, lang === "en" ? "en-EG" : "ar-EG")'),
        ('formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)', 'formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`, lang === "en" ? "en-EG" : "ar-EG")'),
    ],
    'components/homework/submission-review.tsx': [
        ('formatRelative(s.submitted_at)', 'formatRelative(s.submitted_at, en ? "en-EG" : "ar-EG")'),
    ],
    'components/layout/notifications-menu.tsx': [
        ('formatRelative(n.created_at)', 'formatRelative(n.created_at, en ? "en-EG" : "ar-EG")'),
    ],
    'components/messages/messages-page.tsx': [
        ('formatRelative(m.created_at)', 'formatRelative(m.created_at, en ? "en-EG" : "ar-EG")'),
    ],
    'components/students/student-notes.tsx': [
        ('formatRelative(n.created_at)', 'formatRelative(n.created_at, en ? "en-EG" : "ar-EG")'),
    ],
}

for name, replacements in changes.items():
    path = Path(name)
    text = path.read_text()
    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
    path.write_text(text)
    print(name)
