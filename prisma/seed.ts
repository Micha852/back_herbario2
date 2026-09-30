import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seguro: este seed BORRA TODA LA BASE. Si ya hay datos, exige --reset explícito.
  // (prisma migrate reset ya vacía la base antes de llamarlo, así que ahí no se detiene)
  const [users, specimens] = await Promise.all([prisma.user.count(), prisma.specimen.count()]);
  if ((users > 0 || specimens > 0) && !process.argv.includes('--reset')) {
    console.error(
      `\n⛔ La base ya tiene datos (${users} usuarios, ${specimens} muestras) y este seed BORRA TODO.\n` +
        '   Si de verdad quieres empezar de cero: npm run prisma:seed -- --reset\n' +
        '   Para solo agregar muestras de prueba: npm run prisma:seed:specimens\n',
    );
    process.exitCode = 1;
    return;
  }

  // Clean existing data (careful in production!)
  console.log('Cleaning existing data...');
  await prisma.comment.deleteMany();
  await prisma.specimenCollector.deleteMany();
  await prisma.specimenImage.deleteMany();
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
  await prisma.catalogCounter.deleteMany();
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

  // ========== CATALOG COUNTER ==========
  console.log('Seeding catalog counter...');
  await prisma.catalogCounter.create({
    data: {
      prefix: 'HUAZ',
      lastNumber: 0,
    },
  });
  console.log('✅ Catalog counter created');

  // ========== TAXONOMY: HIERARCHICAL STRUCTURE ==========
  console.log('Seeding taxonomy with hierarchical structure...');

  // DIVISIONS (highest rank)
  const magnoliophyta = await prisma.division.create({
    data: { name: 'Magnoliophyta', description: 'Plantas con flores (angiospermas)' },
  });
  const pinophyta = await prisma.division.create({
    data: { name: 'Pinophyta', description: 'Coníferas' },
  });
  const pteridophyta = await prisma.division.create({
    data: { name: 'Pteridophyta', description: 'Helechos' },
  });
  await prisma.division.create({
    data: { name: 'Bryophyta', description: 'Musgos' },
  });

  // CLASSES (linked to divisions)
  const magnoliopsida = await prisma.class.create({
    data: {
      name: 'Magnoliopsida',
      description: 'Dicotiledóneas',
      divisionId: magnoliophyta.id,
    },
  });
  const liliopsida = await prisma.class.create({
    data: {
      name: 'Liliopsida',
      description: 'Monocotiledóneas',
      divisionId: magnoliophyta.id,
    },
  });
  const polypodiopsida = await prisma.class.create({
    data: {
      name: 'Polypodiopsida',
      description: 'Helechos leptosporangiados',
      divisionId: pteridophyta.id,
    },
  });
  await prisma.class.create({
    data: {
      name: 'Pinopsida',
      description: 'Coníferas',
      divisionId: pinophyta.id,
    },
  });

  // ORDERS (linked to classes)
  const fabales = await prisma.order.create({
    data: { name: 'Fabales', classId: magnoliopsida.id },
  });
  const myrtales = await prisma.order.create({
    data: { name: 'Myrtales', classId: magnoliopsida.id },
  });
  const lamiales = await prisma.order.create({
    data: { name: 'Lamiales', classId: magnoliopsida.id },
  });
  const asterales = await prisma.order.create({
    data: { name: 'Asterales', classId: magnoliopsida.id },
  });
  const rosales = await prisma.order.create({
    data: { name: 'Rosales', classId: magnoliopsida.id },
  });
  const malpighiales = await prisma.order.create({
    data: { name: 'Malpighiales', classId: magnoliopsida.id },
  });
  const sapindales = await prisma.order.create({
    data: { name: 'Sapindales', classId: magnoliopsida.id },
  });
  const laurales = await prisma.order.create({
    data: { name: 'Laurales', classId: magnoliopsida.id },
  });
  const magnoliales = await prisma.order.create({
    data: { name: 'Magnoliales', classId: magnoliopsida.id },
  });
  const poales = await prisma.order.create({
    data: { name: 'Poales', classId: liliopsida.id },
  });
  const arecales = await prisma.order.create({
    data: { name: 'Arecales', classId: liliopsida.id },
  });
  const zingiberales = await prisma.order.create({
    data: { name: 'Zingiberales', classId: liliopsida.id },
  });
  const polypodiales = await prisma.order.create({
    data: { name: 'Polypodiales', classId: polypodiopsida.id },
  });

  // FAMILIES (linked to orders)
  const fabaceae = await prisma.family.create({
    data: { name: 'Fabaceae', orderId: fabales.id },
  });
  const myrtaceae = await prisma.family.create({
    data: { name: 'Myrtaceae', orderId: myrtales.id },
  });
  const melastomataceae = await prisma.family.create({
    data: { name: 'Melastomataceae', orderId: myrtales.id },
  });
  const bignoniaceae = await prisma.family.create({
    data: { name: 'Bignoniaceae', orderId: lamiales.id },
  });
  const lamiaceae = await prisma.family.create({
    data: { name: 'Lamiaceae', orderId: lamiales.id },
  });
  const asteraceae = await prisma.family.create({
    data: { name: 'Asteraceae', orderId: asterales.id },
  });
  const moraceae = await prisma.family.create({
    data: { name: 'Moraceae', orderId: rosales.id },
  });
  const urticaceae = await prisma.family.create({
    data: { name: 'Urticaceae', orderId: rosales.id },
  });
  const euphorbiaceae = await prisma.family.create({
    data: { name: 'Euphorbiaceae', orderId: malpighiales.id },
  });
  const clusiaceae = await prisma.family.create({
    data: { name: 'Clusiaceae', orderId: malpighiales.id },
  });
  const meliaceae = await prisma.family.create({
    data: { name: 'Meliaceae', orderId: sapindales.id },
  });
  const anacardiaceae = await prisma.family.create({
    data: { name: 'Anacardiaceae', orderId: sapindales.id },
  });
  const lauraceae = await prisma.family.create({
    data: { name: 'Lauraceae', orderId: laurales.id },
  });
  const annonaceae = await prisma.family.create({
    data: { name: 'Annonaceae', orderId: magnoliales.id },
  });
  const poaceae = await prisma.family.create({
    data: { name: 'Poaceae', orderId: poales.id },
  });
  const arecaceae = await prisma.family.create({
    data: { name: 'Arecaceae', orderId: arecales.id },
  });
  const musaceae = await prisma.family.create({
    data: { name: 'Musaceae', orderId: zingiberales.id },
  });
  const heliconiaceae = await prisma.family.create({
    data: { name: 'Heliconiaceae', orderId: zingiberales.id },
  });
  const polypodiaceae = await prisma.family.create({
    data: { name: 'Polypodiaceae', orderId: polypodiales.id },
  });

  // GENERA (linked to families) - Common Amazonian genera
  const inga = await prisma.genus.create({
    data: { name: 'Inga', familyId: fabaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Acacia', familyId: fabaceae.id },
  });
  const psidium = await prisma.genus.create({
    data: { name: 'Psidium', familyId: myrtaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Eugenia', familyId: myrtaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Miconia', familyId: melastomataceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Tabebuia', familyId: bignoniaceae.id },
  });
  const handroanthus = await prisma.genus.create({
    data: { name: 'Handroanthus', familyId: bignoniaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Ocimum', familyId: lamiaceae.id },
  });
  const ficus = await prisma.genus.create({
    data: { name: 'Ficus', familyId: moraceae.id },
  });
  const cecropia = await prisma.genus.create({
    data: { name: 'Cecropia', familyId: urticaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Croton', familyId: euphorbiaceae.id },
  });
  const hevea = await prisma.genus.create({
    data: { name: 'Hevea', familyId: euphorbiaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Clusia', familyId: clusiaceae.id },
  });
  const cedrela = await prisma.genus.create({
    data: { name: 'Cedrela', familyId: meliaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Swietenia', familyId: meliaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Mangifera', familyId: anacardiaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Ocotea', familyId: lauraceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Persea', familyId: lauraceae.id },
  });
  const annona = await prisma.genus.create({
    data: { name: 'Annona', familyId: annonaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Bambusa', familyId: poaceae.id },
  });
  await prisma.genus.create({
    data: { name: 'Oryza', familyId: poaceae.id },
  });
  const euterpe = await prisma.genus.create({
    data: { name: 'Euterpe', familyId: arecaceae.id },
  });
  const mauritia = await prisma.genus.create({
    data: { name: 'Mauritia', familyId: arecaceae.id },
  });
  const musa = await prisma.genus.create({
    data: { name: 'Musa', familyId: musaceae.id },
  });
  const heliconia = await prisma.genus.create({
    data: { name: 'Heliconia', familyId: heliconiaceae.id },
  });

  // SPECIES (linked to genera) - Common Amazonian species
  // epithet = specific epithet only (e.g., "muricata" for Annona muricata)
  await prisma.species.create({
    data: { epithet: 'edulis', genusId: inga.id, author: 'Mart.', fullName: 'Inga edulis Mart.' },
  });
  await prisma.species.create({
    data: { epithet: 'guajava', genusId: psidium.id, author: 'L.', fullName: 'Psidium guajava L.' },
  });
  await prisma.species.create({
    data: { epithet: 'serratifolius', genusId: handroanthus.id, author: '(Vahl) S.Grose', fullName: 'Handroanthus serratifolius (Vahl) S.Grose' },
  });
  await prisma.species.create({
    data: { epithet: 'insipida', genusId: ficus.id, author: 'Willd.', fullName: 'Ficus insipida Willd.' },
  });
  await prisma.species.create({
    data: { epithet: 'peltata', genusId: cecropia.id, author: 'L.', fullName: 'Cecropia peltata L.' },
  });
  await prisma.species.create({
    data: { epithet: 'brasiliensis', genusId: hevea.id, author: '(Willd. ex A.Juss.) Müll.Arg.', fullName: 'Hevea brasiliensis (Willd. ex A.Juss.) Müll.Arg.' },
  });
  await prisma.species.create({
    data: { epithet: 'odorata', genusId: cedrela.id, author: 'L.', fullName: 'Cedrela odorata L.' },
  });
  await prisma.species.create({
    data: { epithet: 'muricata', genusId: annona.id, author: 'L.', fullName: 'Annona muricata L.' },
  });
  await prisma.species.create({
    data: { epithet: 'precatoria', genusId: euterpe.id, author: 'Mart.', fullName: 'Euterpe precatoria Mart.' },
  });
  await prisma.species.create({
    data: { epithet: 'oleracea', genusId: euterpe.id, author: 'Mart.', fullName: 'Euterpe oleracea Mart.' },
  });
  await prisma.species.create({
    data: { epithet: 'flexuosa', genusId: mauritia.id, author: 'L.f.', fullName: 'Mauritia flexuosa L.f.' },
  });
  await prisma.species.create({
    data: { epithet: 'paradisiaca', genusId: musa.id, author: 'L.', fullName: 'Musa paradisiaca L.' },
  });
  await prisma.species.create({
    data: { epithet: 'rostrata', genusId: heliconia.id, author: 'Ruiz & Pav.', fullName: 'Heliconia rostrata Ruiz & Pav.' },
  });
  await prisma.species.create({
    data: { epithet: 'stricta', genusId: heliconia.id, author: 'Huber', fullName: 'Heliconia stricta Huber' },
  });

  console.log('✅ Hierarchical taxonomy created');

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

  // ========== SYSTEM INFO (CMS) ==========
  console.log('Seeding SystemInfo (CMS)...');

  await prisma.systemInfo.upsert({
    where: { key: 'historia' },
    update: {},
    create: {
      key: 'historia',
      title: 'Historia del Herbario',
      content: JSON.stringify({
        introduccion:
          'El Herbario Digital de la Universidad de la Amazonía nace con el propósito de preservar y difundir el conocimiento sobre la diversidad botánica de la región amazónica colombiana.',
        mision:
          'Contribuir a la conservación de la biodiversidad amazónica mediante la documentación, investigación y divulgación del patrimonio botánico regional, facilitando el acceso al conocimiento científico a estudiantes, investigadores y comunidad en general.',
        vision:
          'Ser reconocidos como un referente nacional e internacional en la investigación y conservación de la flora amazónica, promoviendo el desarrollo sostenible y la valoración del conocimiento tradicional asociado a las plantas.',
        objetivos: [
          'Documentar y preservar especímenes botánicos de la región amazónica',
          'Facilitar el acceso a información científica sobre la flora regional',
          'Promover la investigación botánica y la conservación de la biodiversidad',
          'Apoyar la formación académica en ciencias naturales y afines',
        ],
        historia:
          'Fundado en el año 2020, el Herbario Digital representa un esfuerzo conjunto de investigadores, estudiantes y la comunidad académica de la Universidad de la Amazonía por preservar el patrimonio botánico de la región.',
        importancia:
          'La Amazonía colombiana representa uno de los ecosistemas más biodiversos del planeta. El departamento de Caquetá, donde se ubica nuestra institución, es hogar de miles de especies vegetales, muchas de ellas aún sin describir por la ciencia.',
      }),
      isActive: true,
    },
  });

  await prisma.systemInfo.upsert({
    where: { key: 'datos' },
    update: {},
    create: {
      key: 'datos',
      title: 'Datos y Estadísticas',
      content: JSON.stringify({
        estadisticas: {
          muestras: 150,
          familias: 45,
          municipios: 12,
        },
        cobertura: {
          titulo: 'Áreas de Cobertura',
          descripcion:
            'Nuestras colecciones provienen principalmente del departamento de Caquetá, incluyendo municipios como Florencia, San Vicente del Caguán, Puerto Rico, Belén de los Andaquíes, entre otros.',
        },
        especimenes: {
          titulo: 'Tipos de Especímenes',
          descripcion:
            'La colección incluye principalmente especies de bosque húmedo tropical, con énfasis en árboles, arbustos y plantas de importancia ecológica y cultural para la región.',
        },
        actualizacion: {
          titulo: 'Actualización',
          descripcion:
            'La base de datos se actualiza constantemente con nuevos especímenes recolectados durante expediciones científicas y trabajo de campo de estudiantes e investigadores.',
        },
        acceso: {
          titulo: 'Acceso a la Información',
          descripcion:
            'Toda la información contenida en este herbario digital es de acceso público y gratuito, promoviendo la democratización del conocimiento científico sobre nuestra biodiversidad.',
        },
      }),
      isActive: true,
    },
  });

  await prisma.systemInfo.upsert({
    where: { key: 'contacto' },
    update: {},
    create: {
      key: 'contacto',
      title: 'Información de Contacto',
      content: JSON.stringify({
        institucion: 'Universidad de la Amazonía',
        direccion:
          'Calle 17 Diagonal 17 con Carrera 3F Barrio Porvenir, Florencia, Caquetá, Colombia',
        email: 'herbario@uniamazonia.edu.co',
        telefono: '(+57) 8 436 4485',
        sitioWeb: 'https://www.uniamazonia.edu.co',
        horarios: {
          lunesViernes: '8:00 AM - 12:00 PM / 2:00 PM - 6:00 PM',
          finDeSemana: 'Cerrado',
          nota: '* Para visitas al herbario físico, se recomienda agendar cita previa',
        },
        redesSociales: {
          facebook: 'https://www.facebook.com/uniamazonia',
          instagram: 'https://www.instagram.com/uniamazonia',
        },
      }),
      isActive: true,
    },
  });

  await prisma.systemInfo.upsert({
    where: { key: 'terminos' },
    update: {},
    create: {
      key: 'terminos',
      title: 'Términos y Condiciones',
      content: JSON.stringify({
        ultimaActualizacion: 'Enero 2024',
        secciones: [
          {
            titulo: 'Aceptación de los Términos',
            contenido:
              'Al acceder y utilizar el Herbario Digital de la Universidad de la Amazonía, usted acepta cumplir con estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar este servicio.',
          },
          {
            titulo: 'Uso de la Información',
            contenido:
              'La información contenida en este herbario digital es proporcionada con fines educativos y de investigación. Los usuarios pueden:',
            items: [
              'Consultar libremente la información de las muestras botánicas',
              'Descargar información para uso académico y de investigación',
              'Citar el herbario en publicaciones científicas con la debida atribución',
            ],
          },
          {
            titulo: 'Restricciones de Uso',
            contenido: 'Los usuarios NO pueden:',
            items: [
              'Usar la información con fines comerciales sin autorización previa',
              'Modificar o alterar la información sin consentimiento',
              'Redistribuir la base de datos completa sin permiso',
              'Realizar actividades que comprometan la integridad del sistema',
            ],
          },
          {
            titulo: 'Propiedad Intelectual',
            contenido:
              'Todo el contenido del Herbario Digital, incluyendo imágenes, textos, datos taxonómicos y diseño, son propiedad de la Universidad de la Amazonía o sus colaboradores, y están protegidos por las leyes de propiedad intelectual colombianas e internacionales.',
          },
          {
            titulo: 'Citación y Atribución',
            contenido:
              'Al utilizar información del herbario en publicaciones o investigaciones, se debe citar de la siguiente manera:',
            citacion:
              'Herbario Digital UDLA. Universidad de la Amazonía. Florencia, Caquetá, Colombia. [Fecha de consulta]. Disponible en: [URL]',
          },
          {
            titulo: 'Contacto',
            contenido:
              'Para preguntas sobre estos términos y condiciones, por favor contacte a:',
            contacto: {
              email: 'herbario@uniamazonia.edu.co',
              institucion: 'Universidad de la Amazonía',
              ubicacion: 'Florencia, Caquetá, Colombia',
            },
          },
        ],
      }),
      isActive: true,
    },
  });

  console.log('✅ SystemInfo (CMS) created');

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
