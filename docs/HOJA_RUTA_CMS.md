> ⚠️ **Documento histórico (actualizado 2026-09-30).** El estado vigente está en [ROADMAP_GENERAL.md](./ROADMAP_GENERAL.md).
> Todo lo marcado como pendiente de backend (módulo SystemInfo, guards JWT/Roles, `@Roles`, Swagger) y de frontend (páginas dinámicas, panel CMS) **ya está implementado**.
> Siguen pendientes: tests, historial de cambios y **proteger `PUT /api/v1/system-info/:key`**, que hoy es público. Las rutas reales son `/api/v1/...`, no `/api/...`.

---

# Hoja de Ruta: Sistema CMS (SystemInfo)

## 📋 Descripción

Implementación de un CMS (Content Management System) para gestionar el contenido de las páginas informativas del herbario (Historia, Datos, Contacto, Términos y Condiciones) mediante la tabla `SystemInfo` con contenido en formato JSON.

---

## ✅ COMPLETADO

### Base de Datos
- [x] Tabla `SystemInfo` creada en schema.prisma
- [x] Migración inicial aplicada (`20260125025411_init`)
- [x] Seed con 4 registros JSON:
  - `historia`: Misión, visión, objetivos, historia, importancia
  - `datos`: Estadísticas, cobertura, especímenes, actualización, acceso
  - `contacto`: Institución, dirección, email, teléfono, horarios, redes sociales
  - `terminos`: 10 secciones de términos y condiciones
- [x] Migración seed aplicada (`20260125025500_seed_initial_data`)
- [x] Jerarquía taxonómica con relaciones FK (División→Clase→Orden→Familia→Género→Especie)

### Frontend - Estructura Base
- [x] Tipos TypeScript creados (`lib/types/cms.ts`)
  - `HistoriaContent`
  - `DatosContent`
  - `ContactoContent`
  - `TerminosContent`
  - `SystemInfo`
  - `SystemInfoResponse<T>`
- [x] Servicio de consumo API (`lib/services/cms.service.ts`)
  - `cmsService.getHistoria()`
  - `cmsService.getDatos()`
  - `cmsService.getContacto()`
  - `cmsService.getTerminos()`

### Documentación
- [x] Ejemplo de implementación de endpoints (`EJEMPLO_ENDPOINT_SYSTEM_INFO.md`)
- [x] Hoja de ruta completa (este archivo)

---

## 🚧 PENDIENTE

### BACKEND

#### 1. Configuración Base
- [ ] Instalar dependencias necesarias (si usas NestJS):
  ```bash
  npm install @nestjs/common @nestjs/core @nestjs/platform-express
  npm install @prisma/client
  npm install bcrypt jsonwebtoken
  npm install --save-dev @types/bcrypt @types/jsonwebtoken
  ```

#### 2. Módulo SystemInfo
- [ ] Crear módulo `src/modules/system-info/`
- [ ] Crear servicio `system-info.service.ts`:
  ```typescript
  @Injectable()
  export class SystemInfoService {
    constructor(private prisma: PrismaService) {}

    async findByKey(key: string) {
      const systemInfo = await this.prisma.systemInfo.findUnique({
        where: { key },
      });

      if (!systemInfo || !systemInfo.isActive) {
        throw new NotFoundException(`System info "${key}" not found`);
      }

      return systemInfo;
    }

    async findAll() {
      return this.prisma.systemInfo.findMany({
        where: { isActive: true },
      });
    }

    async update(key: string, content: string) {
      // Validar que content sea JSON válido
      try {
        JSON.parse(content);
      } catch (error) {
        throw new BadRequestException('Invalid JSON content');
      }

      return this.prisma.systemInfo.update({
        where: { key },
        data: { content, updatedAt: new Date() },
      });
    }
  }
  ```

