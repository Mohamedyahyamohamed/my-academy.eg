-- Exam paper attachments: link a files row to its exam.
-- The grades UI uploads exam sheets (image/PDF) into storage bucket 'files'
-- and registers them with exam_id so they can be listed per exam,
-- shown to students in their portal, and cascade-deleted with the exam.

alter table public.files
  add column if not exists exam_id uuid references public.exams (id) on delete cascade;

create index if not exists files_exam_id_idx on public.files (exam_id);
