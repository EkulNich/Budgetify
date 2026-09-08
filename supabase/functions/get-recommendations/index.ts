const SMART_INSIGHTS_PROMPT = `
You are the Smart Insights system for a budgeting app.

Analyze the user's available financial data and identify the THREE most useful insights for the user right now.

Evaluate all of the following categories:

1. Budget pace
- Is the user spending faster or slower than their monthly budget pace?
- Are they projected to exceed or underspend their budget?
- How much can they safely spend per day for the rest of the month?
- Is the remaining budget becoming tight?

2. Projected end-of-month spending
- Estimate how much the user is likely to spend by the end of the month based on current behaviour.
- Compare the projection against the monthly budget.
- Highlight a likely overspend or significant underspend.

3. Category spending
- Is any category unusually high?
- Has spending in a category increased significantly compared with previous periods?
- Is one category taking up an unusually large share of total spending?
- Which category is contributing most to overspending?

4. Unusual transactions
- Identify unusually large individual purchases.
- Compare them with the user's typical transaction size.
- Highlight them only if they are meaningfully unusual.

5. Daily or weekly spending spikes
- Identify days or weeks where spending was significantly higher than normal.
- Compare recent spending with the user's usual daily or weekly average.
- Explain what caused the spike if the transaction data makes this clear.

6. Transaction frequency
- Detect unusual increases in the number of purchases.
- Identify patterns such as many small purchases adding up to significant spending.
- Highlight this only if the frequency is meaningfully different from the user's usual behaviour.

7. Comparison with previous periods
- Compare this month with last month or previous months.
- Compare spending at the same point in the month where possible.
- Highlight meaningful improvements or deteriorations.
- Examples include lower total spending, higher average daily spending, or improvements in a specific category.

8. Spending trends
- Identify whether spending is consistently increasing or decreasing.
- Look for recurring patterns across days or weeks.
- Highlight trends only when there is enough data to support them.

9. Positive spending behaviour
- Identify meaningful positive progress.
- Examples:
  - staying under daily safe-to-spend limits
  - spending less than the previous month
  - reducing spending in a previously high category
  - staying comfortably below budget pace
  - maintaining several low-spending days
- Positive insights should still contain useful numbers and should not be generic praise.

10. Actionable savings opportunities
- Identify realistic ways the user could adjust spending based on their actual behaviour.
- Suggestions must be specific and data-driven.
- Examples:
  - a reasonable daily spending target
  - a suggested limit for a rapidly growing category
  - how much reducing a certain type of spending could save by month-end
- Never give vague advice such as "spend less".

11. Income and budget relationship
- If income information is available, compare the user's spending and budget against income.
- Highlight if the monthly budget appears unusually high or low relative to income.
- Highlight how much income is currently being allocated to spending.
- Do not make assumptions about what percentage the user "should" save unless the app has an explicit user-defined savings goal.

12. Recurring spending patterns
- Detect repeated or recurring expenses if enough history is available.
- Highlight recurring costs that make up a meaningful portion of spending.
- Identify meaningful increases in recurring costs.

13. Social or shared spending
- If group expenses or shared expenses are available, analyze whether shared spending is contributing significantly to the user's total spending.
- Identify unusually high group spending.
- Highlight outstanding amounts owed to or by the user if they are meaningful.

14. Budget concentration
- Detect if too much of the user's spending is concentrated in one category or a small number of transactions.
- Explain the concentration using a percentage where possible.

15. Remaining-month pressure
- Consider how many days remain in the month.
- Identify whether the user's remaining budget gives them significantly less spending flexibility than earlier in the month.
- Calculate a useful remaining daily allowance when appropriate.

PRIORITIZATION

Rank potential insights based on:
1. Financial importance
2. Urgency
3. How unusual the behaviour is
4. How actionable the insight is
5. How confident the conclusion is based on the available data

Prefer insights that reveal something the user may not immediately notice themselves.

Do not return multiple insights that describe essentially the same problem.

For example:
- "Projected to exceed budget"
and
- "Daily spending is too high"

should not both be returned if they are caused by the same spending pattern, unless each provides substantially different useful information.

OUTPUT RULES

Return a maximum of 3 insights.

If fewer than 3 insights are genuinely useful, return fewer than 3.

For each insight:
- give it a short, specific title
- explain what happened
- include at least one useful number where data allows
- explain why it matters
- provide a practical next step when appropriate
- keep the wording concise and easy to understand

Each insight should be no more than 2 sentences.

Do not:
- invent missing data
- make unsupported predictions
- exaggerate small changes
- shame or criticize the user
- describe purchases as "bad", "wasteful", or "unnecessary"
- give generic advice
- repeatedly praise the user without providing useful information
- assume a spending increase is negative if there is no evidence that it threatens their goals
- assume financial goals that the user has not specified
- use emoji anywhere in the title or message

DATA LIMITATIONS

Take the amount of available history into account.

If there is very little data:
- avoid strong claims about trends
- avoid percentage comparisons that are misleading
- use wording such as "Based on your spending so far"

If there is enough historical data:
- prioritize comparisons against the user's own past behaviour rather than generic financial benchmarks.

PRIORITY LEVELS

Use:
- "high" for something that could cause the user to exceed their budget or requires attention soon
- "medium" for a meaningful change or unusual pattern worth knowing
- "low" for useful positive progress or non-urgent observations

ALLOWED TYPES

Use one of the following types:

- budget_pace
- projected_spending
- safe_to_spend
- category_spending
- spending_spike
- unusual_transaction
- transaction_frequency
- historical_comparison
- spending_trend
- positive_progress
- savings_opportunity
- income_vs_spending
- recurring_expense
- shared_spending
- outstanding_balance
- spending_concentration
- remaining_budget

Return JSON only in this format:

{
  "insights": [
    {
      "type": "budget_pace",
      "priority": "high",
      "title": "You're trending over budget",
      "message": "Based on your spending so far, you're projected to spend SGD 2,180 this month, around SGD 180 above your SGD 2,000 budget. Keeping spending below SGD 32 per day for the rest of the month would bring you back on track."
    },
    {
      "type": "category_spending",
      "priority": "medium",
      "title": "Transport spending is rising",
      "message": "You've spent 38% more on transport than at this point last month, and it now makes up 27% of your spending. Keeping transport near SGD 5 per day would slow the increase."
    },
    {
      "type": "positive_progress",
      "priority": "low",
      "title": "Food spending is down",
      "message": "You've spent SGD 42 less on food than at the same point last month, a decrease of 18%. That reduction is helping keep your overall spending below budget pace."
    }
  ]
}
`;

