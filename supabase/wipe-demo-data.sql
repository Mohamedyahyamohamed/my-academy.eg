-- ============================================================
-- WIPE: مسح بيانات التجربة للأكاديمية A (تفضل الأكاديمية + حساب الأدمن)
-- شغّل ده في: Supabase → SQL Editor → Run (مرة واحدة).
-- الأكاديمية: ef0676e2-01ec-4c62-9fb9-f9c299c94393 (admin@myacademy.edu)
-- ============================================================

-- الترتيب مهم (بسبب on delete restrict على teachers/courses)

DELETE FROM lessons       WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM exams         WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM homework      WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM groups        WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM payments      WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM students      WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM teachers      WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM courses       WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM parents       WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM notifications WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM notes         WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';
DELETE FROM files         WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393';

-- امسح حسابات التجربة (المدرّس/ولي/طالب) بس سيّب الأدمن
DELETE FROM profiles      WHERE academy_id = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393' AND role <> 'ADMIN';

-- الجداول الفرعية بتتمسح أوتوماتيك (cascade) مع اللي فوق:
-- attendance, grades, homework_submissions, group_students, group_assistants, payment_transactions

SELECT 'تم مسح بيانات التجربة ✅' as status;
