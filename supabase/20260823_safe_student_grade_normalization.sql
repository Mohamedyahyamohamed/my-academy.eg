-- Safe grade-only cleanup for the existing student roster.
-- No column other than public.students.grade is referenced in the UPDATE.
-- Unknown values (including "الصف الثاني البكالوريا") are intentionally preserved.

begin;

update public.students
set grade = case
  when grade in ('الصف الأول الاعدادي', 'الصف الاول الاعدادي')
    then 'الصف الأول الإعدادي'
  when grade in ('الصف الثالث الاعدادي', 'تالته اعدادي')
    then 'الصف الثالث الإعدادي'
  when grade in ('الصف الاول الثانوى', 'الصف الاول الثانوي', 'الصف الاول الثانوي أزهري', 'اولى ثانوي', 'ثانوي')
    then 'الصف الأول الثانوي'
  when grade = 'الصف الثاني الاعدادي'
    then 'الصف الثاني الإعدادي'
  when grade = 'الصف الثاني الثانوي'
    then 'الصف الثاني الثانوي'
  else grade
end
where grade in (
  'الصف الأول الاعدادي',
  'الصف الاول الاعدادي',
  'الصف الثالث الاعدادي',
  'تالته اعدادي',
  'الصف الاول الثانوى',
  'الصف الاول الثانوي',
  'الصف الاول الثانوي أزهري',
  'اولى ثانوي',
  'ثانوي',
  'الصف الثاني الاعدادي',
  'الصف الثاني الثانوي'
);

commit;
