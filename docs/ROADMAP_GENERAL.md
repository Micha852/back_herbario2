# 🗺️ Hoja de Ruta General - Herbario Digital HUAZ 2.0

> **Fuente de verdad** del estado funcional del proyecto (back + front).
> Los demás documentos en `back_herbario2/docs` y `front_herbario2/docs` son planes detallados/históricos; si contradicen este archivo, manda este.

**Última actualización:** 30 de septiembre de 2026

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

### Decisiones pendientes
- **Eliminar muestra:** hoy el back hace *hard delete* (borra filas e imágenes). En HDUA 1.0 solo se desactivaba. Propuesta: **desactivar** por defecto (COLABORADOR/ADMIN) y *hard delete* solo ADMIN.
- **Módulo `info` duplicado** en el back (mismo `SystemInfo` que `system-info`): propuesta, eliminarlo.

---

## 3. Estado por funcionalidad

Leyenda: ✅ hecho · ⚠️ parcial / con bugs · ❌ no existe · — no aplica

### 3.1 Consulta pública (galería)

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Búsqueda simple (nombre científico / vulgar) | CU-023…025, RF-003 | ✅ | ⚠️ | Front usa `lib/data/mock-specimens.ts` |
| Búsqueda avanzada (taxonomía + ubicación) | CU-015…022, RF-003 | ⚠️ | ⚠️ | Back: filtros `divisionId/classId/orderId/familyId/genusId` rompen la consulta; no hay filtro por departamento/municipio/fechas. Front: selects con mocks |
| Resultados en tarjetas (galería) con paginación | CU-015 | ✅ | ⚠️ | Front filtra mocks en cliente, sin paginación |
| Ficha técnica de la muestra | CU-027 | ✅ | ⚠️ | Front lee mocks; el botón "ver" del panel lleva a "no encontrada" |
| Galería de imágenes en la ficha (carrusel + zoom) | D3 | ✅ | ⚠️ | UI existe pero sobre mocks |
| Mapa de ubicación (Leaflet) | RF-004 | ✅ (coordenadas) | ❌ | Falta instalar `react-leaflet` |
| Ficha técnica en PDF | HDUA | ❌ | ❌ | En HDUA 1.0 solo ADMIN |
| Muestras inactivas visibles solo para ADMIN | HDUA | ✅ (`isActive`) | ❌ | |

### 3.2 Comentarios

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Listar comentarios de una muestra | CU-027, RF-005 | ✅ | ❌ | Solo tipos en `lib/types/comment.ts` |
| Publicar (requiere login) | CU-028, RF-010 | ✅ | ❌ | |
| Editar propio / eliminar (autor o ADMIN) | HDUA | ✅ | ❌ | El back sí valida propiedad |

### 3.3 Cuentas y perfil

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Login | CU-001/002 | ✅ | ✅ | |
| Registro | CU-012/013, RF-007 | ✅ | ✅ | Tras registrarse redirige a `/panel` y rebota a visitantes |
| Recuperar contraseña | CU-014, RF-009 | ✅ | ✅ | Envía contraseña temporal por correo (igual que HDUA). Existe `sendPasswordRecovery` con enlace sin usar |
| Ver / editar perfil, cambiar contraseña | CU-033/034, RF-011 | ✅ | ✅ | |
| Desactivar mi cuenta | CU-035, RF-011 | ✅ | ✅ | |
| Refresh de token automático | — | ✅ | ❌ | `refreshToken()` nunca se llama |

