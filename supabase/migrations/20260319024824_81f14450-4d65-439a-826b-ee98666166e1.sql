
CREATE OR REPLACE FUNCTION public.handle_comment_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _profile RECORD;
  _commenter_name text;
  _task_title text;
BEGIN
  SELECT full_name INTO _commenter_name FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT title INTO _task_title FROM public.tasks WHERE id = NEW.task_id;

  FOR _profile IN SELECT user_id, full_name FROM public.profiles LOOP
    IF _profile.user_id = NEW.user_id THEN
      CONTINUE;
    END IF;

    IF NEW.text ILIKE '%@' || _profile.full_name || '%' THEN
      -- Auto-add mentioned user as task collaborator so they can see the task
      INSERT INTO public.task_collaborators (task_id, user_id)
      VALUES (NEW.task_id, _profile.user_id)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.notifications (user_id, type, message, task_id)
      VALUES (
        _profile.user_id,
        'mention',
        _commenter_name || ' mentioned you in "' || _task_title || '"',
        NEW.task_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_comment_mention ON public.task_comments;
CREATE TRIGGER on_comment_mention
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_mentions();
