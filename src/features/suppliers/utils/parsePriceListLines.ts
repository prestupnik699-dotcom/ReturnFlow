export type ParsedPriceListLine = { name: string; price: number | null };

// Matches a trailing number on the line — separated from the name by a
// tab, comma, dash, em-dash, or plain whitespace — as an optional price.
// A line with no such trailing number is treated as a name-only entry.
// This handles both plain lists ("Domestos 1000ml") and price lists
// ("Domestos 1000ml - 12.50" / "Domestos 1000ml\t12.50") without asking
// the person to pick a format up front.
const PRICE_LINE_PATTERN = /^(.+?)[\s\t,;\-—]+(\d+(?:[.,]\d+)?)\s*$/;

export function parsePriceListLines(raw: string): ParsedPriceListLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(PRICE_LINE_PATTERN);
      if (match && match[1] && match[2]) {
        const name = match[1].trim();
        const price = parseFloat(match[2].replace(',', '.'));
        if (name && !isNaN(price)) {
          return { name, price };
        }
      }
      return { name: line, price: null };
    });
}