#### 3. Controller SystemInfo
- [ ] Crear `system-info.controller.ts`:
  ```typescript
  @Controller('api/system-info')
  export class SystemInfoController {
    constructor(private readonly systemInfoService: SystemInfoService) {}

    @Get()
    async findAll() {
      return this.systemInfoService.findAll();
    }

    @Get(':key')
    async getByKey(@Param('key') key: string) {
      return this.systemInfoService.findByKey(key);
    }

    @Put(':key')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('Administrador')
    async update(
      @Param('key') key: string,
      @Body('content') content: string,
    ) {
      return this.systemInfoService.update(key, content);
    }
  }
  ```

#### 4. DTOs (Data Transfer Objects)
- [ ] Crear `dto/update-system-info.dto.ts`:
  ```typescript
  export class UpdateSystemInfoDto {
    @IsString()
    @IsNotEmpty()
    content: string;
  }
  ```

#### 5. Guards y Autenticación
- [ ] Implementar `JwtAuthGuard`
- [ ] Implementar `RolesGuard`
- [ ] Configurar estrategia JWT
- [ ] Crear decorador `@Roles()`

#### 6. Testing
- [ ] Tests unitarios para `SystemInfoService`
- [ ] Tests e2e para endpoints
- [ ] Validación de JSON en updates

#### 7. Documentación API
- [ ] Swagger/OpenAPI para endpoints
- [ ] Ejemplos de request/response

---

### FRONTEND

