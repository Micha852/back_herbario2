# Endpoint para System Info (CMS)

## Estructura del Endpoint

### GET `/api/system-info/:key`

Devuelve la información del CMS según la key solicitada.

**Params:**
- `key`: `historia` | `datos` | `contacto` | `terminos`

**Response:**
```json
{
  "id": "uuid",
  "key": "historia",
  "title": "Historia del Herbario",
  "content": "{...JSON...}",
  "isActive": true,
  "createdAt": "2024-01-25T...",
  "updatedAt": "2024-01-25T..."
}
```

## Implementación con Prisma

```typescript
// system-info.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SystemInfoService {
  constructor(private prisma: PrismaService) {}

  async findByKey(key: string) {
    const systemInfo = await this.prisma.systemInfo.findUnique({
      where: { key },
    });

    if (!systemInfo || !systemInfo.isActive) {
      throw new NotFoundException(`System info with key "${key}" not found`);
    }

    return systemInfo;
  }

  async update(key: string, content: string) {
    return this.prisma.systemInfo.update({
      where: { key },
      data: {
        content,
        updatedAt: new Date(),
      },
    });
  }
}
```

```typescript
// system-info.controller.ts
import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { SystemInfoService } from './system-info.service';
import { AdminGuard } from './guards/admin.guard'; // Solo admins pueden editar

@Controller('api/system-info')
export class SystemInfoController {
  constructor(private readonly systemInfoService: SystemInfoService) {}

  @Get(':key')
  async getByKey(@Param('key') key: string) {
    return this.systemInfoService.findByKey(key);
  }

  @Put(':key')
  @UseGuards(AdminGuard) // Solo administradores
  async update(
    @Param('key') key: string,
    @Body('content') content: string,
  ) {
    return this.systemInfoService.update(key, content);
  }
}
```

## Ejemplo de uso desde el frontend

```typescript
// app/historia/page.tsx
import { cmsService } from '@/lib/services/cms.service';

export default async function HistoriaPage() {
  const { content } = await cmsService.getHistoria();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-6">{content.introduccion}</h1>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Misión</h2>
          <p>{content.mision}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Visión</h2>
          <p>{content.vision}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Objetivos</h2>
          <ul>
            {content.objetivos.map((objetivo, i) => (
              <li key={i}>{objetivo}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
```

## Panel Admin (ejemplo básico)

```typescript
// app/admin/cms/[key]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function EditCMSPage() {
  const { key } = useParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const res = await fetch(`/api/system-info/${key}`);
      const data = await res.json();
      setContent(data.content);
      setLoading(false);
    }
    loadData();
  }, [key]);

  const handleSave = async () => {
    await fetch(`/api/system-info/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    alert('Guardado exitosamente');
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Editar: {key}</h1>
      <textarea
        className="w-full h-96 p-4 border rounded"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
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

## Validación del JSON

Para el panel admin, sería bueno validar que el JSON sea correcto antes de guardarlo:

```typescript
const handleSave = async () => {
  try {
    // Validar que sea JSON válido
    JSON.parse(content);

    await fetch(`/api/system-info/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    alert('Guardado exitosamente');
  } catch (error) {
    alert('Error: JSON inválido');
  }
};
```
