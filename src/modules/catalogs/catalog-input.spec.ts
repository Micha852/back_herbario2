import { Prisma } from '@prisma/client';
import { CATALOGS, getCatalog } from './catalog-definitions';
import {
  parseCatalogInput,
  relationOf,
  speciesFullName,
} from './catalog-input';

const def = (key: string) => getCatalog(key)!;
const UUID = '6b9011c5-9b33-4b04-9cfe-2e9467fa8926';

describe('catalog-input', () => {
  describe('definiciones', () => {
    it('todas las referencias apuntan a catálogos existentes', () => {
      for (const catalog of CATALOGS) {
        for (const field of catalog.fields.filter((f) => f.type === 'ref')) {
          expect(getCatalog(field.ref!)).toBeDefined();
        }
        if (catalog.parent)
          expect(getCatalog(catalog.parent.catalog)).toBeDefined();
      }
    });

    it('las claves de catálogo son únicas', () => {
      const keys = CATALOGS.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('create', () => {
    it('acepta datos válidos y recorta espacios', () => {
      const { data, errors } = parseCatalogInput(
        def('habitats'),
        { name: '  Bosque inundable ', description: '' },
        'create',
      );
      expect(errors).toEqual([]);
      expect(data).toEqual({ name: 'Bosque inundable', description: null });
    });

    it('exige los campos obligatorios', () => {
      const { errors } = parseCatalogInput(
        def('classes'),
        { name: 'Liliopsida' },
        'create',
      );
      expect(errors).toContain('División es obligatorio');
    });

    it('rechaza campos desconocidos', () => {
      const { errors } = parseCatalogInput(
        def('habitats'),
        { name: 'X', hacker: true },
        'create',
      );
      expect(errors).toContain('Campos no permitidos: hacker');
    });

    it('valida longitud máxima', () => {
      const { errors } = parseCatalogInput(
        def('habitats'),
        { name: 'x'.repeat(101) },
        'create',
      );
      expect(errors).toContain('Nombre no puede superar 100 caracteres');
    });

    it('valida referencias como UUID', () => {
      const { errors } = parseCatalogInput(
        def('classes'),
        { name: 'X', divisionId: 'no-uuid' },
        'create',
      );
      expect(errors).toContain('División no es válido');
    });

    it('convierte coordenadas a Decimal y valida rangos', () => {
      const ok = parseCatalogInput(
        def('locations'),
        {
          municipalityId: UUID,
          locationTypeId: UUID,
          name: 'Vereda',
          latitude: '1,6206',
          longitude: -75.6,
          altitude: '250',
        },
        'create',
      );
      expect(ok.errors).toEqual([]);
      expect(ok.data.latitude).toBeInstanceOf(Prisma.Decimal);
      expect(Number(ok.data.latitude)).toBeCloseTo(1.6206);
      expect(ok.data.altitude).toBe(250);

      const bad = parseCatalogInput(
        def('locations'),
        {
          municipalityId: UUID,
          locationTypeId: UUID,
          name: 'X',
          latitude: 95,
          altitude: 2.5,
        },
        'create',
      );
      expect(bad.errors).toContain('Latitud debe ser menor o igual a 90');
      expect(bad.errors).toContain(
        'Altitud (m.s.n.m.) debe ser un número entero',
      );
    });

    it('fechas y horas con formato', () => {
      const ok = parseCatalogInput(
        def('projects'),
        { name: 'P', startDate: '2024-03-01', startTime: '07:30' },
        'create',
      );
      expect(ok.errors).toEqual([]);
      expect(ok.data.startDate).toEqual(new Date('2024-03-01T00:00:00.000Z'));

      const bad = parseCatalogInput(
        def('projects'),
        { name: 'P', startDate: '01/03/2024', startTime: '25:00' },
        'create',
      );
      expect(bad.errors).toContain(
        'Fecha de inicio debe ser una fecha válida (AAAA-MM-DD)',
      );
      expect(bad.errors).toContain(
        'Hora de inicio debe tener el formato HH:MM',
      );
    });

    it('listas desde texto separado por comas o saltos de línea, sin duplicados', () => {
      const { data } = parseCatalogInput(
        def('species'),
        {
          genusId: UUID,
          epithet: 'precatoria',
          commonNames: 'Asaí, asaí de monte,\nAsaí ',
        },
        'create',
      );
      expect(data.commonNames).toEqual(['Asaí', 'asaí de monte']);
    });
  });

  describe('update', () => {
    it('solo valida los campos enviados', () => {
      const { data, errors } = parseCatalogInput(
        def('classes'),
        { description: 'Monocotiledóneas' },
        'update',
      );
      expect(errors).toEqual([]);
      expect(data).toEqual({ description: 'Monocotiledóneas' });
    });

    it('no permite vaciar un obligatorio', () => {
      const { errors } = parseCatalogInput(
        def('classes'),
        { name: '' },
        'update',
      );
      expect(errors).toContain('Nombre es obligatorio');
    });

    it('vaciar un opcional lo limpia (null)', () => {
      const { data } = parseCatalogInput(
        def('locations'),
        { latitude: '' },
        'update',
      );
      expect(data).toEqual({ latitude: null });
    });

    it('isActive debe ser booleano y no se mezcla con los datos', () => {
      expect(
        parseCatalogInput(def('habitats'), { isActive: false }, 'update'),
      ).toEqual({ data: {}, errors: [] });
      expect(
        parseCatalogInput(def('habitats'), { isActive: 'no' }, 'update').errors,
      ).toContain('isActive debe ser verdadero o falso');
    });
  });

  it('helpers', () => {
    expect(relationOf('divisionId')).toBe('division');
    expect(relationOf('locationTypeId')).toBe('locationType');
    expect(speciesFullName('Euterpe', 'precatoria', 'Mart.')).toBe(
      'Euterpe precatoria Mart.',
    );
    expect(speciesFullName('Euterpe', 'precatoria', null)).toBe(
      'Euterpe precatoria',
    );
  });
});
