-- ============================================
-- SEED: Datos iniciales para HDUA 2.0
-- ============================================

-- ============================================
-- 1. ROLES
-- ============================================
INSERT INTO roles (id, name, description, permissions, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0001-000000000001', 'Administrador', 'Control total del sistema', ARRAY['all'], true, NOW(), NOW()),
('00000000-0000-0000-0001-000000000002', 'Colaborador', 'Puede crear y editar muestras', ARRAY['create_specimen', 'edit_specimen', 'comment'], true, NOW(), NOW()),
('00000000-0000-0000-0001-000000000003', 'Visitante', 'Solo puede consultar información', ARRAY['view_specimen', 'comment'], true, NOW(), NOW());

-- ============================================
-- 2. GÉNEROS
-- ============================================
INSERT INTO genders (id, name, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0002-000000000001', 'Masculino', true, NOW(), NOW()),
('00000000-0000-0000-0002-000000000002', 'Femenino', true, NOW(), NOW()),
('00000000-0000-0000-0002-000000000003', 'Otro', true, NOW(), NOW()),
('00000000-0000-0000-0002-000000000004', 'Prefiero no decir', true, NOW(), NOW());

-- ============================================
-- 3. TIPOS DE USUARIO
-- ============================================
INSERT INTO user_types (id, name, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0003-000000000001', 'Estudiante', true, NOW(), NOW()),
('00000000-0000-0000-0003-000000000002', 'Docente', true, NOW(), NOW()),
('00000000-0000-0000-0003-000000000003', 'Investigador', true, NOW(), NOW()),
('00000000-0000-0000-0003-000000000004', 'Público General', true, NOW(), NOW());

-- ============================================
-- 4. INSTITUCIONES
-- ============================================
INSERT INTO institutions (id, name, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0004-000000000001', 'Universidad de la Amazonía', true, NOW(), NOW()),
('00000000-0000-0000-0004-000000000002', 'Universidad Nacional de Colombia', true, NOW(), NOW()),
('00000000-0000-0000-0004-000000000003', 'Instituto Sinchi', true, NOW(), NOW());

-- ============================================
-- 5. JERARQUÍA TAXONÓMICA
-- ============================================

-- Divisiones
INSERT INTO divisions (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0005-000000000001', 'Magnoliophyta', 'Plantas con flores (Angiospermas)', true, NOW(), NOW()),
('00000000-0000-0000-0005-000000000002', 'Pteridophyta', 'Helechos y afines', true, NOW(), NOW());

-- Clases (con foreign key a División)
INSERT INTO classes (id, name, description, "divisionId", "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0006-000000000001', 'Magnoliopsida', 'Dicotiledóneas', '00000000-0000-0000-0005-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0006-000000000002', 'Liliopsida', 'Monocotiledóneas', '00000000-0000-0000-0005-000000000001', true, NOW(), NOW());

-- Órdenes (con foreign key a Clase)
INSERT INTO orders (id, name, description, "classId", "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0007-000000000001', 'Rosales', 'Orden Rosales', '00000000-0000-0000-0006-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0007-000000000002', 'Fabales', 'Orden Fabales', '00000000-0000-0000-0006-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0007-000000000003', 'Malvales', 'Orden Malvales', '00000000-0000-0000-0006-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0007-000000000004', 'Laurales', 'Orden Laurales', '00000000-0000-0000-0006-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0007-000000000005', 'Gentianales', 'Orden Gentianales', '00000000-0000-0000-0006-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0007-000000000006', 'Arecales', 'Orden Arecales (Palmeras)', '00000000-0000-0000-0006-000000000002', true, NOW(), NOW());

-- Familias (con foreign key a Orden)
INSERT INTO families (id, name, description, "orderId", "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0008-000000000001', 'Urticaceae', 'Familia de las ortigas y yarumos', '00000000-0000-0000-0007-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0008-000000000002', 'Moraceae', 'Familia de las moras y cauchos', '00000000-0000-0000-0007-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0008-000000000003', 'Fabaceae', 'Familia de las leguminosas', '00000000-0000-0000-0007-000000000002', true, NOW(), NOW()),
('00000000-0000-0000-0008-000000000004', 'Malvaceae', 'Familia del cacao y ceiba', '00000000-0000-0000-0007-000000000003', true, NOW(), NOW()),
('00000000-0000-0000-0008-000000000005', 'Lauraceae', 'Familia del aguacate y laureles', '00000000-0000-0000-0007-000000000004', true, NOW(), NOW()),
('00000000-0000-0000-0008-000000000006', 'Arecaceae', 'Familia de las palmeras', '00000000-0000-0000-0007-000000000006', true, NOW(), NOW()),
('00000000-0000-0000-0008-000000000007', 'Rubiaceae', 'Familia del café', '00000000-0000-0000-0007-000000000005', true, NOW(), NOW());

-- Géneros (con foreign key a Familia)
INSERT INTO genera (id, name, author, description, "familyId", "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0009-000000000001', 'Cecropia', 'Loefl.', 'Yarumos', '00000000-0000-0000-0008-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0009-000000000002', 'Inga', 'Mill.', 'Guamos', '00000000-0000-0000-0008-000000000003', true, NOW(), NOW()),
('00000000-0000-0000-0009-000000000003', 'Mauritia', 'L.f.', 'Canangucha/Moriche', '00000000-0000-0000-0008-000000000006', true, NOW(), NOW()),
('00000000-0000-0000-0009-000000000004', 'Ficus', 'L.', 'Cauchos', '00000000-0000-0000-0008-000000000002', true, NOW(), NOW()),
('00000000-0000-0000-0009-000000000005', 'Theobroma', 'L.', 'Cacao', '00000000-0000-0000-0008-000000000004', true, NOW(), NOW()),
('00000000-0000-0000-0009-000000000006', 'Anacardium', 'L.', 'Caracolí/Marañón', '00000000-0000-0000-0008-000000000003', true, NOW(), NOW());

-- Especies (con foreign key a Género)
INSERT INTO species (id, epithet, author, "fullName", description, "commonNames", "genusId", "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0010-000000000001', 'peltata', 'L.', 'Cecropia peltata L.', 'Yarumo común', ARRAY['Yarumo', 'Guarumo'], '00000000-0000-0000-0009-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0010-000000000002', 'edulis', 'Mart.', 'Inga edulis Mart.', 'Guamo común', ARRAY['Guamo', 'Guaba'], '00000000-0000-0000-0009-000000000002', true, NOW(), NOW()),
('00000000-0000-0000-0010-000000000003', 'flexuosa', 'L.f.', 'Mauritia flexuosa L.f.', 'Palma de moriche', ARRAY['Canangucha', 'Moriche', 'Aguaje'], '00000000-0000-0000-0009-000000000003', true, NOW(), NOW()),
('00000000-0000-0000-0010-000000000004', 'elastica', 'Roxb. ex Hornem.', 'Ficus elastica Roxb. ex Hornem.', 'Caucho de la India', ARRAY['Caucho'], '00000000-0000-0000-0009-000000000004', true, NOW(), NOW()),
('00000000-0000-0000-0010-000000000005', 'cacao', 'L.', 'Theobroma cacao L.', 'Cacao', ARRAY['Cacao'], '00000000-0000-0000-0009-000000000005', true, NOW(), NOW()),
('00000000-0000-0000-0010-000000000006', 'excelsum', '(Bertero & Balb. ex Kunth) Skeels', 'Anacardium excelsum (Bertero & Balb. ex Kunth) Skeels', 'Caracolí amazónico', ARRAY['Caracolí', 'Espavel'], '00000000-0000-0000-0009-000000000006', true, NOW(), NOW());

-- ============================================
-- 6. GEOGRAFÍA - CAQUETÁ
-- ============================================

-- Departamentos
INSERT INTO departments (id, name, code, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0011-000000000001', 'Caquetá', '18', true, NOW(), NOW()),
('00000000-0000-0000-0011-000000000002', 'Putumayo', '86', true, NOW(), NOW()),
('00000000-0000-0000-0011-000000000003', 'Amazonas', '91', true, NOW(), NOW());

-- Municipios de Caquetá (con foreign key a Departamento)
INSERT INTO municipalities (id, name, code, "departmentId", "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0012-000000000001', 'Florencia', '18001', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000002', 'Albania', '18029', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000003', 'Belén de los Andaquíes', '18094', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000004', 'Cartagena del Chairá', '18150', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000005', 'Curillo', '18205', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000006', 'El Doncello', '18247', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000007', 'El Paujil', '18256', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000008', 'La Montañita', '18410', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000009', 'Milán', '18460', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000010', 'Morelia', '18479', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000011', 'Puerto Rico', '18592', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000012', 'San José del Fragua', '18610', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000013', 'San Vicente del Caguán', '18753', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000014', 'Solano', '18756', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000015', 'Solita', '18785', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW()),
('00000000-0000-0000-0012-000000000016', 'Valparaíso', '18860', '00000000-0000-0000-0011-000000000001', true, NOW(), NOW());

-- Tipos de ubicación
INSERT INTO location_types (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0013-000000000001', 'Bosque', 'Área boscosa', true, NOW(), NOW()),
('00000000-0000-0000-0013-000000000002', 'Río', 'Zona ribereña', true, NOW(), NOW()),
('00000000-0000-0000-0013-000000000003', 'Vereda', 'Vereda o sector rural', true, NOW(), NOW()),
('00000000-0000-0000-0013-000000000004', 'Reserva', 'Reserva natural', true, NOW(), NOW()),
('00000000-0000-0000-0013-000000000005', 'Finca', 'Propiedad privada', true, NOW(), NOW());

-- ============================================
-- 7. MORFOLOGÍA FOLIAR
-- ============================================

-- Tipos de venación
INSERT INTO venation_types (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0014-000000000001', 'Pinnada', 'Nervadura pinnada', true, NOW(), NOW()),
('00000000-0000-0000-0014-000000000002', 'Palmeada', 'Nervadura palmeada', true, NOW(), NOW()),
('00000000-0000-0000-0014-000000000003', 'Paralela', 'Nervadura paralela', true, NOW(), NOW()),
('00000000-0000-0000-0014-000000000004', 'Reticulada', 'Nervadura reticulada', true, NOW(), NOW());

-- Tipos de forma
INSERT INTO form_types (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0015-000000000001', 'Ovada', 'Forma ovada', true, NOW(), NOW()),
('00000000-0000-0000-0015-000000000002', 'Lanceolada', 'Forma lanceolada', true, NOW(), NOW()),
('00000000-0000-0000-0015-000000000003', 'Elíptica', 'Forma elíptica', true, NOW(), NOW()),
('00000000-0000-0000-0015-000000000004', 'Cordada', 'Forma cordada', true, NOW(), NOW()),
('00000000-0000-0000-0015-000000000005', 'Peltada', 'Forma peltada', true, NOW(), NOW());

-- Tipos de margen
INSERT INTO margin_types (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0016-000000000001', 'Entero', 'Margen entero', true, NOW(), NOW()),
('00000000-0000-0000-0016-000000000002', 'Serrado', 'Margen serrado', true, NOW(), NOW()),
('00000000-0000-0000-0016-000000000003', 'Dentado', 'Margen dentado', true, NOW(), NOW()),
('00000000-0000-0000-0016-000000000004', 'Lobulado', 'Margen lobulado', true, NOW(), NOW());

-- ============================================
-- 8. CARACTERÍSTICAS DEL ESPÉCIMEN
-- ============================================

-- Orígenes
INSERT INTO origins (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0017-000000000001', 'Silvestre', 'Espécimen de origen silvestre', true, NOW(), NOW()),
('00000000-0000-0000-0017-000000000002', 'Cultivado', 'Espécimen cultivado', true, NOW(), NOW()),
('00000000-0000-0000-0017-000000000003', 'Naturalizado', 'Espécimen naturalizado', true, NOW(), NOW());

-- Tipos de origen
INSERT INTO origin_types (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0018-000000000001', 'Nativo', 'Especie nativa de la región', true, NOW(), NOW()),
('00000000-0000-0000-0018-000000000002', 'Introducido', 'Especie introducida', true, NOW(), NOW()),
('00000000-0000-0000-0018-000000000003', 'Endémico', 'Especie endémica', true, NOW(), NOW());

-- Condiciones
INSERT INTO conditions (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0019-000000000001', 'Excelente', 'Espécimen en excelente estado', true, NOW(), NOW()),
('00000000-0000-0000-0019-000000000002', 'Bueno', 'Espécimen en buen estado', true, NOW(), NOW()),
('00000000-0000-0000-0019-000000000003', 'Regular', 'Espécimen en estado regular', true, NOW(), NOW()),
('00000000-0000-0000-0019-000000000004', 'Deteriorado', 'Espécimen deteriorado', true, NOW(), NOW());

-- Hábitats
INSERT INTO habitats (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0020-000000000001', 'Bosque húmedo tropical', 'Bosque húmedo tropical', true, NOW(), NOW()),
('00000000-0000-0000-0020-000000000002', 'Bosque de galería', 'Bosque de galería', true, NOW(), NOW()),
('00000000-0000-0000-0020-000000000003', 'Sabana', 'Sabana', true, NOW(), NOW()),
('00000000-0000-0000-0020-000000000004', 'Zona ribereña', 'Zona ribereña o riparia', true, NOW(), NOW()),
('00000000-0000-0000-0020-000000000005', 'Zona de transición', 'Zona de transición o ecotono', true, NOW(), NOW());

-- ============================================
-- 9. CONTADOR DE CATÁLOGO
-- ============================================
INSERT INTO catalog_counters (id, prefix, "lastNumber", "updatedAt") VALUES
('00000000-0000-0000-0021-000000000001', 'HUAZ', 0, NOW());

-- ============================================
-- 10. USUARIO ADMINISTRADOR INICIAL
-- ============================================
-- Contraseña: admin123 (hasheada con bcrypt)
-- IMPORTANTE: Cambiar esta contraseña después del primer acceso
INSERT INTO users (id, name, email, password, "isCollector", "isActive", "roleId", "genderId", "typeId", "institutionId", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0022-000000000001', 'Administrador HDUA', 'admin@udla.edu.co', '$2b$10$YQ8XqN7gH5YK3UZ0J9F4XO7KYX5PUqY5YqUqL5UZ0J9F4XO7KYX5P', true, true, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0004-000000000001', NOW(), NOW());

-- ============================================
-- 11. INFORMACIÓN DEL SISTEMA (CMS)
-- ============================================

-- Historia del Herbario
INSERT INTO system_info (id, key, title, content, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0023-000000000001', 'historia', 'Historia del Herbario', '{
  "introduccion": "El Herbario Digital de la Universidad de la Amazonía representa un esfuerzo institucional por preservar y democratizar el conocimiento sobre la biodiversidad vegetal de la región amazónica colombiana.",
  "mision": "Catalogar, preservar y difundir el conocimiento sobre la flora del departamento del Caquetá y la región amazónica, contribuyendo a la investigación científica, la educación ambiental y la conservación de la biodiversidad.",
  "vision": "Ser el referente regional en el estudio y documentación de la flora amazónica, facilitando el acceso al conocimiento botánico mediante tecnologías digitales y promoviendo la investigación científica de excelencia.",
  "objetivos": [
    "Documentar la diversidad florística de la Amazonía colombiana",
    "Facilitar el acceso a información botánica mediante plataformas digitales",
    "Apoyar la investigación científica y la educación ambiental",
    "Contribuir a la conservación de especies vegetales de importancia ecológica y cultural"
  ],
  "historia": "Fundado en [año], el herbario ha crecido desde una pequeña colección de referencia hasta convertirse en un repositorio digital que alberga cientos de especímenes botánicos de la región amazónica.",
  "importancia": "La región amazónica alberga una de las mayores biodiversidades del planeta. Este herbario digital permite preservar, estudiar y compartir este invaluable patrimonio natural con investigadores, estudiantes y comunidades de todo el mundo."
}', true, NOW(), NOW());

-- Datos y Estadísticas
INSERT INTO system_info (id, key, title, content, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0023-000000000002', 'datos', 'Datos y Estadísticas', '{
  "estadisticas": {
    "muestras": 150,
    "familias": 45,
    "municipios": 12
  },
  "cobertura": {
    "titulo": "Áreas de Cobertura",
    "descripcion": "Nuestras colecciones provienen principalmente del departamento de Caquetá, incluyendo municipios como Florencia, San Vicente del Caguán, Puerto Rico, Belén de los Andaquíes, entre otros."
  },
  "especimenes": {
    "titulo": "Tipos de Especímenes",
    "descripcion": "La colección incluye principalmente especies de bosque húmedo tropical, con énfasis en árboles, arbustos y plantas de importancia ecológica y cultural para la región."
  },
  "actualizacion": {
    "titulo": "Actualización",
    "descripcion": "La base de datos se actualiza constantemente con nuevos especímenes recolectados durante expediciones científicas y trabajo de campo de estudiantes e investigadores."
  },
  "acceso": {
    "titulo": "Acceso a la Información",
    "descripcion": "Toda la información contenida en este herbario digital es de acceso público y gratuito, promoviendo la democratización del conocimiento científico sobre nuestra biodiversidad."
  }
}', true, NOW(), NOW());

-- Información de Contacto
INSERT INTO system_info (id, key, title, content, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0023-000000000003', 'contacto', 'Información de Contacto', '{
  "institucion": "Universidad de la Amazonía",
  "direccion": "Calle 17 Diagonal 17 con Carrera 3F Barrio Porvenir, Florencia, Caquetá, Colombia",
  "email": "herbario@udla.edu.co",
  "telefono": "(+57) 8 436 4485",
  "sitioWeb": "https://www.udla.edu.co",
  "horarios": {
    "lunesViernes": "8:00 AM - 12:00 PM / 2:00 PM - 6:00 PM",
    "finDeSemana": "Cerrado",
    "nota": "Para visitas al herbario físico, se recomienda agendar cita previa"
  },
  "redesSociales": {
    "facebook": "#",
    "instagram": "#"
  }
}', true, NOW(), NOW());

-- Términos y Condiciones
INSERT INTO system_info (id, key, title, content, "isActive", "createdAt", "updatedAt") VALUES
('00000000-0000-0000-0023-000000000004', 'terminos', 'Términos y Condiciones de Uso', '{
  "ultimaActualizacion": "Enero 2024",
  "secciones": [
    {
      "titulo": "1. Aceptación de los Términos",
      "contenido": "Al acceder y utilizar el Herbario Digital de la Universidad de la Amazonía, usted acepta cumplir con estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar este servicio."
    },
    {
      "titulo": "2. Uso de la Información",
      "contenido": "La información contenida en este herbario digital es proporcionada con fines educativos y de investigación. Los usuarios pueden:",
      "items": [
        "Consultar libremente la información de las muestras botánicas",
        "Descargar información para uso académico y de investigación",
        "Citar el herbario en publicaciones científicas con la debida atribución"
      ]
    },
    {
      "titulo": "3. Restricciones de Uso",
      "contenido": "Los usuarios NO pueden:",
      "items": [
        "Usar la información con fines comerciales sin autorización previa",
        "Modificar o alterar la información sin consentimiento",
        "Redistribuir la base de datos completa sin permiso",
        "Realizar actividades que comprometan la integridad del sistema"
      ]
    },
    {
      "titulo": "4. Propiedad Intelectual",
      "contenido": "Todo el contenido del Herbario Digital, incluyendo imágenes, textos, datos taxonómicos y diseño, son propiedad de la Universidad de la Amazonía o sus colaboradores, y están protegidos por las leyes de propiedad intelectual colombianas e internacionales."
    },
    {
      "titulo": "5. Registro de Usuarios",
      "contenido": "Para acceder a funcionalidades adicionales (como contribuir con muestras o descargar información detallada), los usuarios deben registrarse proporcionando información veraz y actualizada. Los usuarios son responsables de mantener la confidencialidad de sus credenciales de acceso."
    },
    {
      "titulo": "6. Privacidad y Protección de Datos",
      "contenido": "La Universidad de la Amazonía se compromete a proteger la privacidad de sus usuarios de acuerdo con la Ley 1581 de 2012 de Protección de Datos Personales de Colombia. La información personal recopilada será utilizada únicamente para los fines del herbario y no será compartida con terceros sin consentimiento."
    },
    {
      "titulo": "7. Exactitud de la Información",
      "contenido": "Si bien nos esforzamos por mantener la información actualizada y precisa, no garantizamos la exactitud, completitud o vigencia de todos los datos. Los usuarios deben verificar la información crítica con fuentes adicionales."
    },
    {
      "titulo": "8. Citación y Atribución",
      "contenido": "Al utilizar información del herbario en publicaciones o investigaciones, se debe citar de la siguiente manera:",
      "citacion": "Herbario Digital UDLA. Universidad de la Amazonía. Florencia, Caquetá, Colombia. [Fecha de consulta]. Disponible en: [URL]"
    },
    {
      "titulo": "9. Modificaciones a los Términos",
      "contenido": "La Universidad de la Amazonía se reserva el derecho de modificar estos términos y condiciones en cualquier momento. Los cambios serán publicados en esta página y entrarán en vigencia inmediatamente."
    },
    {
      "titulo": "10. Contacto",
      "contenido": "Para preguntas sobre estos términos y condiciones, por favor contacte a:",
      "contacto": {
        "email": "herbario@udla.edu.co",
        "institucion": "Universidad de la Amazonía",
        "ubicacion": "Florencia, Caquetá, Colombia"
      }
    }
  ]
}', true, NOW(), NOW());