### 3.4 Panel: gestión de muestras

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Dashboard | CU-003 | ⚠️ | ⚠️ | Solo el total de muestras es real |
| Listado con búsqueda, filtros y paginación | CU-007 | ✅ | ✅ | |
| Crear muestra (asistente 6 pasos) | CU-004 | ✅ | ✅ | Número de catálogo `HUAZ-000001` automático |
| Subir varias imágenes al crear | D3 | ✅ | ⚠️ | El front no envía `specimenId`/`imageType`; solo asocia la primera; los pies de foto no se guardan |
| Editar muestra | CU-005 | ⚠️ | ❌ | Back: `PATCH` sin validación de DTO. Front: `/panel/muestras/[id]/editar` no existe (404) |
| Gestionar imágenes de una muestra (agregar, quitar, marcar principal) | D3 | ✅ | ❌ | |
| Eliminar / desactivar | CU-006 | ⚠️ | ✅ | Ver decisión pendiente |
| Asignar / quitar recolectores | HDUA | ✅ | ✅ | Front los asigna dos veces al crear |

### 3.5 Panel: catálogos y parámetros

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Taxonomía (División → Clase → Orden → Familia → Género → Especie) | RF-001 | ⚠️ | ❌ | Back: `create` no acepta el padre (`divisionId`, `classId`…) y `species` falla (usa `epithet`, no `name`). Jerarquía solo existe por seed |
| Morfología (venación, forma, margen) | RF-002 | ✅ | ❌ | |
| Referencias (origen, tipo de origen, condición, hábitat) | HDUA | ⚠️ | ❌ | Solo GET y POST |
| Ubicaciones (departamento → municipio → tipo → ubicación) | HDUA | ✅ | ❌ | |
| Proyectos y protocolos de muestreo | HDUA | ✅ | ❌ | |

### 3.6 Panel: usuarios

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Listar / buscar usuarios | CU-008/009/011 | ✅ | ❌ | `/panel/usuarios` enlazado en el sidebar pero no existe |
| Cambiar rol, marcar recolector, activar/desactivar | CU-010/026 | ✅ | ❌ | |

### 3.7 Panel: informes y descargas

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Informe "muestras por recolector" (PDF y Excel) | CU-029…032, RF-006 | ⚠️ | ❌ | Back solo devuelve JSON |
| Tabla Darwin Core por rango de fechas (CSV y Excel) | RF-006 | ⚠️ | ❌ | Back: JSON y CSV (CSV no escapa comillas); sin Excel |
| Estadísticas (totales, por familia, por departamento) | RNF-004 | ⚠️ | ⚠️ | `specimensByFamily` siempre `[]` (TODO) |

### 3.8 Contenido institucional y contacto

| Funcionalidad | Ref. | Back | Front | Notas |
|---|---|---|---|---|
| Páginas historia, datos, contacto, términos | HDUA | ✅ | ✅ | |
| Editor CMS (solo ADMIN) | HDUA | ⚠️ | ⚠️ | Back: `PUT system-info/:key` es **público** (`@Public()` temporal). Front: un COLABORADOR entra escribiendo la URL |
| Buzón de sugerencias (correo al herbario) | HDUA | ✅ | ❌ | |

---

## 4. Bugs y deuda técnica conocidos

### Seguridad (prioridad alta)
- [ ] `PUT /api/v1/system-info/:key` público → proteger con JWT + `ADMINISTRADOR`.
- [ ] `images` (`upload`, `PATCH`, `DELETE`, `primary`): cualquier usuario logueado puede modificar imágenes → restringir a ADMIN/COLABORADOR.
- [ ] Secretos JWT por defecto en código (`'your-super-secret-jwt-key'`, `'refresh-secret'`) → fallar si no están en `.env`.
- [ ] Texto del buzón de sugerencias se inserta sin escapar en el HTML del correo.
- [ ] `ThrottlerModule` configurado pero sin `ThrottlerGuard` global.
- [ ] Front: guardas solo en cliente; `/panel/cms` sin chequeo de rol ADMIN.

