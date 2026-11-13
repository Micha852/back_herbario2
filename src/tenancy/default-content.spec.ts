import {
  applyDefaultContent,
  defaultContent,
  fillTemplate,
} from './default-content';
import { catalogPrefix } from '../modules/specimens/specimens.service';
import { TenantContext } from './tenant-context';

describe('plantilla neutra de un herbario nuevo', () => {
  const content = defaultContent('Herbario COAH', 'contacto@coah.co');
  const text = JSON.stringify(content);

  it('no trae nada de HUAZ / Universidad de la Amazonía', () => {
    expect(text).not.toMatch(
      /HUAZ|UDLA|Uniamazon|Universidad de la Amazon|udla\.edu|Caquet|Florencia/i,
    );
  });

  it('usa el nombre y el correo del herbario, y no deja variables sin llenar', () => {
    expect(text).toContain('Herbario COAH');
    expect(text).toContain('contacto@coah.co');
    expect(text).not.toContain('{{');
  });

  it('trae las cuatro páginas del CMS con la forma que espera el front', () => {
    expect(Object.keys(content).sort()).toEqual([
      'contacto',
      'datos',
      'historia',
      'terminos',
    ]);
    const historia = content.historia.content as { objetivos: string[] };
    expect(historia.objetivos.length).toBeGreaterThan(0);
    const terminos = content.terminos.content as { secciones: unknown[] };
    expect(terminos.secciones.length).toBe(10);
  });

  it('un nombre con comillas no rompe nada (se reemplaza en cada texto, no en el JSON)', () => {
    const filled = fillTemplate(
      { a: 'Bienvenido a {{nombre}}', b: ['{{nombre}}'], n: 3 },
      { nombre: 'Herbario "Ñandú" <B>' },
    );
    expect(filled).toEqual({
      a: 'Bienvenido a Herbario "Ñandú" <B>',
      b: ['Herbario "Ñandú" <B>'],
      n: 3,
    });
  });

  it('se guarda en system_info y quita el contador HUAZ sin usar', async () => {
    const db = {
      systemInfo: { upsert: jest.fn() },
      catalogCounter: { deleteMany: jest.fn() },
    };
    await applyDefaultContent(db as never, 'Herbario COAH');
    expect(db.systemInfo.upsert).toHaveBeenCalledTimes(4);
    expect(db.catalogCounter.deleteMany).toHaveBeenCalledWith({
      where: { prefix: 'HUAZ', lastNumber: 0 },
    });
  });

  it('números de catálogo con el identificador de cada herbario', () => {
    const tenant = (slug: string) => ({
      id: '1',
      slug,
      name: slug,
      dbName: 'x',
    });
    expect(TenantContext.run(tenant('coah'), catalogPrefix)).toBe('COAH');
    expect(TenantContext.run(tenant('huaz'), catalogPrefix)).toBe('HUAZ');
  });
});
