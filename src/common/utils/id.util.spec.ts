import { BadRequestException } from '@nestjs/common';
import { isId, ParseIdPipe } from './id.util';

describe('identificadores', () => {
  it('acepta los IDs fijos de los datos iniciales (falló en producción)', () => {
    // Género "Masculino" de la migración seed_initial_data: no es UUID de ninguna versión
    expect(isId('00000000-0000-0000-0002-000000000004')).toBe(true);
  });

  it('acepta UUID normales', () => {
    expect(isId('3f2b8c1e-9d4a-4c6b-8e2f-1a2b3c4d5e6f')).toBe(true);
  });

  it('rechaza lo que no tiene forma de ID', () => {
    for (const bad of ['', 'abc', '123', "1' OR '1'='1", null, 5]) {
      expect(isId(bad)).toBe(false);
    }
  });

  it('ParseIdPipe: 400 con mensaje en español', () => {
    const pipe = new ParseIdPipe();
    expect(pipe.transform('00000000-0000-0000-0002-000000000004')).toBe(
      '00000000-0000-0000-0002-000000000004',
    );
    expect(() => pipe.transform('no-es-id')).toThrow(BadRequestException);
  });
});
