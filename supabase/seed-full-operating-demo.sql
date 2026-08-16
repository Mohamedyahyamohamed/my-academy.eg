-- MYAcademy full operating demo seed
-- Safe to re-run. Uses the existing demo academy and creates domain data only.
DO $$
DECLARE
  v_academy uuid := 'f00de531-4af0-4b21-af03-8913972e8ef5';
  v_course uuid;
  v_teacher uuid;
  v_parent uuid;
  v_student uuid;
  v_group uuid;
  v_lesson uuid;
  v_exam uuid;
  v_hw uuid;
  v_content_course uuid;
  v_content_lesson uuid;
  i int;
  j int;
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_month text := to_char(now() at time zone 'Africa/Cairo', 'YYYY-MM');
  v_start time;
  v_end time;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM academies WHERE id = v_academy) THEN
    RAISE EXCEPTION 'Demo academy % does not exist', v_academy;
  END IF;

  -- 1. Subject catalog
  FOR i IN 1..12 LOOP
    INSERT INTO courses (academy_id, name, description, color)
    VALUES (
      v_academy,
      (ARRAY['Mathematics','Physics','Arabic Language','English Language','Chemistry','Biology','Computer Science','French','Statistics','Algebra','Geometry','Science'])[i],
      'Demo operating course for end-to-end testing',
      (ARRAY['#7c5cfc','#0ea5e9','#10b981','#f59e0b','#ec4899','#14b8a6','#6366f1','#f97316','#8b5cf6','#06b6d4','#22c55e','#ef4444'])[i]
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- 2. Teachers (domain records; existing loginable teacher accounts remain intact)
  FOR i IN 1..8 LOOP
    INSERT INTO teachers (academy_id, first_name, last_name, email, phone, bio)
    VALUES (
      v_academy,
      (ARRAY['Ahmed','Mona','Khaled','Nour','Omar','Salma','Youssef','Hana'])[i],
      (ARRAY['Samir','Fawzy','Aziz','Hassan','Mahmoud','Ibrahim','Adel','Mostafa'])[i],
      'demo.teacher.' || i || '@myacademy.test',
      '0101000' || lpad(i::text, 4, '0'),
      'Experienced demo teacher for QA scenarios'
    ) ON CONFLICT (academy_id, email) DO NOTHING;
  END LOOP;

  -- 3. Parents
  FOR i IN 1..24 LOOP
    INSERT INTO parents (academy_id, first_name, last_name, email, phone, occupation)
    VALUES (
      v_academy,
      'Parent' || i,
      'Demo',
      'demo.parent.' || i || '@myacademy.test',
      '0112000' || lpad(i::text, 4, '0'),
      CASE WHEN i % 3 = 0 THEN 'Engineer' WHEN i % 3 = 1 THEN 'Accountant' ELSE 'Doctor' END
    ) ON CONFLICT (academy_id, email) DO NOTHING;
  END LOOP;

  -- 4. Students: active, inactive, and archived edge cases
  FOR i IN 1..72 LOOP
    SELECT id INTO v_parent FROM parents
    WHERE academy_id = v_academy AND email = 'demo.parent.' || (((i - 1) % 24) + 1) || '@myacademy.test'
    LIMIT 1;
    INSERT INTO students (academy_id, first_name, last_name, date_of_birth, gender, phone, email, parent_id, school, grade, notes, status)
    VALUES (
      v_academy,
      CASE WHEN i % 2 = 0 THEN 'Student' ELSE 'طالبة' END || i,
      CASE WHEN i % 3 = 0 THEN 'Hassan' WHEN i % 3 = 1 THEN 'Ahmed' ELSE 'Ali' END,
      (v_today - ((10 + (i % 8)) * 365))::date,
      CASE WHEN i % 2 = 0 THEN 'male' ELSE 'female' END,
      '0123000' || lpad(i::text, 4, '0'),
      'demo.student.' || i || '@myacademy.test',
      v_parent,
      CASE WHEN i % 2 = 0 THEN 'Future Language School' ELSE 'Nile International School' END,
      CASE WHEN i % 6 < 2 THEN 'الصف الأول الثانوي' WHEN i % 6 < 4 THEN 'الصف الثاني الثانوي' ELSE 'الصف الثالث الثانوي' END,
      CASE WHEN i % 10 = 0 THEN 'Needs follow-up' ELSE NULL END,
      CASE WHEN i % 20 = 0 THEN 'ARCHIVED'::student_status WHEN i % 15 = 0 THEN 'INACTIVE'::student_status ELSE 'ACTIVE'::student_status END
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- 5. Ten groups spread across subjects and teachers
  FOR i IN 1..10 LOOP
    SELECT id INTO v_course FROM courses WHERE academy_id = v_academy ORDER BY created_at, id OFFSET ((i - 1) % 12) LIMIT 1;
    SELECT id INTO v_teacher FROM teachers WHERE academy_id = v_academy ORDER BY created_at, id OFFSET ((i - 1) % 8) LIMIT 1;
    INSERT INTO groups (academy_id, name, course_id, teacher_id, monthly_fee, schedule, room, status)
    VALUES (
      v_academy,
      'Demo Group ' || lpad(i::text, 2, '0') || ' - ' || CASE WHEN i % 2 = 0 THEN 'Evening' ELSE 'Morning' END,
      v_course, v_teacher, 350 + (i * 50),
      CASE WHEN i % 2 = 0 THEN 'Sunday / Tuesday 18:00' ELSE 'Saturday / Monday 16:00' END,
      'Room ' || ((i % 5) + 1),
      CASE WHEN i = 10 THEN 'INACTIVE'::group_status ELSE 'ACTIVE'::group_status END
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- 6. Enrollment: 12 active students per group, with overlaps for realistic reporting
  FOR v_group IN SELECT id FROM groups WHERE academy_id = v_academy AND name LIKE 'Demo Group %' ORDER BY name LOOP
    INSERT INTO group_students (group_id, student_id)
    SELECT v_group, s.id FROM students s
    WHERE s.academy_id = v_academy AND s.status = 'ACTIVE'
    ORDER BY s.created_at, s.id
    LIMIT 12 OFFSET ((ascii(right((SELECT name FROM groups WHERE id = v_group), 2)) % 10) * 2)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 7. Lessons: past, current active, and future lessons for every group
  FOR i IN 1..10 LOOP
    SELECT id INTO v_group FROM groups WHERE academy_id = v_academy AND name = 'Demo Group ' || lpad(i::text, 2, '0') || ' - ' || CASE WHEN i % 2 = 0 THEN 'Evening' ELSE 'Morning' END LIMIT 1;
    SELECT teacher_id INTO v_teacher FROM groups WHERE id = v_group;
    INSERT INTO lessons (academy_id, group_id, teacher_id, date, start_time, end_time, topic, description)
    VALUES
      (v_academy, v_group, v_teacher, v_today - 14, CASE WHEN i % 2 = 0 THEN '18:00'::time ELSE '16:00'::time END, CASE WHEN i % 2 = 0 THEN '19:30'::time ELSE '17:30'::time END, 'Revision lesson ' || i, 'Past lesson for attendance history'),
      (v_academy, v_group, v_teacher, v_today - 7, CASE WHEN i % 2 = 0 THEN '18:00'::time ELSE '16:00'::time END, CASE WHEN i % 2 = 0 THEN '19:30'::time ELSE '17:30'::time END, 'Practice lesson ' || i, 'Past lesson for reporting'),
      (v_academy, v_group, v_teacher, v_today + 3, CASE WHEN i % 2 = 0 THEN '18:00'::time ELSE '16:00'::time END, CASE WHEN i % 2 = 0 THEN '19:30'::time ELSE '17:30'::time END, 'Upcoming lesson ' || i, 'Future lesson for calendar testing'),
      (v_academy, v_group, v_teacher, v_today + 10, CASE WHEN i % 2 = 0 THEN '18:00'::time ELSE '16:00'::time END, CASE WHEN i % 2 = 0 THEN '19:30'::time ELSE '17:30'::time END, 'Planning lesson ' || i, 'Second future lesson for calendar testing')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Current active lesson for Demo Group 01 only. It supports QR testing now.
  SELECT id INTO v_group FROM groups WHERE academy_id = v_academy AND name LIKE 'Demo Group 01 - %' LIMIT 1;
  SELECT teacher_id INTO v_teacher FROM groups WHERE id = v_group;
  v_start := ((now() at time zone 'Africa/Cairo')::time - interval '30 minutes')::time;
  v_end := ((now() at time zone 'Africa/Cairo')::time + interval '90 minutes')::time;
  INSERT INTO lessons (academy_id, group_id, teacher_id, date, start_time, end_time, topic, description)
  VALUES (v_academy, v_group, v_teacher, v_today, v_start, v_end, 'QR Active Test Lesson', 'Active lesson reserved for QR attendance testing')
  ON CONFLICT DO NOTHING;

  -- 8. Attendance for all past lessons, deterministic mix of statuses
  INSERT INTO attendance (lesson_id, student_id, status, recorded_at)
  SELECT l.id, gs.student_id,
    CASE WHEN row_number() OVER (PARTITION BY l.id ORDER BY gs.student_id) % 10 <= 6 THEN 'PRESENT'::attendance_status WHEN row_number() OVER (PARTITION BY l.id ORDER BY gs.student_id) % 10 <= 8 THEN 'LATE'::attendance_status ELSE 'ABSENT'::attendance_status END,
    now() - interval '1 day'
  FROM lessons l JOIN group_students gs ON gs.group_id = l.group_id
  WHERE l.academy_id = v_academy AND l.date < v_today
  ON CONFLICT (lesson_id, student_id) DO NOTHING;

  -- 9. Monthly payments, transactions, and edge cases
  INSERT INTO payments (academy_id, student_id, group_id, month, amount_due, amount_paid, due_date, payment_date, method, status, notes)
  SELECT v_academy, gs.student_id, gs.group_id, v_month, g.monthly_fee,
    CASE WHEN row_number() OVER (PARTITION BY gs.group_id ORDER BY gs.student_id) % 5 IN (1,2,3) THEN g.monthly_fee WHEN row_number() OVER (PARTITION BY gs.group_id ORDER BY gs.student_id) % 5 = 4 THEN g.monthly_fee / 2 ELSE 0 END,
    v_today + 5,
    CASE WHEN row_number() OVER (PARTITION BY gs.group_id ORDER BY gs.student_id) % 5 IN (1,2,3) THEN now() - interval '2 days' ELSE NULL END,
    CASE WHEN row_number() OVER (PARTITION BY gs.group_id ORDER BY gs.student_id) % 5 IN (1,2,3) THEN 'CARD' ELSE NULL END,
    CASE WHEN row_number() OVER (PARTITION BY gs.group_id ORDER BY gs.student_id) % 5 IN (1,2,3) THEN 'PAID'::payment_status WHEN row_number() OVER (PARTITION BY gs.group_id ORDER BY gs.student_id) % 5 = 4 THEN 'PARTIAL'::payment_status ELSE 'UNPAID'::payment_status END,
    'Generated operating demo payment'
  FROM group_students gs JOIN groups g ON g.id = gs.group_id
  WHERE g.academy_id = v_academy
  ON CONFLICT (student_id, group_id, month) DO NOTHING;

  -- 10. Exams and grades for each group
  FOR v_group IN SELECT id FROM groups WHERE academy_id = v_academy AND name LIKE 'Demo Group %' ORDER BY name LOOP
    SELECT course_id INTO v_course FROM groups WHERE id = v_group;
    INSERT INTO exams (academy_id, name, course_id, group_id, date, max_score)
    VALUES (v_academy, 'Monthly Assessment', v_course, v_group, v_today - 5, 100)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_exam FROM exams WHERE academy_id = v_academy AND group_id = v_group AND name = 'Monthly Assessment' ORDER BY created_at DESC LIMIT 1;
    INSERT INTO grades (exam_id, student_id, score)
    SELECT v_exam, gs.student_id, 45 + ((row_number() OVER (ORDER BY gs.student_id) * 7) % 56)
    FROM group_students gs WHERE gs.group_id = v_group
    ON CONFLICT (exam_id, student_id) DO NOTHING;
  END LOOP;

  -- 11. Homework and submissions
  FOR v_group IN SELECT id FROM groups WHERE academy_id = v_academy AND name LIKE 'Demo Group %' ORDER BY name LOOP
    SELECT id INTO v_lesson FROM lessons WHERE group_id = v_group ORDER BY date DESC, start_time DESC LIMIT 1;
    INSERT INTO homework (academy_id, group_id, lesson_id, title, description, deadline)
    VALUES (v_academy, v_group, v_lesson, 'Weekly Practice', 'Complete exercises 1 through 10 and upload your work.', now() + interval '5 days')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_hw FROM homework WHERE academy_id = v_academy AND group_id = v_group AND title = 'Weekly Practice' ORDER BY created_at DESC LIMIT 1;
    INSERT INTO homework_submissions (homework_id, student_id, content, status, submitted_at, feedback, grade)
    SELECT v_hw, gs.student_id, 'Demo submission for QA', CASE WHEN row_number() OVER (ORDER BY gs.student_id) % 3 = 0 THEN 'REVIEWED'::homework_status WHEN row_number() OVER (ORDER BY gs.student_id) % 3 = 1 THEN 'SUBMITTED'::homework_status ELSE 'PENDING'::homework_status END, CASE WHEN row_number() OVER (ORDER BY gs.student_id) % 3 = 2 THEN NULL ELSE now() - interval '3 hours' END, CASE WHEN row_number() OVER (ORDER BY gs.student_id) % 3 = 0 THEN 'Good work' ELSE NULL END, CASE WHEN row_number() OVER (ORDER BY gs.student_id) % 3 = 0 THEN 82 ELSE NULL END
    FROM group_students gs WHERE gs.group_id = v_group
    ON CONFLICT (homework_id, student_id) DO NOTHING;
  END LOOP;

  -- 12. Notes and notifications for the existing profile(s) in this academy
  INSERT INTO notes (academy_id, student_id, author_id, author_name, content)
  SELECT v_academy, s.id, p.id, p.full_name, 'Operating demo note: follow up on progress.'
  FROM students s JOIN profiles p ON p.academy_id = v_academy
  WHERE s.academy_id = v_academy AND p.role IN ('ADMIN','TEACHER')
  ORDER BY s.id, p.id LIMIT 30
  ON CONFLICT DO NOTHING;

  INSERT INTO notifications (academy_id, user_id, type, title, message, link, read)
  SELECT v_academy, p.id, 'DEMO', 'Welcome to the operating demo', 'Use this notification to test unread/read behavior.', '/dashboard', (p.id::text < '8')
  FROM profiles p WHERE p.academy_id = v_academy
  ON CONFLICT DO NOTHING;

  -- 13. Teacher learning content for the first five groups
  FOR v_group IN SELECT id FROM groups WHERE academy_id = v_academy AND name LIKE 'Demo Group %' ORDER BY name LIMIT 5 LOOP
    SELECT teacher_id INTO v_teacher FROM groups WHERE id = v_group;
    INSERT INTO content_courses (academy_id, teacher_id, group_id, title, description, sort_order, is_published)
    VALUES (v_academy, v_teacher, v_group, 'Operating Demo Course', 'Published course for content and student progress testing.', 1, true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_content_course FROM content_courses WHERE academy_id = v_academy AND group_id = v_group AND title = 'Operating Demo Course' ORDER BY created_at DESC LIMIT 1;
    FOR j IN 1..4 LOOP
      INSERT INTO content_lessons (academy_id, course_id, title, description, video_url, sort_order, is_published)
      VALUES (v_academy, v_content_course, 'Demo Content Lesson ' || j, 'Lesson used for content navigation testing.', 'https://example.com/demo-video-' || j, j, true)
      ON CONFLICT DO NOTHING;
    END LOOP;
    SELECT id INTO v_content_lesson FROM content_lessons WHERE academy_id = v_academy AND course_id = v_content_course ORDER BY sort_order LIMIT 1;
    INSERT INTO content_progress (academy_id, student_id, lesson_id)
    SELECT v_academy, gs.student_id, v_content_lesson FROM group_students gs WHERE gs.group_id = v_group LIMIT 5
    ON CONFLICT (student_id, lesson_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Full operating demo seed completed for academy %', v_academy;
END $$;

SELECT 'full operating demo seed completed' AS result;
SELECT 'academies' AS entity, count(*) AS count FROM academies WHERE id = 'f00de531-4af0-4b21-af03-8913972e8ef5'
UNION ALL SELECT 'teachers', count(*) FROM teachers WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5'
UNION ALL SELECT 'students', count(*) FROM students WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5'
UNION ALL SELECT 'groups', count(*) FROM groups WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5'
UNION ALL SELECT 'lessons', count(*) FROM lessons WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5'
UNION ALL SELECT 'attendance', count(*) FROM attendance WHERE lesson_id IN (SELECT id FROM lessons WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5')
UNION ALL SELECT 'payments', count(*) FROM payments WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5'
UNION ALL SELECT 'exams', count(*) FROM exams WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5'
UNION ALL SELECT 'homework', count(*) FROM homework WHERE academy_id = 'f00de531-4af0-4b21-af03-8913972e8ef5';
