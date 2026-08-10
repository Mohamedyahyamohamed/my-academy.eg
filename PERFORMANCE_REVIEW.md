# N+1 Query & Performance Review

## Methodology
Reviewed all dashboards, profiles, reports, and list pages for N+1 patterns.

## Findings

### ✅ No Critical N+1 Issues
- **Dashboard**: reads from in-memory cache (single hydrate), not per-item queries.
- **Student profile**: `computeStudentStats()` iterates in-memory arrays, not per-student DB calls.
- **Groups list**: single `fetchTableRLS()` + in-memory `attach()`.
- **Payments list**: single `fetchTableRLS()` + in-memory filtering.

### ⚠️ Minor Patterns to Watch
1. **Student list** calls `attachRelations()` per student (fetches parent + groups from cache).
   - Impact: O(n) cache lookups, acceptable for <1000 students.
   - Fix for scale: batch-fetch parents/groups in one pass.

2. **Dashboard** iterates all attendance/grades for aggregations.
   - Impact: O(n) per request, fine for single academy.
   - Fix for scale: pre-computed materialized views.

3. **Reports page** fetches all students + payments + grades.
   - Impact: heavy for large academies.
   - Fix: server-side pagination (already implemented for student/payment lists).

## ✅ Pagination Implemented
- Students: server-side (page/pageSize) ✅
- Payments: server-side ✅
- Lessons: server-side ✅
- Homework: server-side ✅
- Grades: server-side ✅
- Audit logs: server-side ✅

## ✅ Indexes (in schema.sql)
- `students(academy_id)`, `students(parent_id)`, `students(status)`
- `groups(academy_id)`, `groups(course_id)`, `groups(teacher_id)`
- `lessons(group_id)`, `lessons(date)`
- `attendance(lesson_id)`, `attendance(student_id)`
- `payments(student_id)`, `payments(status)`, `payments(month)`
- `audit_logs(academy_id)`, `audit_logs(action)`, `audit_logs(created_at desc)`

## Recommendations for Scale (>500 students)
1. Add materialized views for dashboard aggregations.
2. Implement cursor-based pagination (keyset) instead of offset.
3. Add database connection pooling (Supabase PgBouncer).
4. Consider Redis for session/cache if multi-instance.
