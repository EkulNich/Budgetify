Deno.serve(async (req) => {
  const { imageBase64, mimeType } = await req.json();

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return new Response(
      JSON.stringify({ error: "imageBase64 is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const prompt = `
    You are a receipt-scanning assistant. Look at this receipt image and extract exactly
    these fields, responding with strict JSON only — no markdown, no code fences, no extra text:

    {
      "amount": <the receipt's total amount, as a plain number with no currency symbols or commas>,
      "description": "<a short merchant or item description, 40 characters or fewer>",
      "date": "<the transaction date in YYYY-MM-DD format, or null if it isn't visible>"
    }

    If you cannot find a total amount, set "amount" to null. Respond with only the JSON object.
  `;

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-lite",
  ];
  let geminiResponse: Response | undefined;

  const maxAttempts = 3;
  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType || "image/jpeg",
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (geminiResponse.ok || geminiResponse.status !== 503) break;

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    if (geminiResponse?.ok) break;
  }

  if (!geminiResponse || !geminiResponse.ok) {
    const errorText = geminiResponse
      ? await geminiResponse.text()
      : "no response";
    console.error("Gemini API error:", errorText);
    return new Response(
      JSON.stringify({ error: "Failed to scan receipt" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = await geminiResponse.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("Unexpected Gemini response shape:", JSON.stringify(data));
    return new Response(
      JSON.stringify({ error: "No receipt data extracted" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json" },
  });
});
