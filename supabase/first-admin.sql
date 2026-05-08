-- Supabase Dashboard > Authentication > Users で最初の管理者ユーザーを作成してから実行します。
-- '<AUTH_USER_ID>' は作成したユーザーの UUID に置き換えてください。

insert into public.profiles (id, name, email, role, status)
values (
  '<AUTH_USER_ID>',
  '管理者',
  'admin@example.com',
  'admin',
  'active'
);
