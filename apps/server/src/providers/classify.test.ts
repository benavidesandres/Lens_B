import { describe, expect, it } from 'vitest';

import { classifyOsm, classifyWikipedia, inferIsFreeFromOsm } from './classify';
import { extractBuiltYear } from './text';

describe('classifyOsm', () => {
  it('reconoce murales', () => {
    expect(classifyOsm({ tourism: 'artwork', artwork_type: 'mural' })).toEqual({
      category: 'art',
      kind: 'Mural',
    });
  });

  it('reconoce cafés', () => {
    expect(classifyOsm({ amenity: 'cafe', name: 'Café' })?.category).toBe('food');
  });

  it('ignora elementos sin interés', () => {
    expect(classifyOsm({ amenity: 'parking' })).toBeNull();
  });
});

describe('inferIsFreeFromOsm', () => {
  it('respeta la etiqueta fee', () => {
    expect(inferIsFreeFromOsm({ tourism: 'museum', fee: 'no' }, 'history')).toBe(true);
    expect(inferIsFreeFromOsm({ tourism: 'museum' }, 'history')).toBeNull();
  });
});

describe('classifyWikipedia', () => {
  it('descarta barrios y estaciones', () => {
    expect(classifyWikipedia('La Candelaria', 'barrio de Bogotá', null)).toBeNull();
  });

  it('clasifica teatros como historia', () => {
    expect(classifyWikipedia('Teatro Colón', 'teatro en Bogotá', null)?.category).toBe('history');
  });
});

describe('extractBuiltYear', () => {
  it('encuentra el año de construcción', () => {
    expect(extractBuiltYear('El edificio fue construido en 1924 por el arquitecto...')).toBe(
      '1924',
    );
    expect(extractBuiltYear('Un edificio moderno.')).toBeNull();
  });
});
