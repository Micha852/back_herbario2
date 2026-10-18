# Herbario HUAZ — Backend

API del Herbario Digital de la Universidad de la Amazonia (Herbario 2.0, rehecho a partir del proyecto de grado HDUA).
Funciona con el front [`front_herbario2`](https://github.com/Micha852/front_herbario2).

**Stack:** NestJS 10 · Prisma 5 · PostgreSQL · Node 22.

## Qué hace

- **Muestras:** registro, edición, estados y taxonomía enlazada al nivel más bajo conocido (especie, género o familia).
- **Imágenes:** subida con versiones automáticas (miniatura, mediana y grande). Las imágenes del sitio (fondo, logo, favicon) se borran cuando se reemplazan.
- **Darwin Core:**
  - Exportación a Excel o CSV con los 70 términos de la plantilla SiB Colombia / GBIF.
  - Importación con vista previa y confirmación en una sola transacción. Los números de catálogo repetidos se omiten.
- **Documentos PDF:** ficha técnica, etiqueta de herbario e informe por recolector.
- **Usuarios y permisos:**
  - **Administrador:** acceso total.
  - **Colaborador:** sus permisos se ajustan por persona.
  - **Visitante:** solo consulta y comenta.
- **Cuentas:**
  - El registro pide un código de verificación enviado al correo.
  - Se puede entrar con Chairá, la plataforma de la universidad (opcional).
  - Un correo solo puede pertenecer a una cuenta, sin importar mayúsculas.
- **CMS:** páginas del sitio, página de inicio (fondo, logo, ícono de la pestaña, textos) y estadísticas públicas.
- **Correo:** se configura desde el panel y la contraseña se guarda cifrada. Si no se configura en el panel, se usa `.env`.

## Requisitos

- Node 22 y npm
- PostgreSQL 14 o superior

## Desarrollo

```bash
npm install
cp .env.example .env          # completa DATABASE_URL y los secretos JWT
npx prisma migrate deploy     # crea las tablas
npm run prisma:seed           # datos de prueba (ver abajo)
npm run start:dev             # http://localhost:4000
```

- API: `http://localhost:4000/api/v1`. Salud: `GET /api/v1/health`.
- Documentación interactiva (Swagger): `http://localhost:4000/api/docs`. Solo existe fuera de producción.

### Usuarios de prueba (`npm run prisma:seed`)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@uniamazonia.edu.co | Admin123 |
| Colaborador | maria.garcia@uniamazonia.edu.co | Collab123 |
| Visitante | carlos.rodriguez@unal.edu.co | Visit123 |

> El seed **borra toda la base** antes de cargar los datos. Si la base ya tiene datos, se niega a correr a menos que se use `npm run prisma:seed -- --reset`.
> Solo es para desarrollo y demos. En producción usa `create-admin` (siguiente sección).
> Para agregar muestras de prueba sin borrar nada: `npm run prisma:seed:specimens`.

### Correos en desarrollo

Sin correo configurado (ni en el panel ni en `.env`), los correos se imprimen en la consola del back. Ahí aparecen, por ejemplo, los códigos de verificación del registro.
En producción eso no pasa. Sin correo configurado:
- el registro responde con un aviso;
- la recuperación de contraseña no envía nada y deja la contraseña como estaba.

## Producción con Docker

`docker-compose.yml` levanta Postgres, el back y el front. Necesita las carpetas `back_herbario2` y `front_herbario2` una al lado de la otra.

```bash
cp .env.docker.example .env.docker      # completa los secretos
docker compose up -d --build            # las migraciones se aplican al arrancar
docker compose exec back npm run create-admin
```

1. **`create-admin`** crea el primer administrador. Pregunta el correo, el nombre y la contraseña, y no muestra la contraseña al escribirla. No borra nada.
   Sin terminal interactiva, usa `--email`, `--name` y la variable de entorno `ADMIN_PASSWORD`.
2. Luego, en el panel, configura **Correo**. Sin correo no funcionan el registro ni la recuperación de contraseña.
3. `PUBLIC_API_URL` es la URL con la que el **navegador** llega al back. Se incrusta en el front al construirlo, así que si cambia hay que volver a construir el front.

Los datos quedan en dos volúmenes:
- `pgdata`: la base.
- `uploads`: las imágenes.

Esos dos volúmenes son lo que hay que respaldar.

### Sin Docker

```bash
npm ci && npx prisma generate && npm run build
npx prisma migrate deploy
npm run create-admin
NODE_ENV=production node dist/main
```

En producción la app **no arranca** si los secretos JWT son cortos (menos de 32 caracteres), iguales entre sí o los valores de ejemplo.

## Multitenant (rama `saas`)

Una sola instalación atiende a **varios herbarios**, cada uno con **su propia base de datos**: el mismo esquema de siempre, así que sus muestras, usuarios, catálogos, CMS y correo quedan aislados sin cambiar los módulos.

- **Base master** (`MASTER_DATABASE_URL`, esquema en `prisma/master/`): qué herbarios existen (`slug`, `dbName`, estado) y los administradores de la plataforma.
- **Cada petición** se asocia a un herbario en `src/tenancy/tenant.middleware.ts`. Se busca en este orden:
  1. el subdominio `<slug>.PLATFORM_DOMAIN`;
  2. la cabecera `X-Herbario` (desarrollo);
  3. `DEFAULT_HERBARIUM`.

  Un herbario inexistente responde 404, uno suspendido 403 y uno que se está creando 503.
- **`PrismaService` es un proxy**: cada `this.prisma…` va a la base del herbario de la petición, mediante un pool LRU de clientes en `tenant-clients.service.ts`. Fuera de una petición de herbario lanza un error, en vez de ir a un herbario cualquiera.
- **El JWT lleva el herbario (`hb`)**: una sesión de un herbario no sirve en otro.

```bash
npm run master:migrate                                    # migraciones de la master
npm run herbarium:create -- --slug coah --name "Herbario COAH" \
  --admin-email admin@coah.co --admin-name "Admin COAH"   # base nueva + migraciones + admin
npm run herbarium:create -- --slug huaz --name "HUAZ" --db hdua_db --existing   # adoptar una base existente
npm run tenants:migrate                                   # migraciones en la base de CADA herbario
```

En Docker, el contenedor ejecuta `master:migrate` y `tenants:migrate` al arrancar. Cada herbario tiene su base `herbario_<slug>` en el mismo servidor de `DATABASE_URL`.

## Variables de entorno

Están todas en [`.env.example`](.env.example), con su explicación. Las principales:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL (obligatoria) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Firmas de las sesiones (obligatorias y distintas) |
| `CORS_ORIGIN`, `APP_URL` | URL del front (CORS y enlaces en los correos) |
| `MAIL_*` | SMTP. Opcional si se configura desde el panel |
| `CHAIRA_*` | Ingreso con Chairá. Sin `CHAIRA_CLIENT_ID` el botón no aparece |
| `SETTINGS_ENCRYPTION_KEY` | Cifra la contraseña SMTP guardada en la base. Si no está, se usa `JWT_SECRET` |

## Pruebas

```bash
npm test                 # unitarias
npm run test:e2e         # de punta a punta, contra una base real
```

El e2e crea y borra datos. Por seguridad **solo corre si el nombre de la base contiene `test`, `e2e` o `ci`**; si no, se omite con un aviso. Para prepararlo:

```bash
export DATABASE_URL="postgresql://usuario:clave@localhost:5432/herbario_e2e?schema=public"
npx prisma migrate deploy
npx ts-node prisma/seed.ts --reset
npm run test:e2e
```

El e2e intercepta los correos: no envía nada real.
La CI de GitHub Actions (`.github/workflows`) corre tipos, pruebas unitarias, build, migraciones sobre una base vacía y el e2e en cada push.

## Base de datos y migraciones

- Esquema: `prisma/schema.prisma`. Migraciones: `prisma/migrations`. Nunca se editan las que ya están aplicadas.
- Para crear una nueva: `npx prisma migrate dev --name descripcion`.
  - En una terminal no interactiva, genera el SQL con `prisma migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --script` en una carpeta fechada y aplícalo con `prisma migrate deploy`.
- En Windows, si `prisma generate` falla con `EPERM`, detén el servidor de desarrollo, que bloquea el motor de Prisma, y vuelve a intentarlo.

## Estructura

```
src/
  common/        utilidades compartidas (correos, contraseñas, cifrado, taxonomía)
  config/        validación de variables de entorno
  database/      PrismaService
  modules/
    auth/        login, registro con código, Chairá, sesiones (JWT + refresh)
    permissions/ permisos por rol y por colaborador
    users/       gestión de usuarios (panel)
    specimens/   muestras, búsqueda y mapa
    images/      subida y versiones de imágenes
    taxonomy/    familias, géneros y especies
    catalogs/    catálogos genéricos (localidades, hábitats, …)
    darwin-core/ exportación e importación Darwin Core
    reports/     estadísticas, dashboard y PDFs
    system-info/ CMS (páginas e inicio)
    mail/        envío de correos y su configuración
    comments/ feedback/ projects/ locations/ institutions/ genders/
prisma/          esquema, migraciones, seed y create-admin
test/            pruebas e2e
docs/            hoja de ruta (ROADMAP_GENERAL.md) y bitácora
```

La hoja de ruta, las decisiones tomadas y la bitácora de avances están en [`docs/ROADMAP_GENERAL.md`](docs/ROADMAP_GENERAL.md).
