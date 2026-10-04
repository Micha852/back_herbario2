-- Un correo = una cuenta, sin importar mayúsculas ("Ana@Correo.co" = "ana@correo.co").
-- La app ya normaliza (common/utils/email.util.ts); esto lo garantiza en la base.

-- 1) Correos existentes a minúsculas y sin espacios. Si dos cuentas chocaran al normalizar,
--    esas se dejan como están (no se mezclan cuentas): hay que resolverlas a mano.
UPDATE users u
SET email = lower(trim(u.email)), "updatedAt" = NOW()
WHERE u.email <> lower(trim(u.email))
  AND NOT EXISTS (
    SELECT 1 FROM users o
    WHERE o.id <> u.id AND lower(trim(o.email)) = lower(trim(u.email))
  );

-- 2) Desde ahora todo correo nuevo o modificado debe ir normalizado. Con el índice único
--    que ya existe sobre email, eso hace la unicidad insensible a mayúsculas.
--    NOT VALID: no falla por filas viejas en conflicto (si las hubiera), pero sí se exige
--    en cada INSERT/UPDATE.
ALTER TABLE users
  ADD CONSTRAINT users_email_lowercase CHECK (email = lower(trim(email))) NOT VALID;
