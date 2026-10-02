# 🗺️ Hoja de Ruta General - Herbario Digital HUAZ 2.0

> **Fuente de verdad** del estado funcional del proyecto (back + front).
> Los demás documentos en `back_herbario2/docs` y `front_herbario2/docs` son planes detallados/históricos; si contradicen este archivo, manda este.

**Última actualización:** 1 de octubre de 2026

---

## 1. Objetivo

Reconstruir el sistema de información del Herbario de la Universidad de la Amazonia (**HDUA 1.0**, ASP.NET MVC + MySQL + MongoDB) con tecnologías actuales y un mejor front, manteniendo su funcionalidad: **galería/consulta de muestras, ficha técnica, CRUD de muestras y catálogos, comentarios, usuarios, informes y descargas**, más mejoras (varias imágenes por muestra, estadísticas).

### Stack

| Capa | Tecnología |
|---|---|
| Backend (`back_herbario2`) | NestJS 10, TypeScript, Prisma 5 + PostgreSQL, JWT (access + refresh), sharp (imágenes en disco local), nodemailer, Swagger en `/api/docs` |
| Frontend (`front_herbario2`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, react-hook-form + zod, componentes UI propios (`components/ui`) |
| API | Todas las rutas bajo **`/api/v1/...`** |

### Referencias del sistema original
- Código HDUA 1.0: `../HDUA`
- PDFs en la carpeta raíz `Herbario 2.0/`: Requerimientos (RF-001…RF-011), Diseño (casos de uso CU-001…CU-035, mockups), Análisis, Informe final.

---

## 2. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | **No hay migración de datos** desde HDUA 1.0. | Nunca hubo datos en producción; solo se usarán datos de prueba. |
| D2 | El sistema **es** la galería de muestras: la consulta pública muestra tarjetas con imagen, y la ficha técnica es la vista de detalle. No hay un módulo "exposición" aparte. | Es el uso principal del herbario. |
| D3 | **Varias imágenes por muestra** (máx. 10, configurable), con una **principal** y un **tipo** por imagen (ejemplar completo, hoja, flor, fruto, detalle, etiqueta). | El modelo `SpecimenImage` del back ya lo soporta; es la mejora más visible frente a HDUA 1.0 (que tenía 1 imagen). |
| D4 | Roles: `ADMINISTRADOR`, `COLABORADOR`, `VISITANTE`, igual que en HDUA 1.0. La consulta pública (búsqueda y ficha) **no requiere login**; comentar sí. | En HDUA 1.0 todo exigía login; abrirlo mejora la difusión. |
| D5 | El contenido institucional (historia, datos, contacto, términos) se gestiona como CMS en la tabla `SystemInfo`. | Ya implementado. |
| D6 | Imágenes en **disco local** (`uploads/`) con versiones thumbnail/medium/large generadas por sharp. | Suficiente para el alcance actual. |
| D7 | **Eliminar muestra = borrado real** (filas, recolectores, comentarios e imágenes en disco). | Decidido en el commit `d9a581f`. |
| D8 | **Roles + permisos ajustables.** ADMINISTRADOR = superadmin (todo, no recortable). COLABORADOR arranca con permisos por defecto y el admin puede conceder/quitar por persona. VISITANTE consulta y comenta. Gestionar usuarios y permisos nunca se delega. | Mismo reparto que HDUA 1.0, pero validado en el back (en HDUA casi todo era solo visual) y configurable. Ver sección 3.9. |

### Decisiones pendientes
- **Módulo `info` duplicado** en el back (mismo `SystemInfo` que `system-info`): propuesta, eliminarlo.

---

## 3. Estado por funcionalidad

Leyenda: ✅ hecho · ⚠️ parcial / con bugs · ❌ no existe · — no aplica

### 3.1 Consulta pública (galería)

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Búsqueda simple (nombre científico / vulgar) | CU-023…025, RF-003 | ✅ | ✅ | Más búsqueda general `search` (nombres, catálogo, género, familia) en la galería |
| Búsqueda avanzada (taxonomía + ubicación) | CU-015…022, RF-003 | ✅ | ✅ | Filtros anidados por la jerarquía, departamento/municipio y rango de fechas; selects en cascada con catálogos reales |
| Resultados en tarjetas (galería) con paginación | CU-015 | ✅ | ✅ | Filtros en la URL, chips removibles, orden (recientes / nombre / fecha de colecta) |
| Ficha técnica de la muestra | CU-027 | ✅ | ✅ | Taxonomía, ubicación, características, observaciones, recolectores, proyecto |
| Galería de imágenes en la ficha (carrusel + zoom) | D3 | ✅ | ✅ | Miniaturas + visor a pantalla completa. Usa `imageId` heredado si la muestra no tiene `SpecimenImage` |
| Mapa de ubicación (Leaflet) | RF-004 | ✅ | ✅ | Capas mapa/satélite; si la muestra no tiene coordenadas usa las de la localidad (aproximada) |
| Ficha técnica en PDF | HDUA | ❌ | ❌ | En HDUA 1.0 solo ADMIN |
| Muestras inactivas visibles solo para ADMIN/COLABORADOR | HDUA | ✅ | ✅ | `OptionalJwtAuthGuard`: el público solo recibe activas; una inactiva responde 404 |

### 3.2 Comentarios

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Listar comentarios de una muestra | CU-027, RF-005 | ✅ | ✅ | Muestras inactivas: solo el equipo |
| Publicar (requiere login) | CU-028, RF-010 | ✅ | ✅ | Sin sesión: enlace a login que vuelve a la ficha |
| Editar propio / eliminar (autor o ADMIN) | HDUA | ✅ | ✅ | Solo el autor edita; ADMIN elimina cualquiera (moderación) |

### 3.3 Cuentas y perfil

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Login | CU-001/002 | ✅ | ✅ | |
| Registro | CU-012/013, RF-007 | ✅ | ✅ | Tras registrarse redirige a `/panel` y rebota a visitantes |
| Recuperar contraseña | CU-014, RF-009 | ✅ | ✅ | Envía contraseña temporal por correo (igual que HDUA). Existe `sendPasswordRecovery` con enlace sin usar |
| Ver / editar perfil, cambiar contraseña | CU-033/034, RF-011 | ✅ | ✅ | Autogestión vía `PATCH /auth/profile` (corregido 2026-09-30: antes usaba `PATCH /users/:id`, solo ADMIN) |
| Desactivar mi cuenta | CU-035, RF-011 | ✅ | ✅ | `DELETE /auth/profile`; un ADMIN no puede desactivarse a sí mismo |
| Refresh de token automático | — | ✅ | ✅ | `apiFetch` renueva ante 401 y reintenta; la sesión se valida al cargar la app |

### 3.4 Panel: gestión de muestras

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Dashboard | CU-003 | ✅ | ✅ | `GET /reports/dashboard`: totales según permisos, mis muestras, sin imagen, proyectos, recolectores, últimas muestras y comentarios |
| Listado con búsqueda, filtros y paginación | CU-007 | ✅ | ✅ | |
| Crear muestra (asistente 6 pasos) | CU-004 | ✅ | ✅ | Número de catálogo `HUAZ-000001` automático |
| Subir varias imágenes al crear | D3 | ✅ | ✅ | Se asocian con tipo y descripción; la primera queda como principal; máximo 10 |
| Editar muestra | CU-005 | ✅ | ✅ | `/panel/muestras/[id]/editar`: mismo asistente precargado, navegación libre entre pasos, interruptor activa/inactiva |
| Gestionar imágenes de una muestra (agregar, quitar, marcar principal) | D3 | ✅ | ✅ | En el paso 6 de editar; los cambios se guardan al instante |
| Eliminar / desactivar | CU-006 | ⚠️ | ✅ | *Hard delete* (decisión tomada, commit `d9a581f`) |
| Asignar / quitar recolectores | HDUA | ✅ | ✅ | Front los asigna dos veces al crear |

### 3.5 Panel: catálogos y parámetros

Módulo genérico `/catalogs` (19 catálogos definidos en `back_herbario2/src/modules/catalogs/catalog-definitions.ts`): listar con conteo de uso, crear/editar (`catalogs.manage`), inhabilitar y eliminar solo si no está en uso (`catalogs.delete`). Inhabilitar lo saca de los formularios. Los endpoints de escritura viejos de /taxonomy, /locations, /projects y /specimens/reference se eliminaron (quedan sus lecturas).

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Taxonomía (División → Clase → Orden → Familia → Género → Especie) | RF-001 | ✅ | ✅ | `/panel/catalogos`: jerarquía con padre obligatorio; la especie calcula su nombre completo (y se actualiza si se renombra el género) |
| Morfología (venación, forma, margen) | RF-002 | ✅ | ✅ | |
| Referencias (origen, tipo de origen, condición, hábitat) | HDUA | ✅ | ✅ | |
| Ubicaciones (departamento → municipio → tipo → ubicación) | HDUA | ✅ | ✅ | Localidades con coordenadas y vista previa en mapa |
| Proyectos y protocolos de muestreo | HDUA | ✅ | ✅ | |

### 3.6 Panel: usuarios

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Listar / buscar / crear usuarios | CU-008/009/011 | ✅ | ✅ | `/panel/usuarios` (solo ADMIN): búsqueda, filtros por rol/estado/recolector, conteo por rol. Al crear se genera una contraseña temporal (se envía por correo y se muestra una vez) |
| Cambiar rol, marcar recolector, activar/desactivar, restablecer contraseña | CU-010/026 | ✅ | ✅ | Botón rápido "Hacer colaborador" para visitantes. Protecciones: el admin no se quita el rol ni se desactiva, y siempre queda un admin activo. Un desactivado no puede iniciar sesión ni renovar el token. Cambiar de rol descarta los permisos ajustados |
| Gestionar permisos por colaborador (switches) | D8 | ✅ | ✅ | Pestaña "Permisos": lista de colaboradores, switches agrupados con marca "Ajustado / Por defecto" y "Restablecer" |

### 3.7 Panel: informes y descargas

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Informe "muestras por recolector" (PDF y Excel) | CU-029…032, RF-006 | ⚠️ | ❌ | Back solo devuelve JSON |
| Tabla Darwin Core por rango de fechas (CSV y Excel) | RF-006 | ✅ | ✅ | `GET /darwin-core/export?format=xlsx|csv`: 70 términos en el orden de la plantilla SiB/GBIF del jardín botánico, filtros por fecha y proyecto; inactivas solo con `specimens.status` |
| Datos de la colección (institución, código, derechos...) | DwC | ✅ | ✅ | `GET/PUT /darwin-core/collection` (system_info "coleccion"); editar requiere `cms.edit` |
| Importar muestras desde Darwin Core (Excel/CSV) | DwC | ✅ | ✅ | `POST /darwin-core/import` (`specimens.import`): vista previa sin escribir + importación en una transacción. Crea la taxonomía/ubicaciones/catálogos que falten (compara sin tildes ni mayúsculas), omite catálogos duplicados, recolectores sin cuenta quedan en texto |
| Estadísticas (totales, por familia, por departamento) | RNF-004 | ⚠️ | ⚠️ | `specimensByFamily` siempre `[]` (TODO) |

### 3.8 Contenido institucional y contacto

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Páginas historia, datos, contacto, términos | HDUA | ✅ | ✅ | |
| Editor CMS (solo ADMIN) | HDUA | ✅ | ✅ | `PUT system-info/:key` requiere `cms.edit`; el front protege la ruta por permiso |
| Buzón de sugerencias (correo al herbario) | HDUA | ✅ | ❌ | |

---

### 3.9 Roles y permisos (D8)

Código: `back_herbario2/src/modules/permissions/` (catálogo en `permissions.constants.ts`) y espejo en `front_herbario2/lib/permissions.ts`.
El back valida cada acción con `@RequirePermissions(...)` + `PermissionsGuard`; los permisos efectivos se calculan en cada petición (los cambios del admin aplican al instante).

| Permiso | Qué permite | ADMIN | COLABORADOR (defecto) | VISITANTE |
|---|---|---|---|---|
| `specimens.create` | Registrar muestras | ✅ | ✅ | ❌ |
| `specimens.edit_own` | Editar las muestras que registró (datos, recolectores, imágenes) | ✅ | ✅ | ❌ |
| `specimens.edit_any` | Editar cualquier muestra | ✅ | ❌ | ❌ |
| `specimens.status` | Activar/inactivar y ver muestras inactivas | ✅ | ❌ | ❌ |
| `specimens.delete` | Eliminar muestras | ✅ | ❌ | ❌ |
| `catalogs.manage` | Crear/editar taxonomía, ubicaciones, proyectos, parámetros | ✅ | ✅ | ❌ |
| `catalogs.delete` | Inhabilitar/eliminar en catálogos | ✅ | ❌ | ❌ |
| `reports.generate` | Informes y Darwin Core | ✅ | ✅ | ❌ |
| `cms.edit` | Páginas institucionales | ✅ | ❌ | ❌ |
| `comments.moderate` | Eliminar comentarios ajenos | ✅ | ❌ | ❌ |
| *(no delegable)* | Gestionar usuarios y permisos | ✅ | ❌ | ❌ |

Todos los usuarios con sesión: comentar, editar/borrar sus comentarios, gestionar su perfil. Consultar no requiere sesión.

Muestras registradas antes de que existiera `createdBy` solo las edita quien tenga `specimens.edit_any`.

## 4. Bugs y deuda técnica conocidos

### Seguridad (prioridad alta)
- [x] 🚨 `GET /specimens`, comentarios y reportes exponían el hash de contraseña de usuarios (`include: { user: true }`). Ahora usan `publicUserSelect` (`src/common/prisma/user-select.ts`).
- [x] `GET /auth/profile` devolvía el hash de contraseña (interceptor `ClassSerializerInterceptor` global).
- [x] `PUT /api/v1/system-info/:key` protegido (JWT + `ADMINISTRADOR`); el editor CMS usa `apiFetch`.
- [x] `images` (`upload`, `PATCH`, `DELETE`, `primary`): restringido a ADMIN/COLABORADOR; `PATCH` con DTO validado.
- [x] Sin secretos JWT por defecto: `src/config/env.validation.ts` exige `JWT_SECRET` y `JWT_REFRESH_SECRET` (en producción: ≥32 caracteres y no de ejemplo).
- [x] Correos con datos del usuario escapados (`escapeHtml`). Recuperar contraseña: primero se envía el correo y solo si sale se cambia la contraseña. Sin SMTP en desarrollo, los correos se muestran en consola.
- [x] Rate limiting activo (`ThrottlerGuard` global, 300/min por IP; login 10/min, registro 5/min, recuperar 3/min; imágenes sin límite).
- [x] Front: `/panel/cms` y `/panel/usuarios` solo para ADMIN en el layout del panel (el back valida igual).
- [x] Comentarios: solo el autor edita (antes ADMIN editaba textos ajenos); muestras inactivas sin comentarios públicos.

### Back
- [x] `GET /images/:id?version=...` respondía 400 (`version` no estaba en `TransformImageDto`).
- [x] Filtros taxonómicos de `GET /specimens` (anidar por `species.genus.family…`).
- [x] Añadir filtros `departmentId`, `municipalityId`, `startDate`, `endDate`, `search` y `sort`.
- [x] Taxonomía: padre obligatorio y epíteto en especie (módulo `/catalogs`).
- [x] `PATCH /specimens/:id` con `UpdateSpecimenDto` real (`PartialType`), y `createdBy`/`updatedBy` registrados en crear y editar.
- [x] `PATCH specimens/:id/image` duplicado eliminado.
- [x] Contador de catálogo atómico (`upsert` + `increment`) y salta números ya usados.
- [x] Imágenes nuevas guardadas con extensión `.webp` (las anteriores conservan su nombre).
- [x] `.env.example` completo y alineado con el código (puerto 4000, JWT, SMTP `MAIL_*`, CORS, etc.).
- [x] Variables de entorno alineadas; validación al arrancar.
- [x] `GET /api/v1/health` (API + base de datos; 503 si la base no responde).
- [ ] Seed de migración `20260125025500_seed_initial_data` con admin `admin@udla.edu.co` (hash probablemente inválido). No se edita: la migración ya está aplicada; no afecta porque `seed.ts` crea el admin real.
- [x] `prisma/seed.ts` borra toda la base: ahora se niega si hay datos, salvo `npm run prisma:seed -- --reset`.

### Front
- [x] 401 redirige a `/auth/login?session=expired` (ruta inexistente → `/login`).
- [ ] Solo `specimens.service` usa `apiFetch`; unificar el resto de servicios.
- [ ] Servicios sin uso: `catalogs.service.ts`, `cms.service.ts`. Página duplicada `/contactos`.
- [x] `console.log` de depuración en crear muestra, `specimens.service` y editor CMS eliminados.
- [x] Botón "Panel de control" solo para ADMIN/COLABORADOR; roles con `getRoleName()`.
- [ ] Assets vacíos de plantilla en `public/` y `find-cascade.ps1` suelto.

### Ambos
- [ ] Tests: back con 40 tests unitarios (permisos, guard, validación de catálogos, reglas de usuarios); faltan servicios y e2e. Front sin runner.
- [ ] Sin Docker, CI ni health check.

---

## 5. Plan por fases

### Fase A - Estabilizar back ✅
- [x] Arreglos de seguridad (sección 4).
- [x] Filtros de búsqueda de muestras (taxonomía, ubicación, fechas).
- [x] `UpdateSpecimenDto` (los DTOs de taxonomía pasan a Fase C, catálogos).
- [x] Alinear `.env.example` con el código.
- [x] Seed de **muestras de prueba** (`npm run prisma:seed:specimens`): 18 muestras, 3 ubicaciones y 2 proyectos; no borra datos y no duplica. Sin imágenes (se cargan desde el panel).

### Fase B - Consulta pública real ✅
- [x] `/consultas`, `/consultas/avanzada`, `/consultas/resultados`, `/consultas/[id]` consumiendo el API (mocks eliminados).
- [x] Resultados como galería de tarjetas con imagen principal y paginación.
- [x] Ficha: carrusel de imágenes con zoom.
- [x] Ficha: mapa Leaflet.
- [x] Comentarios en la ficha: publicar, editar propio, eliminar.

### Fase C - Panel completo ⏳
- [x] Editar muestra (`/panel/muestras/[id]/editar`), reutilizando el asistente (`components/panel/specimen-form/specimen-form.tsx`).
- [x] Imágenes múltiples: subida al crear + gestión en edición (principal, tipo, descripción, quitar).
- [x] Capa de permisos (back + front): catálogo, guard, ajustes por usuario, endpoints migrados de roles a permisos. Ver 3.9.
- [x] Catálogos: taxonomía, morfología, referencias, ubicaciones, proyectos/protocolos (`/panel/catalogos`).
- [x] Usuarios (`/panel/usuarios`): listar, crear, editar, rol, recolector, estado, restablecer contraseña + pestaña "Permisos" con switches por colaborador.
- [x] Dashboard con datos reales.

### Fase D - Informes y descargas ⏳
- [x] Back: Darwin Core en Excel y CSV (bien escapado) con las columnas de la plantilla real + datos de la colección configurables.
- [x] Back: importador Darwin Core (vista previa + importación). El Excel real (`Base de datos Jardin Botanico Uniamazonia GIBF Colombia.xlsx`, 379 registros) queda listo para importarse; **lo carga el usuario a mano como prueba**.
- [x] Modelo: `identifiedBy`, `dateIdentified`, `otherCollectors`; muestras ligadas al nivel taxonómico más bajo (especie, género o familia).
- [ ] Back: informe por recolector en PDF y Excel; ficha técnica en PDF.
- [x] Front: `/panel/informes` (exportar Darwin Core con filtros + datos de la colección) y `/panel/muestras/importar` (subir, vista previa, confirmar).
- [ ] Front: `/panel/informes` (tipo de informe, rango de fechas, formato, descarga).
- [ ] Estadísticas con gráficas (por familia, departamento, periodo).

### Fase E - Calidad y despliegue ⏳
- [ ] Tests: unitarios de servicios críticos (specimens, auth) y e2e de los flujos principales. ✅ Permisos (19 tests).
- [x] Refresh de token automático.
- [ ] Middleware de rutas en el front.
- [ ] Buzón de sugerencias en el front.
- [ ] Limpieza (mocks, servicios duplicados, logs, módulo `info`).
- [ ] Docker Compose (Postgres + back + front) y health check.

---

## 6. Fuera de alcance (ideas futuras)

Pedidas en los documentos de HDUA 1.0 pero que tampoco estaban implementadas:
- Multilenguaje ES/EN/PT (RNF-002).
- Integración con GBIF / SiB Colombia.
- Mapa de distribución con varias muestras.
- Descripción morfológica ampliada (hábito, tallos, exudados; RF-002).
- Usos medicinales y categorías de uso; subespecies y variedades.
- Permisos granulares (`Role.permissions` existe pero no se usa).

---

## 7. Mapa de documentos

| Documento | Estado |
|---|---|
| `back_herbario2/docs/ROADMAP_GENERAL.md` | **Vigente**: este archivo |
| `back_herbario2/docs/HOJA_RUTA_CMS.md` | Histórico (CMS) |
| `back_herbario2/docs/IMPLEMENTACION_CMS_COMPLETADA.md` | Histórico (CMS), con correcciones |
| `front_herbario2/docs/ROADMAP_FRONT.md` | Plan detallado del front por fases y casos de uso; estado aquí |
| `front_herbario2/docs/ROADMAP_PANEL_ADMIN.md` | Plan detallado del CRUD de muestras; estado aquí |
| `front_herbario2/docs/PROGRESO.md`, `DESARROLLO.md` | Históricos |
| `front_herbario2/docs/components.md` | Vigente: documentación de la librería UI |


---

## 8. Bitácora

Registro de avances (lo más reciente arriba). El detalle de cada cambio está en el historial de git.

### 2026-10-02
- **Filtros del panel de muestras (6):** estado, desde, hasta, imágenes (con/sin), origen (manual/importada) y nivel de identificación (especie/solo género/solo familia/sin taxonomía). Campo nuevo `Specimen.source` (migración `specimen_source`, marca como IMPORT las 379 importadas).
- **Primera importación real:** el usuario importó el Excel del jardín botánico desde el panel: 379 muestras, 614 elementos nuevos en catálogos, 0 errores. Verificado contra el Excel (taxonomía en cascada, fechas, adultos/juveniles, elevación, ubicación, recolectores). El importador ahora reutiliza géneros por nombre y avisa cuando un taxón existente tiene otra clasificación (Magnoliopsida/Liliopsida/Polypodiopsida bajo divisiones viejas vs Tracheophyta). Regla global de cursor para botones (Tailwind 4).
- **Front Darwin Core:** `/panel/informes` con exportación (formato, rango de fechas, proyecto, inactivas según permiso) y datos de la colección (editables con `cms.edit`); `/panel/muestras/importar` con arrastrar y soltar, vista previa (resumen, catálogos nuevos, recolectores, detalle por fila filtrable) y confirmación con overlay. Botón "Importar" en Muestras (`specimens.import`).

### 2026-10-01
- **Darwin Core (Fase D):** el Excel del jardín botánico (plantilla SiB Colombia/GBIF) se tomó como referencia. Módulo `darwin-core`: export Excel/CSV con 70 términos, datos de la colección en `system_info`, importador con vista previa (379/379 filas del Excel real importables, 0 errores; no se importó). Migraciones `add_identification_fields` (identificado por, fecha de identificación, otros recolectores) y `specimen_genus_family_level` (muestras identificadas hasta género o familia; filtros, búsqueda, uso en catálogos y export lo respetan). Permiso nuevo `specimens.import`. Formulario: "Autor del nombre", identificación (paso 2), notas de campo y otros recolectores (paso 5). Endpoints viejos `reports/darwin-core*` eliminados. 57 tests unitarios + pruebas integrales (export 15, importación 16, niveles taxonómicos 10).
- **Usuarios (Fase C):** `UsersAdminService` + endpoints de gestión (`GET/POST /users`, `GET/PATCH/DELETE /users/:id`, `POST /users/:id/reset-password`), contraseña temporal segura, reglas de "último admin" y auto-degradación (6 tests unitarios) y prueba integral de 31 casos. `/users/collectors` ya no expone correos (solo id y nombre) y el paso 5 del formulario de muestras muestra bien los nombres. `/auth/refresh` rechaza usuarios desactivados. Front: `/panel/usuarios` con pestañas Usuarios y Permisos.
- **Catálogos (Fase C):** módulo genérico `/catalogs` con 19 catálogos (validación en español, uso, inhabilitar, eliminar solo sin uso, duplicados → 409); página `/panel/catalogos` con pestañas por grupo, filtro por nivel superior, formulario generado desde las definiciones (mapa de vista previa en localidades). 15 tests unitarios nuevos + prueba integral. Escrituras viejas de catálogos eliminadas.
- **Dashboard real:** endpoint `/reports/dashboard` (respeta permisos: las inactivas solo con `specimens.status`); tarjetas Muestras / Mis muestras / Sin imagen / Proyectos, últimas muestras con miniatura, últimos comentarios y acciones rápidas según permisos. Página 404 propia.
- **Roles y permisos (D8):** tabla `user_permissions` (migración `20261001154723_add_user_permissions`), catálogo de 10 permisos, `@RequirePermissions` + `PermissionsGuard`, endpoints de gestión `/permissions` (solo ADMIN). ~60 endpoints migrados de `@Roles` a permisos. Colaborador: edita solo sus muestras; no cambia estado ni ve inactivas; no CMS ni moderación. Darwin Core deja de ser público (`reports.generate`).
- **Front con permisos:** `usePermissions()`; sidebar, listado (editar/eliminar/nueva/filtro de estado), página de editar (aviso si no es suya, interruptor de estado solo con permiso) y moderación de comentarios según permisos. El perfil refresca los permisos al cargar la app.
- **Tests:** 19 unitarios en el back (permisos + guard) y prueba integral de 26 casos contra el API. Primer `next build` de producción exitoso.

### 2026-09-30
- **Fase A cerrada:** CMS protegido; secretos JWT obligatorios con validación de `.env`; rate limiting; correos escapados y recuperar contraseña sin bloquear usuarios (correo en consola sin SMTP); contador de catálogo atómico; `/health`; seguro en `seed.ts`; `.env.example` completo.
- **Fase B cerrada:** galería pública con filtros en cascada y URL compartible; ficha con galería de imágenes, mapa Leaflet y comentarios (solo el autor edita; ADMIN modera).
- **Panel:** editar muestra (asistente compartido), gestor de imágenes (hasta 10, principal, tipo, descripción, inhabilitar, borrado permanente), creado/editado por, seed de 18 muestras de prueba.
- **UI:** DatePicker y Select propios, ConfirmDialog, LoadingOverlay, Switch, toasts globales, modo claro forzado.
- **Seguridad:** fugas de hash de contraseña cerradas (`publicUserSelect`), muestras inactivas ocultas al público, `uploads/` fuera de git.