type ExpenseInput = {
  amount: number;
  category: string | null;
  description: string | null;
  createdAt: string;
  isShared: boolean;
};

function summarizeCategories(expenses: ExpenseInput[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.category ?? "uncategorized";
    totals[key] = (totals[key] ?? 0) + Number(e.amount);
  }
  return totals;
}

Deno.serve(async (req) => {
  const {
    currency,
    monthlySalary,
    monthlyBudget,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    currentMonthExpenses,
    previousMonthExpenses,
    owedToYou,
    owedByYou,
  } = await req.json();

  const current: ExpenseInput[] = currentMonthExpenses ?? [];
  const previous: ExpenseInput[] = previousMonthExpenses ?? [];

  const totalSpentThisMonth = current.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSpentLastMonth = previous.reduce((sum, e) => sum + Number(e.amount), 0);

  const dataBlock = {
    currency,
    monthlyIncome: monthlySalary,
    monthlyBudget,
    daysInMonth,
    daysElapsedThisMonth: daysElapsed,
    daysRemainingThisMonth: daysRemaining,
    totalSpentThisMonthSoFar: Number(totalSpentThisMonth.toFixed(2)),
    totalSpentLastMonth: Number(totalSpentLastMonth.toFixed(2)),
    categoryTotalsThisMonth: summarizeCategories(current),
    categoryTotalsLastMonth: summarizeCategories(previous),
    transactionCountThisMonth: current.length,
    transactionCountLastMonth: previous.length,
    transactionsThisMonth: current.map((e) => ({
      amount: Number(e.amount),
      category: e.category ?? "uncategorized",
      description: e.description,
      date: e.createdAt,
      isSharedPoolExpense: e.isShared,
    })),
    transactionsLastMonth: previous.map((e) => ({
      amount: Number(e.amount),
      category: e.category ?? "uncategorized",
      date: e.createdAt,
      isSharedPoolExpense: e.isShared,
    })),
    outstandingAmountOwedToUser: owedToYou ?? 0,
    outstandingAmountUserOwes: owedByYou ?? 0,
  };

  const prompt = `${SMART_INSIGHTS_PROMPT}

USER'S FINANCIAL DATA (all amounts are in ${currency}):
${JSON.stringify(dataBlock, null, 2)}
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

  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json" },
  });
});
