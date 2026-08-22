import { parsePriceListLines } from '@/features/suppliers/utils/parsePriceListLines';

describe('parsePriceListLines', () => {
  it('treats a plain line with no trailing number as a name-only entry', () => {
    expect(parsePriceListLines('Domestos 1000ml')).toEqual([
      { name: 'Domestos 1000ml', price: null },
    ]);
  });

  it('extracts a trailing whole number as the price', () => {
    expect(parsePriceListLines('Ajax 500ml 12')).toEqual([{ name: 'Ajax 500ml', price: 12 }]);
  });

  it('extracts a trailing decimal price separated by a dash', () => {
    expect(parsePriceListLines('Fairy dish soap - 6.90')).toEqual([
      { name: 'Fairy dish soap', price: 6.9 },
    ]);
  });

  it('extracts a trailing decimal price separated by an em-dash', () => {
    expect(parsePriceListLines('Ajax 500ml — 4.50')).toEqual([{ name: 'Ajax 500ml', price: 4.5 }]);
  });

  it('extracts a trailing price separated by a comma', () => {
    expect(parsePriceListLines('Fairy dish soap, 6.90')).toEqual([
      { name: 'Fairy dish soap', price: 6.9 },
    ]);
  });

  it('treats a comma-decimal price as a valid number', () => {
    // European-style decimal comma, e.g. "6,90" instead of "6.90" —
    // both must resolve to the same numeric value.
    expect(parsePriceListLines('Fairy dish soap, 6,90')).toEqual([
      { name: 'Fairy dish soap', price: 6.9 },
    ]);
  });

  it('parses multiple lines independently', () => {
    const raw = 'Domestos 1000ml\nAjax 500ml — 4.50\nFairy dish soap, 6.90';
    expect(parsePriceListLines(raw)).toEqual([
      { name: 'Domestos 1000ml', price: null },
      { name: 'Ajax 500ml', price: 4.5 },
      { name: 'Fairy dish soap', price: 6.9 },
    ]);
  });

  it('skips blank lines between entries', () => {
    const raw = 'Domestos 1000ml\n\n\nAjax 500ml — 4.50';
    expect(parsePriceListLines(raw)).toEqual([
      { name: 'Domestos 1000ml', price: null },
      { name: 'Ajax 500ml', price: 4.5 },
    ]);
  });

  it('trims surrounding whitespace on each line', () => {
    expect(parsePriceListLines('   Domestos 1000ml   ')).toEqual([
      { name: 'Domestos 1000ml', price: null },
    ]);
  });

  it('returns an empty array for an empty or whitespace-only input', () => {
    expect(parsePriceListLines('')).toEqual([]);
    expect(parsePriceListLines('   \n  \n ')).toEqual([]);
  });

  // A product name that legitimately ends in a number (a model number,
  // volume, etc.) with no separator before it must not be misread as a
  // price — the pattern requires an explicit separator character.
  it('does not treat a number with no separator as a price', () => {
    expect(parsePriceListLines('Panadol500')).toEqual([{ name: 'Panadol500', price: null }]);
  });

  it('treats a name that itself contains numbers correctly when a real trailing price follows', () => {
    expect(parsePriceListLines('Coca-Cola 1.5L - 3.20')).toEqual([
      { name: 'Coca-Cola 1.5L', price: 3.2 },
    ]);
  });
});
