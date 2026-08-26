-- Exam paper attachments: teacher uploads the exam sheet (image/PDF)
-- so students can review it from their portal.
alter table public.files
  add column if not exists exam_id uuid references public.exams(id) on delete cascade;

create index if not exists files_exam_id_idx on public.files (exam_id) where exam_id is not null;
