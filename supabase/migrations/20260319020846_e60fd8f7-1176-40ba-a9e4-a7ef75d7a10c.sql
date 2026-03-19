
-- Create a function to handle mention notifications from comments
CREATE OR REPLACE FUNCTION public.handle_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _mention text;
  _mentioned_user_id uuid;
  _commenter_name text;
  _task_title text;
  _mentions text[];
BEGIN
  -- Extract all @mentions from comment text using pattern @Name Name
  SELECT array_agg(m[1]) INTO _mentions
  FROM regexp_matches(NEW.text, '@([A-Za-z][A-Za-z ]+?\b)', 'g') AS m;

  IF _mentions IS NULL OR array_length(_mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get commenter name
  SELECT full_name INTO _commenter_name FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Get task title
  SELECT title INTO _task_title FROM public.tasks WHERE id = NEW.task_id;

  FOREACH _mention IN ARRAY _mentions LOOP
    -- Find user by full_name match
    SELECT user_id INTO _mentioned_user_id
    FROM public.profiles
    WHERE lower(full_name) = lower(trim(_mention));

    -- Don't notify yourself
    IF _mentioned_user_id IS NOT NULL AND _mentioned_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, message, task_id)
      VALUES (
        _mentioned_user_id,
        'mention',
        _commenter_name || ' mentioned you in "' || _task_title || '"',
        NEW.task_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on task_comments
CREATE TRIGGER on_comment_mention
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_mentions();
