/**
 * Seed de muestras de prueba (sin imágenes).
 *
 * - NO borra datos: solo agrega. Se puede correr varias veces: las muestras se
 *   identifican por registryNumber "SEED-xxx" y no se duplican.
 * - Requiere el seed base (prisma/seed.ts): especies, ubicaciones, usuarios y catálogos.
 * - Crea además algunas ubicaciones y 2 proyectos de prueba si no existen.
 *
 * Uso: npm run prisma:seed:specimens
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@uniamazonia.edu.co';
const CATALOG_PREFIX = 'HUAZ';

// ---------------------------------------------------------------------------
// Datos de apoyo
// ---------------------------------------------------------------------------

/** Coordenadas aproximadas de cada localidad (se les suma un pequeño desplazamiento) */
const LOCATIONS: Record<string, { municipality: string; type: string; lat: number; lng: number; alt: number }> = {
  'Campus Principal Universidad de la Amazonia': { municipality: 'Florencia', type: 'Campus Universitario', lat: 1.6206, lng: -75.6062, alt: 250 },
  'Jardín Botánico del Piedemonte Amazónico': { municipality: 'Florencia', type: 'Jardín Botánico', lat: 1.6452, lng: -75.6318, alt: 310 },
  'Bosque Primario Florencia': { municipality: 'Florencia', type: 'Bosque', lat: 1.6841, lng: -75.6627, alt: 420 },
  'Reserva Natural El Venado': { municipality: 'Belén de los Andaquíes', type: 'Reserva Natural', lat: 1.4178, lng: -75.8733, alt: 380 },
  'Estación Biológica Leticia': { municipality: 'Leticia', type: 'Reserva Natural', lat: -4.1937, lng: -69.9402, alt: 95 },
  // Nuevas (se crean si no existen)
  'Vereda San José del Pepino': { municipality: 'Mocoa', type: 'Bosque', lat: 1.0956, lng: -76.6481, alt: 560 },
  'Sabanas del Yarí': { municipality: 'San Vicente del Caguán', type: 'Reserva Natural', lat: 2.1154, lng: -74.7702, alt: 300 },
  'Serranía de La Lindosa': { municipality: 'San José del Guaviare', type: 'Reserva Natural', lat: 2.5231, lng: -72.6344, alt: 240 },
};

const PROJECTS = [
  {
    name: 'Inventario florístico del Piedemonte Amazónico',
    code: 'SEED-INV-PIE',
    description: 'Proyecto de prueba: inventario de especies arbóreas y arbustivas del piedemonte caqueteño.',
    protocol: 'Inventario Florístico',
    startDate: '2023-02-01',
    endDate: '2025-12-15',
  },
  {
    name: 'Palmas útiles de la Amazonia colombiana',
    code: 'SEED-PALMAS',
    description: 'Proyecto de prueba: registro de palmas de uso alimenticio y artesanal.',
    protocol: 'Colección de Palmas',
    startDate: '2024-03-01',
    endDate: null,
  },
];

interface SeedSpecimen {
  ref: string; // registryNumber: SEED-xxx
  species: string; // "Género epíteto"
  commonName: string;
  location: keyof typeof LOCATIONS;
  date: string;
  collectors: { email: string; number?: string; principal?: boolean }[];
  project?: 0 | 1;
  venation: string;
  form: string;
  margin: string;
  origin: string;
  originType: string;
  condition: string;
  habitat: string;
  elevation?: [number, number];
  adults?: number;
  juveniles?: number;
  observation: string;
  fieldNotes?: string;
  isActive?: boolean;
}

const MARIA = 'maria.garcia@uniamazonia.edu.co';
const JUAN = 'juan.perez@uniamazonia.edu.co';

