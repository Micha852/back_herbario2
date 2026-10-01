import { normalizeTaxonLevel, resolveTaxonomy } from './taxonomy';

describe('taxonomía de la muestra', () => {
  it('liga solo el nivel más bajo', () => {
    expect(
      normalizeTaxonLevel({ speciesId: 's', genusId: 'g', familyId: 'f' }),
    ).toEqual({
      speciesId: 's',
      genusId: null,
      familyId: null,
    });
    expect(normalizeTaxonLevel({ genusId: 'g', familyId: 'f' })).toEqual({
      speciesId: null,
      genusId: 'g',
      familyId: null,
    });
    expect(
      normalizeTaxonLevel({ speciesId: null, genusId: null, familyId: 'f' }),
    ).toEqual({
      speciesId: null,
      genusId: null,
      familyId: 'f',
    });
    // Edición que no toca la taxonomía: no cambia nada
    expect(normalizeTaxonLevel({ scientificName: 'x' } as never)).toEqual({
      scientificName: 'x',
    });
  });

  it('resuelve la jerarquía desde cualquier nivel', () => {
    const family = {
      id: 'f',
      name: 'Fabaceae',
      order: { id: 'o', name: 'Fabales', class: null },
    };
    expect(resolveTaxonomy({ family }).rank).toBe('Familia');
    expect(
      resolveTaxonomy({ genus: { id: 'g', name: 'Inga', family } }),
    ).toMatchObject({
      rank: 'Género',
      family: { name: 'Fabaceae' },
      order: { name: 'Fabales' },
    });
    expect(resolveTaxonomy({}).rank).toBeNull();
  });
});
