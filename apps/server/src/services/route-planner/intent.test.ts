import { describe, expect, it } from 'vitest';

import { DEFAULT_ROUTE_MINUTES, parseIntent } from './intent';

describe('parseIntent', () => {
  it('entiende "una hora" y la intención de no gastar', () => {
    const intent = parseIntent('Tengo una hora libre y no quiero gastar dinero.');
    expect(intent.minutes).toBe(60);
    expect(intent.freeOnly).toBe(true);
  });

  it('entiende minutos explícitos y la categoría de arte', () => {
    const intent = parseIntent('Quiero una ruta de arte de 45 minutos');
    expect(intent.minutes).toBe(45);
    expect(intent.categories).toEqual(['art']);
  });

  it('entiende "hora y media"', () => {
    expect(parseIntent('tengo hora y media').minutes).toBe(90);
    expect(parseIntent('dos hora y media').minutes).toBe(150);
  });

  it('detecta lugares misteriosos aunque lleven tildes', () => {
    expect(parseIntent('Quiero descubrir lugares misteriosos').categories).toEqual(['hidden']);
  });

  it('usa el valor por defecto si no se menciona el tiempo', () => {
    expect(parseIntent('sorpréndeme').minutes).toBe(DEFAULT_ROUTE_MINUTES);
  });
});
