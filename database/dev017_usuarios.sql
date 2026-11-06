-- DEV-017. Aplicar após dev016_medicos.sql em ambiente isolado.
begin;

create table piloto_privado.convites (
  unidade_id uuid not null references piloto.unidades(id),
  id uuid not null default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254),
  perfil text not null check (perfil in ('recepcao','medico','financeiro','gestao')),
  profissional_id uuid,
  codigo_hash bytea not null unique check (octet_length(codigo_hash) = 32),
  estado text not null default 'pendente' check (estado in ('pendente','aceito','cancelado')),
  criado_em timestamptz not null default clock_timestamp(),
  expira_em timestamptz not null default (clock_timestamp() + interval '48 hours'),
  aceito_por uuid references auth.users(id),
  primary key (unidade_id, id),
  foreign key (unidade_id, profissional_id) references piloto.profissionais(unidade_id, id),
  check ((perfil = 'medico') = (profissional_id is not null)),
  check ((estado = 'aceito') = (aceito_por is not null))
);

create unique index convites_pendentes_idx
on piloto_privado.convites (unidade_id, email, perfil) where estado = 'pendente';

alter table piloto_privado.convites enable row level security;
revoke all on table piloto_privado.convites from public, anon, authenticated, service_role;
create trigger auditar_mutacao after insert or update or delete on piloto_privado.convites
for each row execute function piloto_privado.registrar_mutacao();

-- As mutações da unidade compartilham o mesmo bloqueio, inclusive o aceite.
create function piloto_privado.travar_gestao_usuarios(unidade uuid)
returns void language plpgsql volatile security invoker set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('piloto-usuarios-' || unidade::text, 0));
  if not piloto_privado.tem_perfil(unidade, array['administrador']) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
end
$$;

create function piloto_privado.listar_usuarios(unidade uuid, correlacao uuid)
returns jsonb language sql volatile security definer set search_path = ''
as $$
  with escopo as materialized (
    select piloto_privado.tem_perfil(unidade, array['administrador']) as permitido
  ), trilha as (
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    select case when e.permitido then unidade end, 'vinculos', 'SELECT', ator.id,
      case when e.permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid())
    from escopo e cross join piloto_privado.ator_auditoria() ator(id)
    where ator.id is not null
  )
  select case when e.permitido then jsonb_build_object(
    'vinculos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'usuario_id', v.usuario_id, 'email', u.email,
        'perfil', v.perfil, 'ativo', v.ativo) order by u.email, v.perfil)
      from piloto_privado.vinculos v join auth.users u on u.id = v.usuario_id
      where v.unidade_id = unidade
    ), '[]'::jsonb),
    'convites', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'email', c.email, 'perfil', c.perfil,
        'expirado', c.expira_em <= statement_timestamp()) order by c.criado_em desc)
      from piloto_privado.convites c where c.unidade_id = unidade and c.estado = 'pendente'
    ), '[]'::jsonb),
    'medicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'crm', p.crm, 'uf', p.crm_uf)
        order by p.nome, p.id)
      from piloto.profissionais p
      where p.unidade_id = unidade and p.ativo and p.crm is not null
    ), '[]'::jsonb)
  ) end from escopo e
$$;

create function piloto_privado.emitir_convite(
  unidade uuid, email_convidado text, perfil_convidado text, profissional uuid, correlacao uuid
)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  destinatario text := lower(btrim(email_convidado));
  codigo text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  perform piloto_privado.travar_gestao_usuarios(unidade);
  if destinatario is null or char_length(destinatario) > 254
    or destinatario !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or perfil_convidado is null or perfil_convidado not in ('recepcao','medico','financeiro','gestao')
    or (perfil_convidado = 'medico') <> (profissional is not null) then
    raise exception 'Convite inválido' using errcode = '22023';
  end if;
  if profissional is not null and not exists (
    select 1 from piloto.profissionais p left join auth.users u on u.id = p.usuario_id
    where p.unidade_id = unidade and p.id = profissional and p.ativo and p.crm is not null
      and (p.usuario_id is null or lower(u.email) = destinatario)
  ) then
    raise exception 'Profissional indisponível' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  update piloto_privado.convites c set estado = 'cancelado'
  where c.unidade_id = unidade and c.email = destinatario and c.perfil = perfil_convidado and c.estado = 'pendente';
  insert into piloto_privado.convites (unidade_id, email, perfil, profissional_id, codigo_hash)
  values (unidade, destinatario, perfil_convidado, profissional, sha256(convert_to(codigo, 'UTF8')));
  return codigo;
end
$$;

create function piloto_privado.aceitar_convite(codigo text, correlacao uuid)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  ator uuid := piloto_privado.ator_auditoria();
  destinatario text;
  unidade uuid;
  convite piloto_privado.convites%rowtype;
  vinculado uuid;
