import { Prisma } from '@prisma/client';
import {
  DEFAULT_COLLECTION_SETTINGS,
  parseCollectionSettings,
} from './dwc-collection';
import { csvCell, toCsv } from './dwc-file';
import {
  DwcSpecimen,
  lifeStageOf,
  recordedByOf,
  specimenToDwc,
} from './dwc-mapper';
import { DWC_TERMS } from './dwc-terms';

const settings = {
  ...DEFAULT_COLLECTION_SETTINGS,
  occurrenceIdPrefix: 'UDLA:HUAZ:',
  institutionCode: 'Universidad de la Amazonia',
  collectionCode: 'HUAZ',
};

function specimen(overrides: Partial<DwcSpecimen> = {}): DwcSpecimen {
  return {
    catalogNumber: 'HUAZ-000001',
    scientificName: 'Zygia longifolia',
    commonName: 'Chiparo',
    author: '(Willd.) Britton & Rose',
    registryNumber: 'CS022',
    collectionDate: new Date('2020-10-05T00:00:00.000Z'),
    collectionYear: 2020,
    latitude: new Prisma.Decimal('1.61438'),
    longitude: new Prisma.Decimal('-75.6062317'),
    altitude: null,
    minElevation: 240,
    maxElevation: 280,
    adultsCount: 30,
    juvenilesCount: 6,
    localObservation: 'Árbol de 4 a 7 m de altura',
    fieldNotes: null,
    identificationNotes: null,
    identifiedBy: 'Claudia M. Santofimio-Celis',
    dateIdentified: '2020-10',
    otherCollectors: 'Diego A. Caicedo-Araujo | María García',
    species: {
      epithet: 'longifolia',
      author: null,
      genus: {
        name: 'Zygia',
        family: {
          name: 'Fabaceae',
          order: {
            name: 'Fabales',
            class: {
              name: 'Magnoliopsida',
              division: { name: 'Tracheophyta' },
            },
          },
        },
      },
    },
    location: {
      name: 'Jardín Botánico Uniamazonia',
      description: 'Suelos arcillosos',
      waterBody: 'Río Hacha',
      latitude: null,
      longitude: null,
      municipality: {
        name: 'Florencia',
        code: '18001',
        department: { name: 'Caquetá' },
      },
    },
    origin: { name: 'Nativo' },
    originType: { name: 'Cultivado' },
    condition: { name: 'Fructificación' },
    habitat: { name: 'Bosque húmedo tropical' },
    project: null,
    collectors: [{ user: { id: 'u1', name: 'María García' } }],
    ...overrides,
  } as unknown as DwcSpecimen;
}

