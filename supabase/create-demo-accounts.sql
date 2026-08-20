-- =====================================================================
--  إنشاء حسابات تجريبية لكل دور (مدرّس / ولي أمر / طالب) مباشرةً من DB
--  يشغّل في: Supabase ← SQL Editor ← الصق ← Run
--  آمن: لو الحساب موجود بيتخطّاه. الطالب مربوط بولي الأمر.
-- =====================================================================

DO $$
DECLARE
  v_academy uuid := 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
  v_t uuid;   -- معرّف المدرّس (auth)
  v_p uuid;   -- معرّف ولي الأمر (auth)
  v_s uuid;   -- معرّف الطالب (auth)
  v_parent_rec uuid;  -- معرّف سجل ولي الأمر (parents.id)
BEGIN
  -----------------------------------------------------------------
  -- دالة مساعدة محلية: إنشاء مستخدم auth (إذا لم يكن موجودًا)
  -----------------------------------------------------------------

  ----------------------------- ١) المدرّس -----------------------------
  SELECT id INTO v_t FROM auth.users WHERE email = 'teacher@myacademy.edu';
  IF v_t IS NULL THEN
    v_t := gen_random_uuid();
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, created_at, updated_at,
       raw_app_meta_data, raw_user_meta_data,
       confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES
      ('00000000-0000-0000-0000-000000000000', v_t, 'authenticated', 'authenticated',
       'teacher@myacademy.edu', crypt('teacher1234', gen_salt('bf')),
       now(), now(), now(),
       '{}'::jsonb, jsonb_build_object('full_name','أحمد المدرّس','role','TEACHER'),
       '','','','');
  END IF;

  INSERT INTO profiles (id, academy_id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at)
  VALUES (v_t, v_academy, 'teacher@myacademy.edu', 'TEACHER', 'أحمد المدرّس', '01000000001', NULL, true, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    academy_id = EXCLUDED.academy_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = now();

  INSERT INTO teachers (id, academy_id, profile_id, first_name, last_name, email, phone, bio, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), v_academy, v_t, 'أحمد','المدرّس','teacher@myacademy.edu','01000000001', NULL, true, now(), now())
  ON CONFLICT (academy_id, email) DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = now();

  ----------------------------- ٢) ولي الأمر -----------------------------
  SELECT id INTO v_p FROM auth.users WHERE email = 'parent@myacademy.edu';
  IF v_p IS NULL THEN
    v_p := gen_random_uuid();
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, created_at, updated_at,
       raw_app_meta_data, raw_user_meta_data,
       confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES
      ('00000000-0000-0000-0000-000000000000', v_p, 'authenticated', 'authenticated',
       'parent@myacademy.edu', crypt('parent1234', gen_salt('bf')),
       now(), now(), now(),
       '{}'::jsonb, jsonb_build_object('full_name','محمد ولي الأمر','role','PARENT'),
       '','','','');
  END IF;

  INSERT INTO profiles (id, academy_id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at)
  VALUES (v_p, v_academy, 'parent@myacademy.edu', 'PARENT', 'محمد ولي الأمر', '01000000002', NULL, true, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    academy_id = EXCLUDED.academy_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = now();

  -- سجل ولي الأمر (parents) — نجلب معرّفه سواء كان جديدًا أو موجودًا
  INSERT INTO parents (id, academy_id, profile_id, first_name, last_name, email, phone, occupation, created_at, updated_at)
  VALUES (gen_random_uuid(), v_academy, v_p, 'محمد','ولي الأمر','parent@myacademy.edu','01000000002', NULL, now(), now())
  ON CONFLICT (academy_id, email) DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    updated_at = now();

  SELECT id INTO v_parent_rec FROM parents WHERE academy_id = v_academy AND email = 'parent@myacademy.edu';

  ----------------------------- ٣) الطالب -----------------------------
  SELECT id INTO v_s FROM auth.users WHERE email = 'student@myacademy.edu';
  IF v_s IS NULL THEN
    v_s := gen_random_uuid();
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, created_at, updated_at,
       raw_app_meta_data, raw_user_meta_data,
       confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES
      ('00000000-0000-0000-0000-000000000000', v_s, 'authenticated', 'authenticated',
       'student@myacademy.edu', crypt('student1234', gen_salt('bf')),
       now(), now(), now(),
       '{}'::jsonb, jsonb_build_object('full_name','سارة التجريبية','role','STUDENT'),
       '','','','');
  END IF;

  -- GoTrue expects legacy token columns to be strings when loading a user.
  -- Keep this demo-only seed compatible with Auth-created users.
  UPDATE auth.users
  SET confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      updated_at = now()
  WHERE id IN (v_t, v_p, v_s);

  INSERT INTO profiles (id, academy_id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at)
  VALUES (v_s, v_academy, 'student@myacademy.edu', 'STUDENT', 'سارة التجريبية', '01000000003', NULL, true, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    academy_id = EXCLUDED.academy_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = now();

  -- سجل الطالب مربوط بولي الأمر، ويُحدّث عند إعادة تشغيل التهيئة.
  INSERT INTO students
    (id, academy_id, first_name, last_name, email, parent_id, school, grade, gender, status, enrolled_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_academy, 'سارة','التجريبية','student@myacademy.edu',
     v_parent_rec, 'مدرسة النور التجريبية', 'الصف الأول الثانوي', 'female',
     'ACTIVE', now(), now(), now())
  ON CONFLICT (academy_id, email) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    school = EXCLUDED.school,
    grade = EXCLUDED.grade,
    gender = EXCLUDED.gender,
    status = 'ACTIVE',
    updated_at = now();
END $$;

-- تأكيد
SELECT 'تم إنشاء الحسابات التجريبية بنجاح ✅' AS result;
