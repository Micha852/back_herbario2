import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data (careful in production!)
  console.log('Cleaning existing data...');
  await prisma.comment.deleteMany();
  await prisma.specimenCollector.deleteMany();
  await prisma.imageMetadata.deleteMany();
  await prisma.specimen.deleteMany();
  await prisma.project.deleteMany();
  await prisma.protocol.deleteMany();
  await prisma.location.deleteMany();
  await prisma.municipality.deleteMany();
  await prisma.department.deleteMany();
  await prisma.species.deleteMany();
  await prisma.genus.deleteMany();
  await prisma.family.deleteMany();
  await prisma.order.deleteMany();
  await prisma.class.deleteMany();
  await prisma.division.deleteMany();
  await prisma.venationType.deleteMany();
  await prisma.formType.deleteMany();
  await prisma.marginType.deleteMany();
  await prisma.habitat.deleteMany();
  await prisma.originType.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.origin.deleteMany();
  await prisma.locationType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.gender.deleteMany();
  await prisma.userType.deleteMany();
  await prisma.institution.deleteMany();

  // ========== ROLES ==========
  console.log('Seeding roles...');
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMINISTRADOR',
      description: 'Full system access',
      permissions: [
        'users.create',
        'users.read',
        'users.update',
        'users.delete',
        'specimens.create',
        'specimens.read',
        'specimens.update',
        'specimens.delete',
        'projects.manage',
        'reports.generate',
        'taxonomy.manage',
      ],
    },
  });

  const collaboratorRole = await prisma.role.create({
    data: {
      name: 'COLABORADOR',
      description: 'Can create and edit specimens',
      permissions: [
        'specimens.create',
        'specimens.read',
        'specimens.update',
        'projects.read',
        'comments.create',
      ],
    },
  });

  const visitorRole = await prisma.role.create({
    data: {
      name: 'VISITANTE',
      description: 'Read-only access',
      permissions: ['specimens.read', 'comments.create'],
    },
  });

  console.log('✅ Roles created');

  // ========== GENDERS ==========
  console.log('Seeding genders...');
  const masculino = await prisma.gender.create({ data: { name: 'Masculino' } });
  const femenino = await prisma.gender.create({ data: { name: 'Femenino' } });
  const otro = await prisma.gender.create({ data: { name: 'Otro' } });
  console.log('✅ Genders created');

  // ========== USER TYPES ==========
  console.log('Seeding user types...');
  const estudiante = await prisma.userType.create({ data: { name: 'Estudiante' } });
  const docente = await prisma.userType.create({ data: { name: 'Docente' } });
  const investigador = await prisma.userType.create({ data: { name: 'Investigador' } });
  await prisma.userType.create({ data: { name: 'Externo' } });
  console.log('✅ User types created');

  // ========== INSTITUTIONS ==========
  console.log('Seeding institutions...');
  const uniamazonia = await prisma.institution.create({
    data: { name: 'Universidad de la Amazonia' },
  });
  await prisma.institution.create({
    data: { name: 'Universidad de Antioquia' },
  });
  const unal = await prisma.institution.create({
    data: { name: 'Universidad Nacional de Colombia' },
  });
  await prisma.institution.create({
    data: { name: 'Institución Externa' },
  });
  console.log('✅ Institutions created');

  // ========== TAXONOMY: DIVISIONS ==========
  console.log('Seeding taxonomy - divisions...');
  await prisma.division.createMany({
    data: [
      { name: 'Magnoliophyta' },
      { name: 'Pinophyta' },
      { name: 'Pteridophyta' },
      { name: 'Bryophyta' },
      { name: 'Marchantiophyta' },
    ],
  });
  console.log('✅ Divisions created');

  // ========== TAXONOMY: CLASSES ==========
  console.log('Seeding taxonomy - classes...');
  await prisma.class.createMany({
    data: [
      { name: 'Magnoliopsida' },
      { name: 'Liliopsida' },
      { name: 'Polypodiopsida' },
      { name: 'Pinopsida' },
    ],
  });
  console.log('✅ Classes created');

  // ========== TAXONOMY: ORDERS ==========
  console.log('Seeding taxonomy - orders...');
  await prisma.order.createMany({
    data: [
      { name: 'Fabales' },
      { name: 'Myrtales' },
      { name: 'Lamiales' },
      { name: 'Asterales' },
      { name: 'Rosales' },
      { name: 'Malpighiales' },
      { name: 'Sapindales' },
      { name: 'Laurales' },
      { name: 'Magnoliales' },
      { name: 'Poales' },
      { name: 'Arecales' },
      { name: 'Zingiberales' },
      { name: 'Polypodiales' },
    ],
  });
  console.log('✅ Orders created');

  // ========== TAXONOMY: FAMILIES ==========
  console.log('Seeding taxonomy - families...');
  await prisma.family.createMany({
    data: [
      { name: 'Fabaceae' },
      { name: 'Myrtaceae' },
      { name: 'Melastomataceae' },
      { name: 'Bignoniaceae' },
      { name: 'Lamiaceae' },
      { name: 'Asteraceae' },
      { name: 'Moraceae' },
      { name: 'Urticaceae' },
      { name: 'Euphorbiaceae' },
      { name: 'Clusiaceae' },
      { name: 'Meliaceae' },
      { name: 'Anacardiaceae' },
      { name: 'Lauraceae' },
      { name: 'Annonaceae' },
      { name: 'Poaceae' },
      { name: 'Arecaceae' },
      { name: 'Musaceae' },
      { name: 'Heliconiaceae' },
      { name: 'Polypodiaceae' },
    ],
  });
  console.log('✅ Families created');

  // ========== TAXONOMY: GENERA ==========
  console.log('Seeding taxonomy - genera...');
  await prisma.genus.createMany({
    data: [
      { name: 'Inga' },
      { name: 'Acacia' },
      { name: 'Psidium' },
      { name: 'Eugenia' },
      { name: 'Miconia' },
      { name: 'Tabebuia' },
      { name: 'Handroanthus' },
      { name: 'Ocimum' },
      { name: 'Ficus' },
      { name: 'Cecropia' },
      { name: 'Croton' },
      { name: 'Hevea' },
      { name: 'Clusia' },
      { name: 'Cedrela' },
      { name: 'Swietenia' },
      { name: 'Mangifera' },
      { name: 'Ocotea' },
      { name: 'Persea' },
      { name: 'Annona' },
      { name: 'Bambusa' },
      { name: 'Oryza' },
      { name: 'Euterpe' },
      { name: 'Mauritia' },
      { name: 'Musa' },
      { name: 'Heliconia' },
    ],
  });
  console.log('✅ Genera created');

  // ========== TAXONOMY: SPECIES ==========
  console.log('Seeding taxonomy - species...');
  await prisma.species.createMany({
    data: [
      { name: 'edulis' },
      { name: 'vera' },
      { name: 'guajava' },
      { name: 'stipitata' },
      { name: 'rosea' },
      { name: 'chrysantha' },
      { name: 'serratus' },
      { name: 'basilicum' },
      { name: 'insipida' },
      { name: 'obtusifolia' },
      { name: 'peltata' },
      { name: 'sciadophylla' },
      { name: 'lechleri' },
      { name: 'brasiliensis' },
      { name: 'odorata' },
      { name: 'macrophylla' },
      { name: 'indica' },
      { name: 'quixos' },
      { name: 'americana' },
      { name: 'muricata' },
      { name: 'cherimola' },
      { name: 'vulgaris' },
      { name: 'sativa' },
      { name: 'precatoria' },
      { name: 'oleracea' },
      { name: 'flexuosa' },
      { name: 'paradisiaca' },
      { name: 'rostrata' },
      { name: 'stricta' },
    ],
  });
  console.log('✅ Species created');

  // ========== LEAF CHARACTERISTICS ==========
  console.log('Seeding leaf characteristics...');

  // Venation Types
  await prisma.venationType.createMany({
    data: [
      { name: 'Pinnada' },
      { name: 'Palmada' },
      { name: 'Paralela' },
      { name: 'Reticulada' },
      { name: 'Dicotómica' },
    ],
  });

  // Form Types
  await prisma.formType.createMany({
    data: [
      { name: 'Lanceolada' },
      { name: 'Ovada' },
      { name: 'Obovada' },
      { name: 'Elíptica' },
      { name: 'Cordada' },
      { name: 'Lineal' },
      { name: 'Orbicular' },
      { name: 'Espatulada' },
      { name: 'Sagitada' },
      { name: 'Deltoidea' },
    ],
  });

  // Margin Types
  await prisma.marginType.createMany({
    data: [
      { name: 'Entero' },
      { name: 'Aserrado' },
      { name: 'Dentado' },
      { name: 'Crenado' },
      { name: 'Lobado' },
      { name: 'Ondulado' },
      { name: 'Espinoso' },
    ],
  });

  console.log('✅ Leaf characteristics created');

  // ========== REFERENCE DATA ==========
  console.log('Seeding reference data...');

  // Origins
  await prisma.origin.createMany({
    data: [
      { name: 'Nativa' },
      { name: 'Introducida' },
      { name: 'Endémica' },
      { name: 'Cultivada' },
      { name: 'Naturalizada' },
    ],
  });

  // Origin Types
  await prisma.originType.createMany({
    data: [
      { name: 'Silvestre' },
      { name: 'Cultivado' },
      { name: 'Asilvestrado' },
    ],
  });

  // Conditions
  await prisma.condition.createMany({
    data: [
      { name: 'Fértil' },
      { name: 'Estéril' },
      { name: 'Con flor' },
      { name: 'Con fruto' },
      { name: 'Con flor y fruto' },
    ],
  });

  // Habitats
  await prisma.habitat.createMany({
    data: [
      { name: 'Bosque primario' },
      { name: 'Bosque secundario' },
      { name: 'Rastrojo' },
      { name: 'Orilla de río' },
      { name: 'Pastizal' },
      { name: 'Humedal' },
      { name: 'Cultivo' },
      { name: 'Jardín' },
      { name: 'Borde de carretera' },
    ],
  });

  console.log('✅ Reference data created');

  // ========== LOCATIONS ==========
  console.log('Seeding locations...');

  // Location Types
  const bosque = await prisma.locationType.create({ data: { name: 'Bosque' } });
  const jardin = await prisma.locationType.create({ data: { name: 'Jardín Botánico' } });
  const reserva = await prisma.locationType.create({ data: { name: 'Reserva Natural' } });
  const campus = await prisma.locationType.create({ data: { name: 'Campus Universitario' } });
  await prisma.locationType.create({ data: { name: 'Finca' } });

  // Departments (Colombian Amazonia and nearby)
  const caqueta = await prisma.department.create({ data: { name: 'Caquetá' } });
  const putumayo = await prisma.department.create({ data: { name: 'Putumayo' } });
  const amazonas = await prisma.department.create({ data: { name: 'Amazonas' } });
  const guaviare = await prisma.department.create({ data: { name: 'Guaviare' } });
  const vaupes = await prisma.department.create({ data: { name: 'Vaupés' } });
  const huila = await prisma.department.create({ data: { name: 'Huila' } });
  const meta = await prisma.department.create({ data: { name: 'Meta' } });

  // Municipalities
  const florencia = await prisma.municipality.create({ data: { name: 'Florencia', departmentId: caqueta.id } });
  const belen = await prisma.municipality.create({ data: { name: 'Belén de los Andaquíes', departmentId: caqueta.id } });
  await prisma.municipality.create({ data: { name: 'San Vicente del Caguán', departmentId: caqueta.id } });
  await prisma.municipality.create({ data: { name: 'Mocoa', departmentId: putumayo.id } });
  const leticia = await prisma.municipality.create({ data: { name: 'Leticia', departmentId: amazonas.id } });
  await prisma.municipality.create({ data: { name: 'San José del Guaviare', departmentId: guaviare.id } });
  await prisma.municipality.create({ data: { name: 'Mitú', departmentId: vaupes.id } });
  await prisma.municipality.create({ data: { name: 'Neiva', departmentId: huila.id } });
  await prisma.municipality.create({ data: { name: 'Villavicencio', departmentId: meta.id } });

  // Specific Locations
  await prisma.location.create({
    data: {
      name: 'Campus Principal Universidad de la Amazonia',
      municipalityId: florencia.id,
      locationTypeId: campus.id,
    },
  });

  await prisma.location.create({
    data: {
      name: 'Jardín Botánico del Piedemonte Amazónico',
      municipalityId: florencia.id,
      locationTypeId: jardin.id,
    },
  });

  await prisma.location.create({
    data: {
      name: 'Reserva Natural El Venado',
      municipalityId: belen.id,
      locationTypeId: reserva.id,
    },
  });

  await prisma.location.create({
    data: {
      name: 'Estación Biológica Leticia',
      municipalityId: leticia.id,
      locationTypeId: reserva.id,
    },
  });

  await prisma.location.create({
    data: {
      name: 'Bosque Primario Florencia',
      municipalityId: florencia.id,
      locationTypeId: bosque.id,
    },
  });

  console.log('✅ Locations created');

  // ========== PROTOCOLS ==========
  console.log('Seeding protocols...');
  await prisma.protocol.createMany({
    data: [
      { name: 'Colección General' },
      { name: 'Colección de Helechos' },
      { name: 'Colección de Palmas' },
      { name: 'Colección Rápida de Campo' },
      { name: 'Inventario Florístico' },
    ],
  });
  console.log('✅ Protocols created');

  // ========== USERS ==========
  console.log('Creating users...');
  const adminPassword = await bcrypt.hash('Admin123', 10);
  const collabPassword = await bcrypt.hash('Collab123', 10);
  const visitPassword = await bcrypt.hash('Visit123', 10);

  await prisma.user.create({
    data: {
      name: 'Administrador Sistema',
      email: 'admin@uniamazonia.edu.co',
      password: adminPassword,
      roleId: adminRole.id,
      genderId: otro.id,
      typeId: docente.id,
      institutionId: uniamazonia.id,
      isCollector: true,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'María García',
      email: 'maria.garcia@uniamazonia.edu.co',
      password: collabPassword,
      roleId: collaboratorRole.id,
      genderId: femenino.id,
      typeId: investigador.id,
      institutionId: uniamazonia.id,
      isCollector: true,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Juan Pérez',
      email: 'juan.perez@uniamazonia.edu.co',
      password: collabPassword,
      roleId: collaboratorRole.id,
      genderId: masculino.id,
      typeId: estudiante.id,
      institutionId: uniamazonia.id,
      isCollector: true,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@unal.edu.co',
      password: visitPassword,
      roleId: visitorRole.id,
      genderId: masculino.id,
      typeId: investigador.id,
      institutionId: unal.id,
      isCollector: false,
      isActive: true,
    },
  });

  console.log('✅ Users created');
  console.log('   Admin: admin@uniamazonia.edu.co / Admin123');
  console.log('   Collaborator: maria.garcia@uniamazonia.edu.co / Collab123');
  console.log('   Collaborator: juan.perez@uniamazonia.edu.co / Collab123');
  console.log('   Visitor: carlos.rodriguez@unal.edu.co / Visit123');

  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