describe('Darwin Core', () => {
  it('mapea una muestra completa con todas las columnas en orden', () => {
    const record = specimenToDwc(specimen(), settings);
    expect(Object.keys(record)).toEqual([...DWC_TERMS]);
    expect(record).toMatchObject({
      occurrenceID: 'UDLA:HUAZ:HUAZ-000001',
      basisOfRecord: 'PreservedSpecimen',
      collectionCode: 'HUAZ',
      recordNumber: 'CS022',
      individualCount: 36,
      lifeStage: '30 adultos 6 juveniles',
      reproductiveCondition: 'Fructificación',
      establishmentMeans: 'Nativo | Cultivado',
      eventDate: '2020-10-05',
      year: 2020,
      month: 10,
      day: 5,
      locationID: 'CO:18001',
      stateProvince: 'Caquetá',
      county: 'Florencia',
      locality: 'Jardín Botánico Uniamazonia',
      waterBody: 'Río Hacha',
      verbatimElevation: '240-280 m',
      decimalLatitude: 1.61438,
      decimalLongitude: -75.6062317,
      geodeticDatum: 'WGS84',
      identifiedBy: 'Claudia M. Santofimio-Celis',
      dateIdentified: '2020-10',
      kingdom: 'Plantae',
      phylum: 'Tracheophyta',
      family: 'Fabaceae',
      specificEpithet: 'longifolia',
      taxonRank: 'Especie',
      scientificNameAuthorship: '(Willd.) Britton & Rose',
      vernacularName: 'Chiparo',
    });
  });

  it('recolectores: usuarios + texto, sin repetir', () => {
    expect(recordedByOf(specimen())).toBe(
      'María García | Diego A. Caicedo-Araujo',
    );
    expect(recordedByOf({ collectors: [], otherCollectors: '  ' })).toBeNull();
  });

  it('lifeStage como en la plantilla', () => {
    expect(lifeStageOf(1, 1)).toBe('1 adulto 1 juvenil');
    expect(lifeStageOf(5, null)).toBe('Adulto');
    expect(lifeStageOf(0, 3)).toBe('Juvenil');
    expect(lifeStageOf(null, null)).toBeNull();
  });

  it('muestra mínima: sin coordenadas no informa datum; usa las de la localidad si las hay', () => {
    const bare = specimen({
      latitude: null,
      longitude: null,
      species: null,
      location: null,
      collectionDate: null,
      adultsCount: null,
      juvenilesCount: null,
    } as Partial<DwcSpecimen>);
    const record = specimenToDwc(bare, settings);
    expect(record.geodeticDatum).toBeNull();
    expect(record.taxonRank).toBeNull();
    expect(record.individualCount).toBeNull();
    expect(record.year).toBe(2020);

    const withLocationCoords = specimen({
      latitude: null,
      longitude: null,
      location: {
        ...(specimen().location as object),
        latitude: new Prisma.Decimal('1.5'),
        longitude: new Prisma.Decimal('-75.5'),
      },
    } as Partial<DwcSpecimen>);
    expect(specimenToDwc(withLocationCoords, settings).decimalLatitude).toBe(
      1.5,
    );
  });

  it('CSV escapa comillas, comas y saltos de línea', () => {
    expect(csvCell('simple')).toBe('simple');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('dice "hola"')).toBe('"dice ""hola"""');
    expect(csvCell('línea\nnueva')).toBe('"línea\nnueva"');
    expect(csvCell(null)).toBe('');
    const csv = toCsv([specimenToDwc(specimen(), settings)]).toString('utf8');
    expect(csv.startsWith('﻿occurrenceID,basisOfRecord')).toBe(true);
  });

  it('datos de la colección: combina con los valores por defecto', () => {
    expect(parseCollectionSettings(null)).toEqual(DEFAULT_COLLECTION_SETTINGS);
    expect(parseCollectionSettings('no es json')).toEqual(
      DEFAULT_COLLECTION_SETTINGS,
    );
    const parsed = parseCollectionSettings(
      '{"collectionCode":"HUAZ","otra":1,"kingdom":5}',
    );
    expect(parsed.collectionCode).toBe('HUAZ');
    expect(parsed.kingdom).toBe('Plantae');
    expect(parsed).not.toHaveProperty('otra');
  });
});

describe('Darwin Core: identificación hasta género o familia', () => {
  const base = {
    catalogNumber: 'jb352',
    scientificName: 'Rubiaceae',
    collectors: [],
    species: null,
    genus: null,
    family: null,
  };

  it('solo familia → taxonRank Familia con orden y clase', () => {
    const record = specimenToDwc(
      {
        ...base,
        family: {
          name: 'Rubiaceae',
          order: {
            name: 'Gentianales',
            class: {
              name: 'Magnoliopsida',
              division: { name: 'Tracheophyta' },
            },
          },
        },
      } as unknown as DwcSpecimen,
      settings,
    );
    expect(record).toMatchObject({
      taxonRank: 'Familia',
      family: 'Rubiaceae',
      order: 'Gentianales',
      phylum: 'Tracheophyta',
      genus: null,
      verbatimTaxonRank: null,
    });
  });

  it('solo género → taxonRank Género y "sp."', () => {
    const record = specimenToDwc(
      {
        ...base,
        scientificName: 'Piper sp.',
        genus: {
          name: 'Piper',
          author: null,
          family: { name: 'Piperaceae', order: null },
        },
      } as unknown as DwcSpecimen,
      settings,
    );
    expect(record).toMatchObject({
      taxonRank: 'Género',
      verbatimTaxonRank: 'sp.',
      genus: 'Piper',
      family: 'Piperaceae',
    });
  });
});

describe('Darwin Core: coordenadas', () => {
  it('nunca mezcla la latitud propia con la longitud de la localidad', () => {
    const halfOwn = {
      catalogNumber: 'X',
      scientificName: 'x',
      collectors: [],
      latitude: new Prisma.Decimal('1.6'),
      longitude: null,
      location: {
        name: 'L',
        latitude: new Prisma.Decimal('2.5'),
        longitude: new Prisma.Decimal('-75.5'),
        municipality: null,
      },
    } as unknown as DwcSpecimen;
    const record = specimenToDwc(halfOwn, settings);
    // Coordenada propia incompleta: se usa el par completo de la localidad
    expect([record.decimalLatitude, record.decimalLongitude]).toEqual([
      2.5, -75.5,
    ]);
  });
});
