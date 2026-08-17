-- Audit 7: avoid per-row evaluation of auth.uid() in RLS policies.
-- Authorization semantics are unchanged; only stable session lookups are initialized once per statement.

ALTER POLICY membership_self_or_admin_read ON public.academy_memberships
  USING ((profile_id = (SELECT auth.uid())) OR private.auth_has_academy_role(academy_id, ARRAY['ADMIN'::public.user_role]));

ALTER POLICY content_files_manager_write ON public.content_files
  WITH CHECK ((owner_id = (SELECT auth.uid())) AND (EXISTS (
    SELECT 1 FROM public.content_courses c
    WHERE c.id = content_files.course_id
      AND c.academy_id = content_files.academy_id
      AND private.auth_can_manage_group(c.group_id)
  )));

ALTER POLICY content_links_manager_write ON public.content_links
  WITH CHECK ((owner_id = (SELECT auth.uid())) AND (EXISTS (
    SELECT 1 FROM public.content_courses c
    WHERE c.id = content_links.course_id
      AND c.academy_id = content_links.academy_id
      AND private.auth_can_manage_group(c.group_id)
  )));

ALTER POLICY file_owner_or_admin_delete ON public.files
  USING (private.auth_has_academy_role(academy_id, ARRAY['ADMIN'::public.user_role]) OR ((owner_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id)));

ALTER POLICY file_owner_or_admin_insert ON public.files
  WITH CHECK (private.auth_has_academy_role(academy_id, ARRAY['ADMIN'::public.user_role]) OR ((owner_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id)));

ALTER POLICY file_owner_or_admin_read ON public.files
  USING (private.auth_has_academy_role(academy_id, ARRAY['ADMIN'::public.user_role]) OR ((owner_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id)));

ALTER POLICY file_owner_or_admin_update ON public.files
  USING (private.auth_has_academy_role(academy_id, ARRAY['ADMIN'::public.user_role]) OR ((owner_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id)))
  WITH CHECK (private.auth_has_academy_role(academy_id, ARRAY['ADMIN'::public.user_role]) OR ((owner_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id)));

ALTER POLICY message_participant_read ON public.messages
  USING (private.auth_is_active_member(academy_id) AND ((sender_id = (SELECT auth.uid())) OR (recipient_id = (SELECT auth.uid()))));

ALTER POLICY message_sender_insert ON public.messages
  WITH CHECK (((sender_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id) AND (EXISTS (
    SELECT 1 FROM public.academy_memberships m
    WHERE m.academy_id = messages.academy_id
      AND m.profile_id = messages.recipient_id
      AND m.status = 'ACTIVE'::text
  )) AND ((student_id IS NULL) OR private.auth_can_read_student(student_id))));

ALTER POLICY note_admin_or_group_teacher_write ON public.notes
  WITH CHECK (private.auth_can_manage_student(student_id) AND private.auth_is_active_member(academy_id) AND ((author_id IS NULL) OR (author_id = (SELECT auth.uid()))));

ALTER POLICY notification_own_read ON public.notifications
  USING ((user_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id));

ALTER POLICY notification_own_update ON public.notifications
  USING ((user_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id))
  WITH CHECK ((user_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id));

ALTER POLICY push_subscription_own_delete ON public.push_subscriptions
  USING ((user_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id));

ALTER POLICY push_subscription_own_insert ON public.push_subscriptions
  WITH CHECK ((user_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id));

ALTER POLICY push_subscription_own_read ON public.push_subscriptions
  USING ((user_id = (SELECT auth.uid())) AND private.auth_is_active_member(academy_id));

ALTER POLICY support_tickets_insert_self ON public.support_tickets
  WITH CHECK ((academy_id = (SELECT private.auth_academy_id())) AND (requester_profile_id = (SELECT auth.uid())) AND (status = 'OPEN'::text) AND (priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text])));
