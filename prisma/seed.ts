import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data (careful!)
  console.log('Cleaning existing data...');
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.gender.deleteMany();
  await prisma.userType.deleteMany();
  await prisma.institution.deleteMany();

  // Seed Roles
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

  // Seed Genders
  console.log('Seeding genders...');
  const masculino = await prisma.gender.create({
    data: { name: 'Masculino' },
  });

  const femenino = await prisma.gender.create({
    data: { name: 'Femenino' },
  });

  const otro = await prisma.gender.create({
    data: { name: 'Otro' },
  });

  console.log('✅ Genders created');

  // Seed User Types
  console.log('Seeding user types...');
  const estudiante = await prisma.userType.create({
    data: { name: 'Estudiante' },
  });

  const docente = await prisma.userType.create({
    data: { name: 'Docente' },
  });

  const investigador = await prisma.userType.create({
    data: { name: 'Investigador' },
  });

  const externo = await prisma.userType.create({
    data: { name: 'Externo' },
  });

  console.log('✅ User types created');

  // Seed Institutions
  console.log('Seeding institutions...');
  const uniamazonia = await prisma.institution.create({
    data: { name: 'Universidad de la Amazonia' },
  });

  const externa = await prisma.institution.create({
    data: { name: 'Institución Externa' },
  });

  console.log('✅ Institutions created');

  // Create admin user
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin123', 10);
  const adminUser = await prisma.user.create({
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

  console.log('✅ Admin user created');
  console.log('   Email: admin@uniamazonia.edu.co');
  console.log('   Password: Admin123');

  // Create sample collaborator
  console.log('Creating sample collaborator...');
  const collabPassword = await bcrypt.hash('Collab123', 10);
  await prisma.user.create({
    data: {
      name: 'Juan Pérez',
      email: 'juan.perez@uniamazonia.edu.co',
      password: collabPassword,
      roleId: collaboratorRole.id,
      genderId: masculino.id,
      typeId: investigador.id,
      institutionId: uniamazonia.id,
      isCollector: true,
      isActive: true,
    },
  });

  console.log('✅ Sample collaborator created');

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
