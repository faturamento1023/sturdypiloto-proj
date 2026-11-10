-- Cadastro mínimo e busca de pacientes. Aplicar após DEV-023 em banco isolado.
begin;

alter table piloto.pacientes add column nome_social text;

create function piloto_privado.normalizar_nome_paciente(valor text)
returns text language sql immutable security invoker set search_path = ''
as $$
  select translate(lower(normalize(coalesce(valor, ''))),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')
$$;

create index pacientes_unidade_nome_idx on piloto.pacientes
  (unidade_id, piloto_privado.normalizar_nome_paciente(nome), id);

create function piloto_privado.auditar_busca_pacientes(unidade uuid, correlacao uuid)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare
  ator uuid := piloto_privado.ator_auditoria();
  permitido boolean := piloto_privado.tem_perfil(unidade, array['recepcao','medico']);
begin
  if ator is not null then
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    values (case when permitido then unidade end, 'pacientes', 'SELECT', ator,
      case when permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid()));
  end if;
  return permitido;
end;
$$;

-- O SELECT permanece sob a RLS: o perfil médico só lê seus pacientes vinculados.
create function public.piloto_buscar_pacientes(unidade uuid, busca text, pagina integer, correlacao uuid)
returns jsonb language plpgsql volatile security invoker set search_path = ''
as $$
declare
  termo text := btrim(coalesce(busca, ''));
begin
  if not piloto_privado.auditar_busca_pacientes(unidade, correlacao) then return null; end if;
  if char_length(termo) not between 2 and 80 or pagina is null or pagina not between 0 and 9999 then
    raise exception 'Busca de pacientes inválida' using errcode = '22023';
  end if;
  termo := piloto_privado.normalizar_nome_paciente(termo);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'nome_social', p.nome_social,
      'nascimento', p.nascimento) order by p.nome_ordenacao, p.id)
    from (
      select p.id, p.nome, p.nome_social, p.nascimento, piloto_privado.normalizar_nome_paciente(p.nome) as nome_ordenacao
      from piloto.pacientes p
      where p.unidade_id = unidade and (
        strpos(piloto_privado.normalizar_nome_paciente(p.nome), termo) > 0
        or strpos(piloto_privado.normalizar_nome_paciente(p.nome_social), termo) > 0
      )
      order by nome_ordenacao, p.id limit 21 offset (pagina * 20)
    ) p
  ), '[]'::jsonb);
end;
$$;

create function piloto_privado.cadastrar_paciente(unidade uuid, chave uuid, nome_paciente text,
  nome_social_paciente text, data_nascimento date, correlacao uuid)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  nome_validado text := btrim(coalesce(nome_paciente, ''));
  social_validado text := nullif(btrim(nome_social_paciente), '');
  salvo piloto.pacientes%rowtype;
begin
  if not piloto_privado.tem_perfil(unidade, array['recepcao']) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if chave is null or char_length(nome_validado) not between 2 and 160
    or char_length(social_validado) > 160
    or (data_nascimento is not null and (not isfinite(data_nascimento)
      or data_nascimento < date '1900-01-01'
      or data_nascimento > (now() at time zone 'America/Sao_Paulo')::date)) then
    raise exception 'Cadastro de paciente inválido' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  insert into piloto.pacientes (unidade_id, id, nome, nome_social, nascimento)
  values (unidade, chave, nome_validado, social_validado, data_nascimento)
  on conflict (unidade_id, id) do nothing
  returning * into salvo;
  if not found then
    select p.* into salvo from piloto.pacientes p where p.unidade_id = unidade and p.id = chave;
    if not found or (salvo.nome, salvo.nome_social, salvo.nascimento) is distinct from
      (nome_validado, social_validado, data_nascimento) then
      raise exception 'Chave já usada com outros dados' using errcode = '23505';
    end if;
  end if;
  return salvo.id;
end;
$$;

create function public.piloto_cadastrar_paciente(unidade uuid, chave uuid, nome_paciente text,
  nome_social_paciente text, data_nascimento date, correlacao uuid)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.cadastrar_paciente(unidade, chave, nome_paciente, nome_social_paciente, data_nascimento, correlacao) $$;

revoke all on function piloto_privado.normalizar_nome_paciente(text), piloto_privado.auditar_busca_pacientes(uuid,uuid),
  public.piloto_buscar_pacientes(uuid,text,integer,uuid), piloto_privado.cadastrar_paciente(uuid,uuid,text,text,date,uuid),
  public.piloto_cadastrar_paciente(uuid,uuid,text,text,date,uuid) from public, anon, authenticated, service_role;
grant execute on function piloto_privado.normalizar_nome_paciente(text), piloto_privado.auditar_busca_pacientes(uuid,uuid),
  public.piloto_buscar_pacientes(uuid,text,integer,uuid), piloto_privado.cadastrar_paciente(uuid,uuid,text,text,date,uuid),
  public.piloto_cadastrar_paciente(uuid,uuid,text,text,date,uuid) to authenticated;

commit;
