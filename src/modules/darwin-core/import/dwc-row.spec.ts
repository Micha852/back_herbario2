import { normalizeName } from './dwc-import.service';
import { parseCsv } from './dwc-read';
import {
  interpretRow,
  parseElevation,
  parseLifeStage,
  splitList,
} from './dwc-row';

describe('Importación Darwin Core: interpretación de filas', () => {
  it('fila completa de la plantilla', () => {
    const row = interpretRow(2, {
      catalogNumber: 'jb022',
      scientificName: 'Zygia longifolia',
      scientificNameAuthorship: '(Willd.) Britton & Rose',
      genus: 'Zygia',
      year: 2020,
      month: '10',
      day: '5',
      individualCount: 36,
      lifeStage: '30 adultos 6 juveniles',
      establishmentMeans: 'Nativo | Cultivado',
      recordedBy: 'Diego A. Caicedo-Araujo | Claudia M. Santofimio-Celis',
      verbatimElevation: '240-280 m',
      decimalLatitude: 1.61438,
      decimalLongitude: -75.6062317,
      locationID: 'CO:18001',
      dateIdentified: '2020-08-17/2020-10-20',
    });
    expect(row.errors).toEqual([]);
    expect(row.warnings).toEqual([]);
    expect(row.taxonomy.epithet).toBe('longifolia');
    expect(row.collectionDate?.toISOString()).toBe('2020-10-05T00:00:00.000Z');
    expect([row.adultsCount, row.juvenilesCount]).toEqual([30, 6]);
    expect([row.minElevation, row.maxElevation]).toEqual([240, 280]);
    expect(row.establishment).toEqual(['Nativo', 'Cultivado']);
    expect(row.recordedBy).toHaveLength(2);
    expect(row.location.municipalityCode).toBe('18001');
    expect(row.dateIdentified).toBe('2020-08-17/2020-10-20');
  });

  it('errores y avisos', () => {
    expect(interpretRow(3, {}).errors).toEqual([
      'Falta catalogNumber',
      'Falta scientificName',
    ]);

    const row = interpretRow(4, {
      catalogNumber: 'x',
      scientificName: 'Algo',
      year: 2020,
      month: 2,
      day: 30,
      decimalLatitude: 95,
      decimalLongitude: -75,
      dateIdentified: 'octubre',
      minimumElevationInMeters: 500,
      maximumElevationInMeters: 100,
    });
    expect(row.errors).toEqual([]);
    expect(row.collectionDate).toBeNull();
    expect(row.collectionYear).toBe(2020);
    expect(row.latitude).toBeNull();
    expect(row.longitude).toBeNull();
    expect(row.dateIdentified).toBeNull();
    expect([row.minElevation, row.maxElevation]).toEqual([100, 500]);
    expect(row.warnings).toHaveLength(5);
  });

  it('rango de fechas sin día: solo el año', () => {
    const row = interpretRow(5, {
      catalogNumber: 'x',
      scientificName: 'A',
      eventDate: '2020-08-17/2020-10-20',
    });
    expect(row.collectionDate).toBeNull();
    expect(row.collectionYear).toBe(2020);
  });

  it('etapa de vida', () => {
    expect(parseLifeStage('Juvenil', 10)).toEqual({
      adults: null,
      juveniles: 10,
    });
    expect(parseLifeStage('Adulto', 1)).toEqual({ adults: 1, juveniles: null });
    expect(parseLifeStage('1 adulto 1 juvenil', 2)).toEqual({
      adults: 1,
      juveniles: 1,
      warning: undefined,
    });
    expect(parseLifeStage('2 adultos 2 juveniles', 5).warning).toMatch(
      /no coincide/,
    );
    expect(parseLifeStage(null, 4)).toMatchObject({
      adults: 4,
      juveniles: null,
    });
  });

  it('elevación y listas', () => {
    expect(parseElevation('240-280 m')).toEqual([240, 280]);
    expect(parseElevation('300 m')).toEqual([300, 300]);
    expect(parseElevation('-5 m')).toEqual([-5, -5]);
    expect(parseElevation(null)).toEqual([null, null]);
    expect(splitList('a | b;c')).toEqual(['a', 'b', 'c']);
  });

  it('CSV con comillas, saltos de línea y punto y coma', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","di ""hola""\notra"\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'di "hola"\notra'],
    ]);
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('normaliza nombres sin tildes ni mayúsculas', () => {
    expect(normalizeName('  Caquetá  ')).toBe('caqueta');
    expect(normalizeName('Bosque   Primario')).toBe('bosque primario');
  });
});