#### 1. Configuración del Servicio API
- [ ] Configurar variable de entorno `NEXT_PUBLIC_API_URL`
- [ ] Agregar en `.env.local`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:3000
  ```

#### 2. Actualizar Páginas Estáticas → Dinámicas

##### app/historia/page.tsx
- [ ] Reemplazar contenido hardcodeado por `cmsService.getHistoria()`
- [ ] Implementar Server Component con fetch
- [ ] Manejo de errores y loading states
- [ ] Diseño responsive basado en JSON
  ```typescript
  export default async function HistoriaPage() {
    const { content } = await cmsService.getHistoria();

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card variant="elevated" padding="lg">
            <p className="text-lg mb-6">{content.introduccion}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Misión</h2>
              <p>{content.mision}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Visión</h2>
              <p>{content.vision}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Objetivos</h2>
              <ul className="list-disc pl-6 space-y-2">
                {content.objetivos.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </section>

            {/* ... más secciones */}
          </Card>
        </div>
      </div>
    );
  }
  ```

##### app/datos/page.tsx
- [ ] Consumir `cmsService.getDatos()`
- [ ] Renderizar estadísticas dinámicas
- [ ] Cards con información de secciones
  ```typescript
  const { content } = await cmsService.getDatos();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="elevated" padding="lg" className="text-center">
          <div className="text-5xl font-bold text-green-600 mb-3">
            {content.estadisticas.muestras}+
          </div>
          <p className="text-gray-700 text-lg">Muestras Registradas</p>
        </Card>
        {/* ... más cards */}
      </div>
    </>
  );
  ```

##### app/contacto/page.tsx
- [ ] Consumir `cmsService.getContacto()`
- [ ] Renderizar información de contacto
- [ ] Links dinámicos a redes sociales
- [ ] Mapa de ubicación (opcional)

##### app/terminos/page.tsx
- [ ] Consumir `cmsService.getTerminos()`
- [ ] Renderizar secciones dinámicamente
- [ ] Manejo de items/listas opcionales
- [ ] Sección de citación formateada

#### 3. Panel de Administración CMS

##### app/admin/cms/page.tsx
- [ ] Listado de todas las páginas editables
- [ ] Links a edición por key
- [ ] Solo accesible para rol "Administrador"
  ```typescript
  export default function AdminCMSPage() {
    const pages = ['historia', 'datos', 'contacto', 'terminos'];

    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Gestión de Contenidos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map(key => (
            <Card key={key}>
              <Link href={`/admin/cms/${key}`}>
                Editar {key}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  ```

##### app/admin/cms/[key]/page.tsx
- [ ] Editor de JSON con validación
- [ ] Preview en tiempo real
- [ ] Botón guardar con confirmación
- [ ] Manejo de errores (JSON inválido)
- [ ] Historial de cambios (opcional)
  ```typescript
  'use client';

  export default function EditCMSPage({ params }: { params: { key: string } }) {
    const [content, setContent] = useState('');
    const [error, setError] = useState('');

    const handleSave = async () => {
      try {
        JSON.parse(content); // Validar JSON

        const res = await fetch(`/api/system-info/${params.key}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content }),
        });

        if (res.ok) {
          alert('Guardado exitosamente');
        }
      } catch (err) {
        setError('JSON inválido');
      }
    };

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">
          Editar: {params.key}
        </h1>

        <textarea
          className="w-full h-96 p-4 border rounded font-mono"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {error && <p className="text-red-600 mt-2">{error}</p>}

        <button
          onClick={handleSave}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded"
        >
          Guardar Cambios
        </button>
      </div>
    );
  }
  ```

#### 4. Mejoras UX
- [ ] Loading skeletons mientras carga data
- [ ] Error boundaries para errores de fetch
- [ ] Revalidación ISR (Incremental Static Regeneration)
- [ ] Cache de datos (opcional)

#### 5. Validación y Testing
- [ ] Tests para cmsService
- [ ] Tests de integración con mock API
- [ ] Validación de tipos TypeScript

---

## 🔄 Flujo de Trabajo Completo

### 1. Desarrollo Backend
1. Implementar servicio y controller
2. Configurar guards y autenticación
3. Probar endpoints con Postman/Insomnia
4. Documentar con Swagger

### 2. Desarrollo Frontend
1. Actualizar páginas existentes
2. Probar consumo de API
3. Crear panel admin
4. Testing e2e

### 3. Integración
1. Conectar frontend con backend real
2. Probar flujo completo (ver → editar → guardar → ver)
3. Validar permisos (solo admin puede editar)
4. Deploy

---

## 📊 Prioridades

### Alta Prioridad (P0)
1. ✅ Estructura de base de datos
2. ⏳ Endpoints GET básicos backend
3. ⏳ Actualizar páginas frontend para consumir API
4. ⏳ Autenticación y guards

### Media Prioridad (P1)
1. ⏳ Panel admin básico (edición)
2. ⏳ Validación de JSON
3. ⏳ Tests unitarios

### Baja Prioridad (P2)
1. ⏳ Historial de cambios
2. ⏳ Preview en tiempo real
3. ⏳ Editor JSON mejorado (syntax highlighting)
4. ⏳ Búsqueda en CMS

---

## 🎯 Próximos Pasos Inmediatos

1. **Backend:**
   - Crear módulo `system-info`
   - Implementar servicio básico
   - Crear endpoint GET `/api/system-info/:key`
   - Probar con Postman

2. **Frontend:**
   - Actualizar `app/historia/page.tsx` para usar `cmsService`
   - Probar con mock o backend local
   - Replicar en las demás páginas

3. **Integración:**
   - Conectar frontend → backend
   - Validar flujo completo
   - Crear panel admin básico

---

## 📝 Notas Técnicas

### Estructura JSON en BD
El campo `content` almacena JSON como string. El frontend/backend debe:
- **Backend:** Retornar como string (Prisma lo hace automáticamente)
- **Frontend:** Parsear con `JSON.parse()` en el servicio
- **Validación:** Antes de guardar, validar que sea JSON válido

### Seguridad
- Solo usuarios con rol `Administrador` pueden editar
- Validar y sanitizar JSON antes de guardar
- Usar JWT para autenticación en endpoints PUT

### Performance
- Considerar cache en frontend (SWR o React Query)
- ISR en Next.js con `revalidate: 3600` (1 hora)
- Índice en columna `key` (ya existe como UNIQUE)

---

## ✅ Checklist Final

Antes de dar por terminada esta funcionalidad:

- [ ] Endpoints backend funcionando
- [ ] 4 páginas frontend consumiendo API
- [ ] Panel admin operativo
- [ ] Autenticación funcionando
- [ ] Tests básicos pasando
- [ ] Documentación actualizada
- [ ] Deploy en ambiente de desarrollo

---

**Última actualización:** 25 de enero de 2024
**Estado:** En desarrollo - Fase 1 completada (Base de datos y tipos)
