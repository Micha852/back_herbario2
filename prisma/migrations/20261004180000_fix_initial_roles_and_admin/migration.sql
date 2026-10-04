-- Corrige los datos iniciales de 20260125025500_seed_initial_data para instalaciones nuevas.
-- (En bases que ya pasaron por prisma/seed.ts no cambia nada.)

-- 1) Roles: el código los busca por el nombre de UserRole (ADMINISTRADOR, COLABORADOR,
--    VISITANTE); la migración inicial los creó como 'Administrador', etc. y así el registro
--    y el ingreso con Chairá no encontraban el rol de visitante.
UPDATE roles SET name = 'ADMINISTRADOR', "updatedAt" = NOW()
WHERE name = 'Administrador' AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMINISTRADOR');

UPDATE roles SET name = 'COLABORADOR', "updatedAt" = NOW()
WHERE name = 'Colaborador' AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'COLABORADOR');

UPDATE roles SET name = 'VISITANTE', "updatedAt" = NOW()
WHERE name = 'Visitante' AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'VISITANTE');

-- 2) admin@udla.edu.co: su hash no corresponde a ninguna contraseña (nadie puede entrar) y
--    su sola existencia hacía que el seed se negara a correr. Solo se toca si conserva ese
--    hash original; si algo ya depende de la cuenta, se desactiva en vez de borrarla.
--    El primer administrador se crea con: npm run create-admin
DO $do$
BEGIN
  DELETE FROM users
  WHERE id = '00000000-0000-0000-0022-000000000001'
    AND password = '$2b$10$YQ8XqN7gH5YK3UZ0J9F4XO7KYX5PUqY5YqUqL5UZ0J9F4XO7KYX5P';
EXCEPTION WHEN foreign_key_violation THEN
  UPDATE users SET "isActive" = false, "updatedAt" = NOW()
  WHERE id = '00000000-0000-0000-0022-000000000001'
    AND password = '$2b$10$YQ8XqN7gH5YK3UZ0J9F4XO7KYX5PUqY5YqUqL5UZ0J9F4XO7KYX5P';
END
$do$;
