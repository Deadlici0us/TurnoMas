-- Normaliza los WhatsApp de clientes en bases creadas antes del formato
-- canónico. Ejecutar una sola vez en Supabase > SQL Editor.
--
-- Unifica los formatos argentinos habituales (+54 9 11 15 ..., +54 11 ...,
-- 11 ..., con 0/15/9) al E.164 móvil que usa el CRM: +549...
-- También recorta y pasa a minúsculas los emails, y deja en null los que
-- tengan caracteres inválidos.
--
-- Si hay dos clientes que quedan con el mismo número, el script aborta con
-- un mensaje claro para que se fusionen a mano antes de continuar.
--
-- Si aborta, esta consulta muestra los duplicados:
-- select negocio_id, public.normalizar_whatsapp_cliente(whatsapp) as normalizado,
--        array_agg(id order by created_at) as clientes
-- from public.clientes
-- where public.normalizar_whatsapp_cliente(whatsapp) is not null
-- group by negocio_id, normalizado
-- having count(*) > 1;

begin;

create or replace function public.normalizar_whatsapp_cliente(p_texto text)
returns text
language plpgsql
immutable
as $$
declare
  texto text;
  digitos text;
  sin_prefijo text;
  candidato text;
  explicito boolean;
  es_argentina boolean;
  largo_area int;
begin
  if p_texto is null then
    return null;
  end if;

  texto := btrim(p_texto);

  if texto = '' or texto !~ '^[+\d\s().-]+$' then
    return null;
  end if;

  if position('+' in texto) > 0 then
    if left(texto, 1) <> '+'
      or length(texto) - length(replace(texto, '+', '')) <> 1 then
      return null;
    end if;
  end if;

  digitos := regexp_replace(texto, '\D', '', 'g');

  if length(digitos) < 8 or length(digitos) > 15 then
    return null;
  end if;

  explicito := left(texto, 1) = '+' or left(digitos, 2) = '00';
  sin_prefijo := case
    when left(digitos, 2) = '00' then substr(digitos, 3)
    else digitos
  end;
  es_argentina := left(sin_prefijo, 2) = '54' or not explicito;

  if left(sin_prefijo, 2) = '54' then
    sin_prefijo := substr(sin_prefijo, 3);
  end if;

  if not explicito then
    if left(sin_prefijo, 1) = '0' then
      sin_prefijo := substr(sin_prefijo, 2);
    end if;
  elsif not es_argentina then
    if left(sin_prefijo, 1) = '0' then
      return null;
    end if;

    return '+' || sin_prefijo;
  end if;

  sin_prefijo := regexp_replace(sin_prefijo, '^0+', '');

  if left(sin_prefijo, 1) = '9' then
    sin_prefijo := substr(sin_prefijo, 2);
  end if;

  if left(sin_prefijo, 2) = '15' then
    return null;
  end if;

  if length(sin_prefijo) = 12 then
    for largo_area in 2..4 loop
      if substr(sin_prefijo, largo_area + 1, 2) = '15' then
        candidato := substr(sin_prefijo, 1, largo_area) || substr(sin_prefijo, largo_area + 3);

        if length(candidato) in (9, 10) then
          sin_prefijo := candidato;
          exit;
        end if;
      end if;
    end loop;
  end if;

  if length(sin_prefijo) between 9 and 10 then
    return '+549' || sin_prefijo;
  end if;

  return null;
end;
$$;

do $$
begin
  if exists (
    select 1
    from (
      select negocio_id, public.normalizar_whatsapp_cliente(whatsapp) as normalizado
      from public.clientes
      where public.normalizar_whatsapp_cliente(whatsapp) is not null
      group by negocio_id, normalizado
      having count(*) > 1
    ) duplicados
  ) then
    raise exception 'Hay clientes con el mismo WhatsApp normalizado. Fusioná o corregí esos duplicados antes de ejecutar este script.';
  end if;
end;
$$;

update public.clientes
set whatsapp = public.normalizar_whatsapp_cliente(whatsapp)
where public.normalizar_whatsapp_cliente(whatsapp) is not null
  and whatsapp is distinct from public.normalizar_whatsapp_cliente(whatsapp);

update public.clientes
set email = lower(btrim(email))
where email is not null
  and btrim(email) <> ''
  and email is distinct from lower(btrim(email));

update public.clientes
set email = null
where email is not null
  and (
    char_length(email) > 254
    or email !~ '^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$'
  );

alter table public.clientes drop constraint if exists clientes_whatsapp_canonico;
alter table public.clientes add constraint clientes_whatsapp_canonico
  check (whatsapp ~ '^\+[1-9][0-9]{6,14}$') not valid;

-- Diagnóstico: filas que todavía no cumplen el formato canónico.
-- select id, negocio_id, whatsapp
-- from public.clientes
-- where whatsapp !~ '^\+[1-9][0-9]{6,14}$';

-- Una vez corregidas esas filas:
-- alter table public.clientes validate constraint clientes_whatsapp_canonico;

commit;