const SPECIMENS: SeedSpecimen[] = [
  {
    ref: 'SEED-001', species: 'Euterpe precatoria', commonName: 'Asaí de monte', location: 'Bosque Primario Florencia',
    date: '2023-03-14', collectors: [{ email: MARIA, number: 'MG-004', principal: true }], project: 1,
    venation: 'Paralela', form: 'Lineal', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con fruto', habitat: 'Bosque primario', elevation: [380, 450], adults: 6, juveniles: 11,
    observation: 'Palma solitaria de unos 18 m, racimos con frutos morados maduros.',
    fieldNotes: 'Suelo bien drenado, dosel cerrado.',
  },
  {
    ref: 'SEED-002', species: 'Mauritia flexuosa', commonName: 'Canangucha', location: 'Estación Biológica Leticia',
    date: '2023-06-02', collectors: [{ email: JUAN, number: 'JP-017', principal: true }, { email: MARIA, number: 'MG-011' }], project: 1,
    venation: 'Palmada', form: 'Orbicular', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con fruto', habitat: 'Humedal', elevation: [80, 110], adults: 25, juveniles: 40,
    observation: 'Formación de cananguchal en zona inundable; frutos con escamas rojizas.',
  },
  {
    ref: 'SEED-003', species: 'Cedrela odorata', commonName: 'Cedro', location: 'Reserva Natural El Venado',
    date: '2023-09-21', collectors: [{ email: JUAN, number: 'JP-023', principal: true }], project: 0,
    venation: 'Pinnada', form: 'Lanceolada', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con fruto', habitat: 'Bosque primario', elevation: [350, 420], adults: 2,
    observation: 'Árbol de 25 m, corteza fisurada con olor característico a cedro.',
    fieldNotes: 'Especie con veda; solo se colectó material vegetativo y frutos caídos.',
  },
  {
    ref: 'SEED-004', species: 'Heliconia rostrata', commonName: 'Platanillo colgante', location: 'Jardín Botánico del Piedemonte Amazónico',
    date: '2023-11-08', collectors: [{ email: MARIA, number: 'MG-019', principal: true }],
    venation: 'Paralela', form: 'Elíptica', margin: 'Entero', origin: 'Nativa', originType: 'Cultivado',
    condition: 'Con flor', habitat: 'Jardín', elevation: [300, 320], adults: 12,
    observation: 'Inflorescencia péndula con brácteas rojas de ápice amarillo.',
  },
  {
    ref: 'SEED-005', species: 'Hevea brasiliensis', commonName: 'Caucho', location: 'Vereda San José del Pepino',
    date: '2024-01-19', collectors: [{ email: JUAN, number: 'JP-031', principal: true }], project: 0,
    venation: 'Pinnada', form: 'Elíptica', margin: 'Entero', origin: 'Nativa', originType: 'Cultivado',
    condition: 'Estéril', habitat: 'Cultivo', elevation: [540, 600], adults: 40,
    observation: 'Plantación antigua con marcas de sangrado en el tronco; látex blanco abundante.',
  },
  {
    ref: 'SEED-006', species: 'Inga edulis', commonName: 'Guamo', location: 'Campus Principal Universidad de la Amazonia',
    date: '2024-02-27', collectors: [{ email: ADMIN_EMAIL, number: 'AD-002', principal: true }],
    venation: 'Pinnada', form: 'Elíptica', margin: 'Entero', origin: 'Nativa', originType: 'Cultivado',
    condition: 'Con fruto', habitat: 'Jardín', elevation: [240, 260], adults: 3,
    observation: 'Legumbres largas y acanaladas; pulpa blanca dulce.',
  },
  {
    ref: 'SEED-007', species: 'Cecropia peltata', commonName: 'Yarumo', location: 'Sabanas del Yarí',
    date: '2024-04-10', collectors: [{ email: MARIA, number: 'MG-027', principal: true }, { email: JUAN, number: 'JP-036' }], project: 0,
    venation: 'Palmada', form: 'Orbicular', margin: 'Lobado', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con flor', habitat: 'Rastrojo', elevation: [280, 320], adults: 8, juveniles: 15,
    observation: 'Pionera en claro de bosque; hojas peltadas con envés blanquecino.',
  },
  {
    ref: 'SEED-008', species: 'Euterpe oleracea', commonName: 'Naidí', location: 'Estación Biológica Leticia',
    date: '2024-05-22', collectors: [{ email: JUAN, number: 'JP-040', principal: true }], project: 1,
    venation: 'Paralela', form: 'Lineal', margin: 'Entero', origin: 'Naturalizada', originType: 'Asilvestrado',
    condition: 'Con flor y fruto', habitat: 'Orilla de río', elevation: [85, 100], adults: 14, juveniles: 30,
    observation: 'Palma cespitosa con varios tallos; crece en suelos inundables.',
  },
  {
    ref: 'SEED-009', species: 'Ficus insipida', commonName: 'Higuerón', location: 'Reserva Natural El Venado',
    date: '2024-07-03', collectors: [{ email: MARIA, number: 'MG-033', principal: true }], project: 0,
    venation: 'Pinnada', form: 'Elíptica', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Estéril', habitat: 'Orilla de río', elevation: [360, 380], adults: 1,
    observation: 'Árbol emergente con raíces tablares amplias junto a la quebrada.',
  },
  {
    ref: 'SEED-010', species: 'Handroanthus serratifolius', commonName: 'Guayacán amarillo', location: 'Bosque Primario Florencia',
    date: '2024-08-16', collectors: [{ email: ADMIN_EMAIL, number: 'AD-007', principal: true }, { email: MARIA, number: 'MG-038' }], project: 0,
    venation: 'Pinnada', form: 'Ovada', margin: 'Aserrado', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con flor', habitat: 'Bosque secundario', elevation: [400, 440], adults: 2,
    observation: 'Floración masiva amarilla sin hojas (caducifolio en época seca).',
  },
  {
    ref: 'SEED-011', species: 'Annona muricata', commonName: 'Guanábana', location: 'Campus Principal Universidad de la Amazonia',
    date: '2024-10-01', collectors: [{ email: JUAN, number: 'JP-048', principal: true }],
    venation: 'Pinnada', form: 'Obovada', margin: 'Entero', origin: 'Cultivada', originType: 'Cultivado',
    condition: 'Con fruto', habitat: 'Jardín', elevation: [245, 255], adults: 1,
    observation: 'Fruto verde espinoso de aproximadamente 2 kg.',
  },
  {
    ref: 'SEED-012', species: 'Psidium guajava', commonName: 'Guayaba', location: 'Vereda San José del Pepino',
    date: '2024-12-05', collectors: [{ email: MARIA, number: 'MG-044', principal: true }],
    venation: 'Pinnada', form: 'Elíptica', margin: 'Entero', origin: 'Nativa', originType: 'Asilvestrado',
    condition: 'Con flor y fruto', habitat: 'Borde de carretera', elevation: [560, 590], adults: 5, juveniles: 9,
    observation: 'Corteza lisa que se desprende en láminas; frutos amarillos aromáticos.',
  },
  {
    ref: 'SEED-013', species: 'Musa paradisiaca', commonName: 'Plátano', location: 'Sabanas del Yarí',
    date: '2025-02-11', collectors: [{ email: JUAN, number: 'JP-055', principal: true }],
    venation: 'Paralela', form: 'Elíptica', margin: 'Entero', origin: 'Introducida', originType: 'Cultivado',
    condition: 'Con fruto', habitat: 'Cultivo', elevation: [290, 310], adults: 60,
    observation: 'Cultivo de pancoger asociado a finca ganadera.',
  },
  {
    ref: 'SEED-014', species: 'Heliconia stricta', commonName: 'Platanillo', location: 'Serranía de La Lindosa',
    date: '2025-04-24', collectors: [{ email: MARIA, number: 'MG-052', principal: true }, { email: ADMIN_EMAIL, number: 'AD-011' }],
    venation: 'Paralela', form: 'Lanceolada', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con flor', habitat: 'Bosque secundario', elevation: [230, 260], adults: 9,
    observation: 'Inflorescencia erecta con brácteas rojas; abundante en sotobosque húmedo.',
  },
  {
    ref: 'SEED-015', species: 'Mauritia flexuosa', commonName: 'Moriche', location: 'Serranía de La Lindosa',
    date: '2025-07-09', collectors: [{ email: JUAN, number: 'JP-061', principal: true }], project: 1,
    venation: 'Palmada', form: 'Orbicular', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Estéril', habitat: 'Humedal', elevation: [220, 240], adults: 18,
    observation: 'Morichal asociado a caño de aguas negras.',
  },
  {
    ref: 'SEED-016', species: 'Euterpe precatoria', commonName: 'Asaí', location: 'Vereda San José del Pepino',
    date: '2025-09-30', collectors: [{ email: MARIA, number: 'MG-060', principal: true }], project: 1,
    venation: 'Paralela', form: 'Lineal', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con flor', habitat: 'Bosque primario', elevation: [580, 640], adults: 4, juveniles: 7,
    observation: 'Individuos en ladera con inflorescencias blanquecinas.',
  },
  // Inactivas: solo visibles para ADMINISTRADOR y COLABORADOR
  {
    ref: 'SEED-017', species: 'Cedrela odorata', commonName: 'Cedro rosado', location: 'Jardín Botánico del Piedemonte Amazónico',
    date: '2026-01-15', collectors: [{ email: JUAN, number: 'JP-070', principal: true }], project: 0,
    venation: 'Pinnada', form: 'Lanceolada', margin: 'Entero', origin: 'Nativa', originType: 'Cultivado',
    condition: 'Estéril', habitat: 'Jardín', elevation: [300, 315], adults: 1,
    observation: 'Pendiente de verificar la identificación (posible confusión con Cedrela fissilis).',
    isActive: false,
  },
  {
    ref: 'SEED-018', species: 'Heliconia rostrata', commonName: 'Platanillo', location: 'Sabanas del Yarí',
    date: '2026-02-20', collectors: [{ email: MARIA, number: 'MG-071', principal: true }],
    venation: 'Paralela', form: 'Elíptica', margin: 'Entero', origin: 'Nativa', originType: 'Silvestre',
    condition: 'Con flor', habitat: 'Borde de carretera', elevation: [285, 300], adults: 5,
    observation: 'Registro duplicado de prueba: desactivado.',
    isActive: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Desplazamiento determinista (±0.01°) para que las coordenadas no sean idénticas */
function jitter(seed: string, range = 0.01): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 2000) / 1000 - 1) * range;
}

