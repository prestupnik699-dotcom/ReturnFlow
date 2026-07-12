export async function lookupProductNameByBarcode(barcode: string): Promise<string | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as { status: number; product?: { product_name?: string } };

    if (json.status !== 1 || !json.product?.product_name) {
      return null;
    }

    return json.product.product_name;
  } catch {
    // Network failure or no match — the user just types the name manually,
    // this is a convenience lookup, not a required step.
    return null;
  }
}
