-- Endurece la validación de email en bases ya creadas con 0000_init.sql.
-- Ejecutar una sola vez en Supabase > SQL Editor.
--
-- Rechaza llaves, espacios, puntos consecutivos y dominios/TLD inválidos que
-- antes pasaban y hacían fallar el envío con Resend.
--
-- Se agrega como NOT VALID para no bloquear la migración si ya existen filas
-- con emails inválidos (por ejemplo, "flores.anibal.e@gmail.com}"). Las filas
-- nuevas y las editadas sí se validan. Después de corregir los datos viejos,
-- ejecutá el VALIDATE comentado al final.

alter table clientes drop constraint if exists clientes_email_check;

alter table clientes add constraint clientes_email_check
  check (
    email is null
    or (
      char_length(email) <= 254
      and email ~ '^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$'
    )
  ) not valid;

-- Diagnóstico: filas que incumplen la regla nueva.
-- select id, negocio_id, email
-- from clientes
-- where email is not null
--   and not (
--     char_length(email) <= 254
--     and email ~ '^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$'
--   );

-- Una vez corregidas esas filas:
-- alter table clientes validate constraint clientes_email_check;
