DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_id_auth_user_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_id_auth_user_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.life_xp_create_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'name', ''), 'LIFE XP member'), NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS life_xp_auth_user_created ON auth.users;
CREATE TRIGGER life_xp_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.life_xp_create_profile();

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS goals_own_access ON public.goals;
CREATE POLICY goals_own_access ON public.goals FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS tasks_own_goal_access ON public.tasks;
CREATE POLICY tasks_own_goal_access ON public.tasks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = tasks.goal_id AND g.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = tasks.goal_id AND g.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS completions_own_access ON public.task_completions;
CREATE POLICY completions_own_access ON public.task_completions FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (
  SELECT 1 FROM public.tasks t JOIN public.goals g ON g.id = t.goal_id
  WHERE t.id = task_completions.task_id AND g.user_id = (SELECT auth.uid())
))
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (
  SELECT 1 FROM public.tasks t JOIN public.goals g ON g.id = t.goal_id
  WHERE t.id = task_completions.task_id AND g.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS rewards_read_authenticated ON public.rewards;
CREATE POLICY rewards_read_authenticated ON public.rewards FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS user_rewards_own_read ON public.user_rewards;
CREATE POLICY user_rewards_own_read ON public.user_rewards FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS user_rewards_own_insert ON public.user_rewards;
CREATE POLICY user_rewards_own_insert ON public.user_rewards FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