async function byName<T extends { id: string }>(
  model: { findFirst: (args: { where: { name: string } }) => Promise<T | null> },
  name: string,
  label: string,
): Promise<T> {
  const row = await model.findFirst({ where: { name } });
  if (!row) throw new Error(`No existe ${label} "${name}". ¿Corriste primero el seed base (npm run prisma:seed)?`);
  return row;
}

async function ensureLocations(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const [name, info] of Object.entries(LOCATIONS)) {
    const municipality = await byName(prisma.municipality, info.municipality, 'el municipio');
    let location = await prisma.location.findFirst({ where: { name, municipalityId: municipality.id } });
    if (!location) {
      const locationType = await byName(prisma.locationType, info.type, 'el tipo de ubicación');
      location = await prisma.location.create({
        data: {
          name,
          municipalityId: municipality.id,
          locationTypeId: locationType.id,
          latitude: new Prisma.Decimal(info.lat),
          longitude: new Prisma.Decimal(info.lng),
          altitude: info.alt,
        },
      });
      console.log(`  + Ubicación creada: ${name} (${info.municipality})`);
    }
    ids.set(name, location.id);
  }
  return ids;
}

async function ensureProjects(): Promise<string[]> {
  const ids: string[] = [];
  for (const project of PROJECTS) {
    const protocol = await byName(prisma.protocol, project.protocol, 'el protocolo');
    const row = await prisma.project.upsert({
      where: { name: project.name },
      update: {},
      create: {
        name: project.name,
        code: project.code,
        description: project.description,
        protocolId: protocol.id,
        startDate: new Date(project.startDate),
        endDate: project.endDate ? new Date(project.endDate) : null,
      },
    });
    ids.push(row.id);
  }
  return ids;
}