begin
  if ator is null or (select auth.jwt()) ->> 'aal' is distinct from 'aal2'
    or codigo is null or codigo !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select lower(u.email) into destinatario from auth.users u
  where u.id = ator and u.email_confirmed_at is not null for share;
  if destinatario is null then return null; end if;

  select c.unidade_id into unidade from piloto_privado.convites c
  where c.codigo_hash = sha256(convert_to(codigo, 'UTF8')) and c.email = destinatario;
  if not found then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('piloto-usuarios-' || unidade::text, 0));
  select c.* into convite
  from piloto_privado.convites c join piloto.unidades u on u.id = c.unidade_id and u.ativa
  where c.unidade_id = unidade and c.codigo_hash = sha256(convert_to(codigo, 'UTF8'))
    and c.estado = 'pendente' and c.expira_em > clock_timestamp() and c.email = destinatario
  for update of c for share of u;
  if not found then return null; end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);

  if convite.perfil = 'medico' then
    if exists (select 1 from piloto.profissionais p
      where p.unidade_id = unidade and p.usuario_id = ator and p.id <> convite.profissional_id) then
      return null;
    end if;
    update piloto.profissionais p set usuario_id = ator, revisao = p.revisao + 1
    where p.unidade_id = unidade and p.id = convite.profissional_id and p.ativo and p.crm is not null
      and (p.usuario_id is null or p.usuario_id = ator)
    returning p.id into vinculado;
    if vinculado is null then return null; end if;
  end if;

  insert into piloto_privado.vinculos (unidade_id, usuario_id, perfil)
  values (unidade, ator, convite.perfil)
  on conflict (unidade_id, usuario_id, perfil) do update set ativo = true;
  update piloto_privado.convites set estado = 'aceito', aceito_por = ator
  where unidade_id = unidade and id = convite.id;
  return unidade;
end
$$;

create function piloto_privado.gerir_usuarios(
  unidade uuid, operacao text, alvo uuid, habilitar boolean, correlacao uuid
)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare
  usuario uuid;
begin
  perform piloto_privado.travar_gestao_usuarios(unidade);
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  if operacao = 'cancelar' then
    update piloto_privado.convites c set estado = 'cancelado'
    where c.unidade_id = unidade and c.id = alvo and c.estado = 'pendente';
    return found;
  end if;
  if operacao = 'perfil' and habilitar is not null then
    update piloto_privado.vinculos v set ativo = habilitar
    where v.unidade_id = unidade and v.id = alvo and v.perfil <> 'administrador'
      and (not habilitar or v.perfil <> 'medico' or exists (
        select 1 from piloto.profissionais p where p.unidade_id = unidade
          and p.usuario_id = v.usuario_id and p.ativo and p.crm is not null
      ));
    return found;
  end if;
  if operacao = 'bloquear' then
    select v.usuario_id into usuario from piloto_privado.vinculos v
    where v.unidade_id = unidade and v.id = alvo
      and not exists (select 1 from piloto_privado.vinculos a where a.unidade_id = unidade
        and a.usuario_id = v.usuario_id and a.perfil = 'administrador' and a.ativo);
    if not found then return false; end if;
    update piloto_privado.vinculos v set ativo = false
    where v.unidade_id = unidade and v.usuario_id = usuario and v.ativo;
    update piloto_privado.convites c set estado = 'cancelado'
    where c.unidade_id = unidade and c.estado = 'pendente'
      and c.email = (select lower(u.email) from auth.users u where u.id = usuario);
    return true;
  end if;
  return false;
end
$$;

create function public.piloto_listar_usuarios(unidade uuid, correlacao uuid)
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.listar_usuarios(unidade, correlacao) $$;

create function public.piloto_emitir_convite(unidade uuid, email_convidado text, perfil_convidado text, profissional uuid, correlacao uuid)
returns text language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.emitir_convite(unidade, email_convidado, perfil_convidado, profissional, correlacao) $$;

create function public.piloto_aceitar_convite(codigo text, correlacao uuid)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.aceitar_convite(codigo, correlacao) $$;

create function public.piloto_gerir_usuarios(unidade uuid, operacao text, alvo uuid, habilitar boolean, correlacao uuid)
returns boolean language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.gerir_usuarios(unidade, operacao, alvo, habilitar, correlacao) $$;

revoke all on function piloto_privado.travar_gestao_usuarios(uuid),
  piloto_privado.listar_usuarios(uuid, uuid), public.piloto_listar_usuarios(uuid, uuid),
  piloto_privado.emitir_convite(uuid, text, text, uuid, uuid), public.piloto_emitir_convite(uuid, text, text, uuid, uuid),
  piloto_privado.aceitar_convite(text, uuid), public.piloto_aceitar_convite(text, uuid),
  piloto_privado.gerir_usuarios(uuid, text, uuid, boolean, uuid), public.piloto_gerir_usuarios(uuid, text, uuid, boolean, uuid)
  from public, anon, authenticated, service_role;
grant execute on function
  piloto_privado.listar_usuarios(uuid, uuid), public.piloto_listar_usuarios(uuid, uuid),
  piloto_privado.emitir_convite(uuid, text, text, uuid, uuid), public.piloto_emitir_convite(uuid, text, text, uuid, uuid),
  piloto_privado.aceitar_convite(text, uuid), public.piloto_aceitar_convite(text, uuid),
  piloto_privado.gerir_usuarios(uuid, text, uuid, boolean, uuid), public.piloto_gerir_usuarios(uuid, text, uuid, boolean, uuid)
  to authenticated;

commit;
