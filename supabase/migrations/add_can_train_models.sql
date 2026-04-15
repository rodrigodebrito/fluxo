-- Permite ao admin liberar o uso e treinamento de LoRA por usuario especifico
alter table public.profiles
  add column if not exists can_train_models boolean not null default false;

-- Admins sempre podem treinar, independente da flag
update public.profiles
  set can_train_models = true
  where role = 'admin';
