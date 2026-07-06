-- 多邮箱迁移：让一个用户可以配置多个发信邮箱，发送时选择用哪个。
-- 安全说明：只加列、调整约束，不删除/修改任何现有数据和密码。可重复运行。
-- 执行：Supabase 控制台 → SQL Editor → 粘贴运行。

-- 1) 主键 id（现有行自动补 uuid）
alter table public.smtp_configs add column if not exists id uuid default gen_random_uuid();
update public.smtp_configs set id = gen_random_uuid() where id is null;
alter table public.smtp_configs alter column id set not null;

-- 2) 邮箱备注名（如「主邮箱」「开发信小号」）
alter table public.smtp_configs add column if not exists label text;
update public.smtp_configs set label = '默认邮箱' where label is null or label = '';

-- 3) 去掉 user_id 上的主键/唯一约束，允许一人多条；把主键换到 id
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.smtp_configs'::regclass
      and contype in ('p', 'u')
  loop
    execute format('alter table public.smtp_configs drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.smtp_configs add primary key (id);

-- 4) 按用户查询的索引
create index if not exists smtp_configs_user_idx on public.smtp_configs (user_id);

-- 5) 发送记录关联到具体发信邮箱（用于「每个邮箱每天限额」统计）
alter table public.email_sends add column if not exists smtp_config_id uuid;
create index if not exists email_sends_config_day_idx
  on public.email_sends (smtp_config_id, sent_at);
