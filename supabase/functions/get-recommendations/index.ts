Deno.serve(async (req) => {
  const { salary, budget, expenses } = await req.json();
  const totalSpent = expenses.reduce(
    (acc: number, expense: any) => acc + Number(expense.amount),
    0,
  );
  const remainingBudget = budget - totalSpent;
  const topCategories = expenses.reduce((acc: any, expense: any) => {
    const category = expense.category ?? "Uncategorized";
    acc[category] = (acc[category] ?? 0) + Number(expense.amount);
    return acc;
  }, {});

  const prompt = `
    You are a personal finance advisor. Based on this user's financial data, give exactly 3 short, specific, actionable recommendations. Each recommendation should be 1-2 sentences max. Be direct and friendly.

    Financial data:
    - Monthly salary: $${salary}
    - Monthly budget: $${budget}
    - Total spent this month: $${totalSpent.toFixed(2)}
    - Remaining budget: $${remainingBudget.toFixed(2)}
    - Spending by category: ${JSON.stringify(topCategories)}

    Focus on:
    - Whether they are overspending in any category
    - How much of their salary they are saving
    - Which category they should cut back on
    - Whether they are on track with their budget
    - Positive reinforcement if they are doing well

    Format your response as exactly 3 recommendations, each on a new line, starting with an emoji. No numbering, no headers, just 3 lines.
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
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (geminiResponse.ok || geminiResponse.status !== 503) break;
      // Exit loop if successful or if not a 503 error

      if (attempt < maxAttempts) {
        console.log("Gemini 503 on attempt " + attempt + ", retrying...");
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        // Exponential backoff
      }
    }

    if (geminiResponse?.ok) {
      console.log("Success with model:," + model);
      break;
    } // Got some model that works. Exit loop.
    console.log(`Model ${model} failed with all retries. Trying next model.`);
  }

  if (!geminiResponse || !geminiResponse.ok) {
    const errorText = geminiResponse
      ? await geminiResponse.text()
      : "no response";
    console.error("Gemini API error:", errorText);
    return new Response(
      JSON.stringify({ error: "Failed to get recommendations" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = await geminiResponse.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("Unexpected Gemini response shape:", JSON.stringify(data));
    return new Response(
      JSON.stringify({ error: "No recommendations generated" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const recommendations = text
    .trim()
    .split("\n")
    .filter((line: string) => line.trim().length > 0);

  return new Response(
    JSON.stringify({ recommendations }),
    { headers: { "Content-Type": "application/json" } },
  );
});
