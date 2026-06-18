
REVOKE EXECUTE ON FUNCTION public.bump_howl_counter(uuid, text, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_howl_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_howl_rehowls_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_howl_echoes_count() FROM PUBLIC, anon, authenticated;
