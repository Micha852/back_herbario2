import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSystemInfo() {
    console.log('🌱 Seeding SystemInfo...');

    // Historia
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

    // Datos
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

    // Contacto
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

    // Términos
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

    console.log('✅ SystemInfo seeded successfully!');
}

seedSystemInfo()
    .catch((e) => {
        console.error('❌ Error seeding SystemInfo:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
