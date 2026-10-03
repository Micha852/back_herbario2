import { specimenCoherenceErrors } from './specimen-rules';

describe('coherencia de la muestra', () => {
  it('acepta datos completos o vacíos', () => {
    expect(specimenCoherenceErrors({})).toEqual([]);
    expect(
      specimenCoherenceErrors({
        latitude: 1.6,
        longitude: -75.6,
        minElevation: 240,
        maxElevation: 280,
      }),
    ).toEqual([]);
    expect(
      specimenCoherenceErrors({ minElevation: 300, maxElevation: 300 }),
    ).toEqual([]);
  });

  it('rechaza coordenadas a medias y elevación invertida', () => {
    expect(
      specimenCoherenceErrors({ latitude: 1.6, longitude: null }),
    ).toHaveLength(1);
    expect(
      specimenCoherenceErrors({ minElevation: 3232, maxElevation: 2322 }),
    ).toEqual(['La elevación mínima no puede ser mayor que la máxima']);
  });
});
