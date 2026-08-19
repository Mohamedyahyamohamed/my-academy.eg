# Hierarchy implementation findings

- `academies` is the tenant root.
- `profiles` has `academy_id`, `role`, `full_name`, `email`, and `is_active`.
- `academy_memberships` links `academy_id` to `profile_id`, with `role` and membership `status`.
- `teachers` links to a profile through `profile_id` and belongs to an academy.
- `groups` belongs to an academy and has a `teacher_id`.
- `group_students` links groups to students.
- `group_assistants` links groups to assistant teacher records through `teacher_id`.
- The current Platform Users tab renders a flat list of profiles and does not expose these relationships.
- Production read showed `MYAcademy Production Audit` has an active ADMIN profile `mohamedyahya13579@gmail.com`; other teacher workspaces had no matching ADMIN profile in the initial profile query, so the implementation must derive hierarchy from memberships and teacher/group relationships rather than assume every academy has an ADMIN profile.
