// Receives a photo of a paper invoice (base64) and asks Gemini to
// extract structured fields from it. Called BEFORE any delivery_invoices
// row exists — this function never touches the database, it's a pure
// image-in/JSON-out step. The client shows the returned fields in an
// editable review form; nothing is saved until the person confirms.
Deno.serve(async (req) => {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 or mimeType' }), {
        status: 400,
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
      });
    }

    // A retail invoice ("накладная") from a distributor — the schema
    // matches the fields the person fills into their paper journal by
    // hand: invoice number, distributor company name, total amount,
    // page count, and number of line items. All fields are nullable in
    // the schema (not required) since a real photo may be blurry, at an
    // angle, or missing a field — better to return partial data the
    // person fills in themselves than to fail the whole request.
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        invoiceNumber: { type: 'STRING', nullable: true },
        distributorName: { type: 'STRING', nullable: true },
        totalAmount: { type: 'NUMBER', nullable: true },
        pageCount: { type: 'INTEGER', nullable: true },
        itemCount: { type: 'INTEGER', nullable: true },
      },
    };

    const prompt = `This is a photo of a Georgian retail delivery invoice (накладная), possibly printed from rs.ge. Extract:
- invoiceNumber: the invoice/document number
- distributorName: the name of the supplying company (the seller, not the buyer)
- totalAmount: the grand total amount on the invoice, as a plain number (no currency symbol, no thousands separators)
- pageCount: how many pages this invoice document has, if stated or inferable (default to 1 if not stated and this looks like a single page)
- itemCount: how many distinct line items/products are listed on the invoice

If a field isn't visible or you're not confident, omit it rather than guessing. Respond with JSON matching the schema only.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${errorText}` }), {
        status: 502,
      });
    }

    const geminiResult = await geminiResponse.json();
    const rawText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return new Response(JSON.stringify({ error: 'Gemini returned no extractable content' }), {
        status: 502,
      });
    }

    const extracted = JSON.parse(rawText);

    return new Response(JSON.stringify({ extracted }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
    });
  }
});
