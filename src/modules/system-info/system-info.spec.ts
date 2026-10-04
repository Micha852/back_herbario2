import { imageIdsIn } from './system-info.service';

describe('imágenes de las páginas del CMS', () => {
  it('lee los ids de fondo y logo de la página de inicio', () => {
    const content = JSON.stringify({ backgroundImageId: 'a', logoImageId: 'b', searchButton: 'Buscar' });
    expect(imageIdsIn('inicio', content)).toEqual(['a', 'b']);
    expect(
      imageIdsIn('inicio', JSON.stringify({ faviconImageId: 'f' })),
    ).toEqual(['f']);
  });

  it('ignora vacíos, JSON inválido y páginas sin imágenes', () => {
    expect(imageIdsIn('inicio', JSON.stringify({ backgroundImageId: null, logoImageId: '' }))).toEqual([]);
    expect(imageIdsIn('inicio', 'no json')).toEqual([]);
    expect(imageIdsIn('inicio', null)).toEqual([]);
    expect(imageIdsIn('historia', JSON.stringify({ backgroundImageId: 'a' }))).toEqual([]);
  });
});
