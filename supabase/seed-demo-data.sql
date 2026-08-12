-- =====================================================================
--  بيانات تجريبية للأكاديمية (Demo Seed)
--  يشغّل في: Supabase ← SQL Editor ← الصق ← Run
--  آمن: يتعامل مع التكرار (ON CONFLICT / وجود مسبق) فيمكن إعادة تشغيله.
--  الأكاديمية: Yasmin Hassan (admin@myacademy.edu)
-- =====================================================================

DO $$
DECLARE
  v_academy uuid := 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
  v_math uuid; v_physics uuid; v_arabic uuid; v_english uuid; v_chem uuid;
  v_t1 uuid; v_t2 uuid; v_t3 uuid;
  v_g1 uuid; v_g2 uuid; v_g3 uuid;
  v_exam uuid;
  v_cm text := to_char(now(), 'YYYY-MM');
  v_today date := now()::date;
BEGIN
  -----------------------------------------------------------------
  -- 1) المواد (Courses)
  -----------------------------------------------------------------
  SELECT id INTO v_math   FROM courses WHERE academy_id=v_academy AND name='الرياضيات';
  IF v_math IS NULL THEN INSERT INTO courses(academy_id,name,color) VALUES(v_academy,'الرياضيات','#7c5cfc') RETURNING id INTO v_math; END IF;

  SELECT id INTO v_physics FROM courses WHERE academy_id=v_academy AND name='الفيزياء';
  IF v_physics IS NULL THEN INSERT INTO courses(academy_id,name,color) VALUES(v_academy,'الفيزياء','#0ea5e9') RETURNING id INTO v_physics; END IF;

  SELECT id INTO v_arabic FROM courses WHERE academy_id=v_academy AND name='اللغة العربية';
  IF v_arabic IS NULL THEN INSERT INTO courses(academy_id,name,color) VALUES(v_academy,'اللغة العربية','#10b981') RETURNING id INTO v_arabic; END IF;

  SELECT id INTO v_english FROM courses WHERE academy_id=v_academy AND name='اللغة الإنجليزية';
  IF v_english IS NULL THEN INSERT INTO courses(academy_id,name,color) VALUES(v_academy,'اللغة الإنجليزية','#f59e0b') RETURNING id INTO v_english; END IF;

  SELECT id INTO v_chem FROM courses WHERE academy_id=v_academy AND name='الكيمياء';
  IF v_chem IS NULL THEN INSERT INTO courses(academy_id,name,color) VALUES(v_academy,'الكيمياء','#ec4899') RETURNING id INTO v_chem; END IF;

  -----------------------------------------------------------------
  -- 2) المدرّسون (Teachers)
  -----------------------------------------------------------------
  SELECT id INTO v_t1 FROM teachers WHERE academy_id=v_academy AND email='ahmed.samir@myacademy.edu';
  IF v_t1 IS NULL THEN INSERT INTO teachers(academy_id,first_name,last_name,email,phone,bio)
    VALUES(v_academy,'أحمد','سمير','ahmed.samir@myacademy.edu','01001234567','مدرّس رياضيات — خبرة 12 عامًا') RETURNING id INTO v_t1; END IF;

  SELECT id INTO v_t2 FROM teachers WHERE academy_id=v_academy AND email='mona.fawzy@myacademy.edu';
  IF v_t2 IS NULL THEN INSERT INTO teachers(academy_id,first_name,last_name,email,phone,bio)
    VALUES(v_academy,'منى','فوزي','mona.fawzy@myacademy.edu','01002345678','مدرّسة فيزياء وكيمياء') RETURNING id INTO v_t2; END IF;

  SELECT id INTO v_t3 FROM teachers WHERE academy_id=v_academy AND email='khaled.aziz@myacademy.edu';
  IF v_t3 IS NULL THEN INSERT INTO teachers(academy_id,first_name,last_name,email,phone,bio)
    VALUES(v_academy,'خالد','عزيز','khaled.aziz@myacademy.edu','01003456789','مدرّس لغة عربية وإنجليزية') RETURNING id INTO v_t3; END IF;

  -----------------------------------------------------------------
  -- 3) المجموعات (Groups)
  -----------------------------------------------------------------
  SELECT id INTO v_g1 FROM groups WHERE academy_id=v_academy AND name='الرياضيات — الصف الثالث الثانوي';
  IF v_g1 IS NULL THEN INSERT INTO groups(academy_id,name,course_id,teacher_id,monthly_fee,schedule,room)
    VALUES(v_academy,'الرياضيات — الصف الثالث الثانوي',v_math,v_t1,600,'السبت والثلاثاء ٤:٠٠ م','قاعة ١') RETURNING id INTO v_g1; END IF;

  SELECT id INTO v_g2 FROM groups WHERE academy_id=v_academy AND name='الفيزياء — الصف الثاني الثانوي';
  IF v_g2 IS NULL THEN INSERT INTO groups(academy_id,name,course_id,teacher_id,monthly_fee,schedule,room)
    VALUES(v_academy,'الفيزياء — الصف الثاني الثانوي',v_physics,v_t2,550,'الأحد والأربعاء ٦:٠٠ م','قاعة ٢') RETURNING id INTO v_g2; END IF;

  SELECT id INTO v_g3 FROM groups WHERE academy_id=v_academy AND name='اللغة العربية — الصف الأول الثانوي';
  IF v_g3 IS NULL THEN INSERT INTO groups(academy_id,name,course_id,teacher_id,monthly_fee,schedule,room)
    VALUES(v_academy,'اللغة العربية — الصف الأول الثانوي',v_arabic,v_t3,450,'الاثنين والخميس ٥:٠٠ م','قاعة ٣') RETURNING id INTO v_g3; END IF;

  -----------------------------------------------------------------
  -- 4) تسجيل الطلاب في المجموعات (Enrollment)
  --    توزيع الطلاب النشطين على المجموعات الثلاث.
  -----------------------------------------------------------------
  INSERT INTO group_students(group_id, student_id)
  SELECT v_g1, id FROM (
    SELECT id, row_number() OVER (ORDER BY created_at) AS rn
    FROM students WHERE academy_id=v_academy AND status='ACTIVE'
  ) t WHERE rn <= 8
  ON CONFLICT DO NOTHING;

  INSERT INTO group_students(group_id, student_id)
  SELECT v_g2, id FROM (
    SELECT id, row_number() OVER (ORDER BY created_at) AS rn
    FROM students WHERE academy_id=v_academy AND status='ACTIVE'
  ) t WHERE rn BETWEEN 5 AND 14
  ON CONFLICT DO NOTHING;

  INSERT INTO group_students(group_id, student_id)
  SELECT v_g3, id FROM (
    SELECT id, row_number() OVER (ORDER BY created_at) AS rn
    FROM students WHERE academy_id=v_academy AND status='ACTIVE'
  ) t WHERE rn > 8
  ON CONFLICT DO NOTHING;

  -----------------------------------------------------------------
  -- 5) الحصص (Lessons) — ماضية وقادمة لكل مجموعة
  -----------------------------------------------------------------
  INSERT INTO lessons(academy_id,group_id,teacher_id,date,start_time,end_time,topic)
  VALUES
    (v_academy,v_g1,v_t1,v_today-14,'16:00','17:30','التفاضل — القاعدة السلسلية'),
    (v_academy,v_g1,v_t1,v_today-7 ,'16:00','17:30','التكامل — الأساسيات'),
    (v_academy,v_g1,v_t1,v_today+3 ,'16:00','17:30','التكامل بالتعويض'),
    (v_academy,v_g1,v_t1,v_today+10,'16:00','17:30','مراجعة عامة'),
    (v_academy,v_g2,v_t2,v_today-12,'18:00','19:30','الحركة في بُعد واحد'),
    (v_academy,v_g2,v_t2,v_today-5 ,'18:00','19:30','قوانين نيوتن'),
    (v_academy,v_g2,v_t2,v_today+2 ,'18:00','19:30','الاحتكاك'),
    (v_academy,v_g3,v_t3,v_today-10,'17:00','18:30','البلاغة — التشبيه'),
    (v_academy,v_g3,v_t3,v_today-3 ,'17:00','18:30','الاستعارة والكناية'),
    (v_academy,v_g3,v_t3,v_today+4 ,'17:00','18:30','الأسلوب الخبري والإنشائي')
  ON CONFLICT DO NOTHING;

  -----------------------------------------------------------------
  -- 6) الحضور (Attendance) — للحصص الماضية فقط
  -----------------------------------------------------------------
  INSERT INTO attendance(lesson_id, student_id, status)
  SELECT l.id, gs.student_id,
    CASE WHEN random() < 0.82 THEN 'PRESENT' WHEN random() < 0.5 THEN 'LATE' ELSE 'ABSENT' END
  FROM lessons l
  JOIN group_students gs ON gs.group_id = l.group_id
  WHERE l.date < v_today AND l.academy_id = v_academy
  ON CONFLICT DO NOTHING;

  -----------------------------------------------------------------
  -- 7) المدفوعات (Payments) — الشهر الحالي لكل طالب في مجموعته
  --    مزيج: مدفوع بالكامل / جزئي / متأخر
  -----------------------------------------------------------------
  INSERT INTO payments(academy_id, student_id, group_id, month, amount_due, amount_paid, due_date, payment_date, method, status)
  SELECT v_academy, seed.student_id, seed.group_id, v_cm, seed.monthly_fee,
    CASE WHEN seed.r < 0.6 THEN seed.monthly_fee WHEN seed.r < 0.82 THEN (seed.monthly_fee * 0.5) ELSE 0 END,
    date_trunc('month', now())::date + 4,
    CASE WHEN seed.r < 0.82 THEN v_today ELSE NULL END,
    'كاش',
    CASE WHEN seed.r < 0.6 THEN 'PAID' WHEN seed.r < 0.82 THEN 'PARTIAL' ELSE 'UNPAID' END
  FROM (
    SELECT gs.student_id, gs.group_id, g.monthly_fee, random() AS r
    FROM group_students gs
    JOIN groups g ON g.id = gs.group_id
    WHERE g.academy_id = v_academy
  ) seed
  ON CONFLICT (student_id, group_id, month) DO NOTHING;

  -----------------------------------------------------------------
  -- 8) امتحان + درجات (Exam & Grades) لمجموعة الرياضيات
  -----------------------------------------------------------------
  SELECT id INTO v_exam FROM exams WHERE academy_id=v_academy AND group_id=v_g1 AND name='امتحان منتصف الفصل';
  IF v_exam IS NULL THEN
    INSERT INTO exams(academy_id,name,course_id,group_id,date,max_score)
    VALUES(v_academy,'امتحان منتصف الفصل',v_math,v_g1,v_today-7,100)
    RETURNING id INTO v_exam;
  END IF;

  INSERT INTO grades(exam_id, student_id, score)
  SELECT v_exam, gs.student_id, floor(55 + random()*45)  -- بين 55 و 100
  FROM group_students gs WHERE gs.group_id = v_g1
  ON CONFLICT DO NOTHING;

END $$;

-- رسالة تأكيد
SELECT 'تم إنشاء البيانات التجريبية بنجاح ✅' AS result;
