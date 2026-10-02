import { slug } from './documents.service';
import { formatDate } from './pdf/pdf-kit';

describe('documentos', () => {
  it('nombres de archivo sin tildes ni símbolos', () => {
    expect(slug('Zygia longifolia (Willd.) Britton & Rose')).toBe('zygia-longifolia-willd-britton-rose');
    expect(slug('María García')).toBe('maria-garcia');
    expect(slug('***')).toBe('documento');
  });

  it('fechas en UTC (dd/mm/aaaa)', () => {
    expect(formatDate(new Date('2020-10-05T00:00:00.000Z'))).toBe('05/10/2020');
    expect(formatDate(null)).toBeNull();
  });
});