/**
 * Deja el contador en el mayor número HUAZ existente (corrige huecos si se borraron muestras)
 * y devuelve una función que entrega el siguiente número de catálogo.
 */
async function catalogNumberGenerator(): Promise<() => Promise<string>> {
  const existing = await prisma.specimen.findMany({
    where: { catalogNumber: { startsWith: `${CATALOG_PREFIX}-` } },
    select: { catalogNumber: true },
  });
  const maxUsed = existing.reduce((max, { catalogNumber }) => {
    const n = Number(catalogNumber.slice(CATALOG_PREFIX.length + 1));
    return Number.isInteger(n) ? Math.max(max, n) : max;
  }, 0);

  await prisma.catalogCounter.upsert({
    where: { prefix: CATALOG_PREFIX },
    update: { lastNumber: maxUsed },
    create: { prefix: CATALOG_PREFIX, lastNumber: maxUsed },
  });

  return async () => {
    const counter = await prisma.catalogCounter.update({
      where: { prefix: CATALOG_PREFIX },
      data: { lastNumber: { increment: 1 } },
    });
    return `${CATALOG_PREFIX}-${String(counter.lastNumber).padStart(6, '0')}`;
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌿 Seed de muestras de prueba\n');

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error(`No existe el usuario ${ADMIN_EMAIL}. Corre primero el seed base.`);

  const locationIds = await ensureLocations();
  const projectIds = await ensureProjects();
  const nextCatalogNumber = await catalogNumberGenerator();

  // Catálogos de referencia por nombre
  const lookup = async (model: any, label: string) => {
    const rows: { id: string; name: string }[] = await model.findMany({ select: { id: true, name: true } });
    const map = new Map(rows.map((r) => [r.name, r.id]));
    return (name: string) => {
      const id = map.get(name);
      if (!id) throw new Error(`No existe ${label} "${name}"`);
      return id;
    };
  };
  const venation = await lookup(prisma.venationType, 'el tipo de venación');
  const form = await lookup(prisma.formType, 'el tipo de forma');
  const margin = await lookup(prisma.marginType, 'el tipo de margen');
  const origin = await lookup(prisma.origin, 'el origen');
  const originType = await lookup(prisma.originType, 'el tipo de origen');
  const condition = await lookup(prisma.condition, 'la condición');
  const habitat = await lookup(prisma.habitat, 'el hábitat');

  let created = 0;
  let skipped = 0;

  for (const s of SPECIMENS) {
    const exists = await prisma.specimen.findFirst({ where: { registryNumber: s.ref } });
    if (exists) {
      skipped++;
      continue;
    }

    const [genusName, epithet] = s.species.split(' ');
    const species = await prisma.species.findFirst({
      where: { epithet, genus: { name: genusName } },
    });
    if (!species) throw new Error(`No existe la especie "${s.species}"`);

    const collectors = await Promise.all(
      s.collectors.map(async (c) => {
        const user = await prisma.user.findUnique({ where: { email: c.email } });
        if (!user) throw new Error(`No existe el recolector ${c.email}`);
        return { userId: user.id, collectorNumber: c.number, isPrincipal: !!c.principal };
      }),
    );

    const loc = LOCATIONS[s.location];
    const collectionDate = new Date(`${s.date}T00:00:00.000Z`);

    const specimen = await prisma.specimen.create({
      data: {
        catalogNumber: await nextCatalogNumber(),
        registryNumber: s.ref,
        scientificName: s.species,
        commonName: s.commonName,
        author: species.author,
        speciesId: species.id,
        collectionDate,
        collectionYear: collectionDate.getUTCFullYear(),
        latitude: new Prisma.Decimal((loc.lat + jitter(s.ref)).toFixed(6)),
        longitude: new Prisma.Decimal((loc.lng + jitter(s.ref + 'lng')).toFixed(6)),
        altitude: s.elevation ? Math.round((s.elevation[0] + s.elevation[1]) / 2) : loc.alt,
        minElevation: s.elevation?.[0],
        maxElevation: s.elevation?.[1],
        locationId: locationIds.get(s.location),
        venationTypeId: venation(s.venation),
        formTypeId: form(s.form),
        marginTypeId: margin(s.margin),
        originId: origin(s.origin),
        originTypeId: originType(s.originType),
        conditionId: condition(s.condition),
        habitatId: habitat(s.habitat),
        adultsCount: s.adults,
        juvenilesCount: s.juveniles,
        projectId: s.project !== undefined ? projectIds[s.project] : null,
        localObservation: s.observation,
        fieldNotes: s.fieldNotes,
        isActive: s.isActive ?? true,
        createdById: admin.id,
        updatedById: admin.id,
        collectors: { create: collectors },
      },
    });

    created++;
    console.log(
      `  + ${specimen.catalogNumber}  ${s.species.padEnd(28)} ${s.location}${s.isActive === false ? '  (inactiva)' : ''}`,
    );
  }

  console.log(`\n✅ Listo: ${created} muestras creadas, ${skipped} ya existían.`);
}

main()
  .catch((error) => {
    console.error('❌ Error en el seed de muestras:', error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
