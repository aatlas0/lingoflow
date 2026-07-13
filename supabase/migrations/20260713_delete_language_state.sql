-- The My Languages hub offers per-language deletion; without this policy
-- RLS makes client deletes silently affect zero rows.
create policy "Users can delete own language state"
  on public.language_state for delete
  to authenticated
  using ((select auth.uid()) = user_id);