### Back
- [ ] Filtros taxonómicos de `GET /specimens` (anidar por `species.genus.family…`).
- [ ] Añadir filtros `departmentId`, `municipalityId`, `startDate`, `endDate` (el front ya los envía).
- [ ] Taxonomía: DTOs con padre + `epithet` en especie.
- [ ] `PATCH /specimens/:id` con `UpdateSpecimenDto` real (`PartialType`).
- [ ] `PATCH specimens/:id/image` declarado dos veces.
- [ ] Contador de catálogo no atómico.
- [ ] Imágenes WebP guardadas con extensión original.
- [ ] Puerto: `.env.example` dice 3000 y el front espera 4000 (`.env` local ya usa 4000).
- [ ] Variables de entorno: el código y `.env.example` no coinciden (`JWT_EXPIRATION` vs `JWT_EXPIRES_IN`, `MAIL_*` vs `SMTP_*`, faltan `JWT_REFRESH_*`, `CORS_ORIGIN`, `APP_URL`, `HERBARIO_EMAIL`).
- [ ] El banner de arranque anuncia `/api/health`, que no existe.
- [ ] Seed de migración `20260125025500_seed_initial_data` con admin `admin@udla.edu.co` distinto a `seed.ts`; hash probablemente inválido.
- [ ] ⚠️ `prisma/seed.ts` **borra toda la base** antes de sembrar.

### Front
- [ ] 401 redirige a `/auth/login?session=expired` (ruta inexistente → `/login`).
- [ ] Solo `specimens.service` usa `apiFetch`; unificar el resto de servicios.
- [ ] Servicios sin uso: `catalogs.service.ts`, `cms.service.ts`. Página duplicada `/contactos`.
- [ ] `console.log` de depuración en crear muestra y `specimens.service`.
- [ ] Botón "Panel de control" visible para todos en `/consultas`; comparaciones de rol inconsistentes (`user.role` vs `user.role.name`).
- [ ] Assets vacíos de plantilla en `public/` y `find-cascade.ps1` suelto.

### Ambos
- [ ] Tests: prácticamente ninguno (back: scaffold; front: sin runner).
- [ ] Sin Docker, CI ni health check.

---

## 5. Plan por fases

### Fase A - Estabilizar back ⏳
- [ ] Arreglos de seguridad (sección 4).
- [ ] Filtros de búsqueda de muestras (taxonomía, ubicación, fechas).
- [ ] DTOs de taxonomía y `UpdateSpecimenDto`.
- [ ] Alinear `.env.example` con el código.
- [ ] Seed de **muestras de prueba con imágenes** (sin borrar la base, o con flag explícito).

### Fase B - Consulta pública real ⏳
- [ ] `/consultas`, `/consultas/avanzada`, `/consultas/resultados`, `/consultas/[id]` consumiendo el API (eliminar `lib/data/mock-*`).
- [ ] Resultados como galería de tarjetas con imagen principal y paginación.
- [ ] Ficha: carrusel de imágenes con zoom + mapa Leaflet.
- [ ] Comentarios en la ficha (listar, publicar, editar propio, eliminar).

### Fase C - Panel completo ⏳
- [ ] Editar muestra (`/panel/muestras/[id]/editar`), reutilizando el asistente.
- [ ] Imágenes múltiples: arreglar subida al crear + gestión en edición (principal, tipo, pie, quitar).
- [ ] Catálogos: taxonomía, morfología, referencias, ubicaciones, proyectos/protocolos.
- [ ] Usuarios (`/panel/usuarios`): listar, rol, recolector, estado.
- [ ] Dashboard con datos reales.

### Fase D - Informes y descargas ⏳
- [ ] Back: informe por recolector en PDF y Excel; Darwin Core en Excel; CSV bien escapado; ficha técnica en PDF.
- [ ] Front: `/panel/informes` (tipo de informe, rango de fechas, formato, descarga).
- [ ] Estadísticas con gráficas (por familia, departamento, periodo).

### Fase E - Calidad y despliegue ⏳
- [ ] Tests: unitarios de servicios críticos (specimens, auth) y e2e de los flujos principales.
- [ ] Refresh de token automático y middleware de rutas en el front.
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
