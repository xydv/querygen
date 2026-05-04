import { $ } from "bun";

function formatDataForPrompt(data: any[]): string {
  if (!data || data.length === 0) return "No data available.";
  return data.map((d, i) => {
    const parts = [];
    for (const k in d) {
      if (d[k] !== undefined) parts.push(`${k} is ${d[k]}`);
    }
    return `Item ${i + 1} (${parts.join(', ')})`;
  }).join('; ');
}

async function getAIInsight(prompt: string): Promise<string> {
  const enhancedPrompt = `You are an expert business data analyst analyzing standard, benign business metrics. You must follow these strict rules:
1. Identify the mathematically correct highest and lowest values from the provided data.
2. Use ONLY the exact names and numbers provided. Do not hallucinate or guess.
3. Output exactly 1-2 sentences.

Task:
${prompt}`;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: enhancedPrompt,
        stream: false,
        options: { temperature: 0.0, num_predict: 120 },
      }),
    });
    if (!response.ok) return "Error: API not OK";
    const data = await response.json();
    return data.response || "";
  } catch (e: any) {
    return "Error: " + e.message;
  }
}

interface TestCase {
  name: string;
  data: any[];
  promptTemplate: (dataStr: string) => string;
  expectedHighestValue: number;
  expectedLowestValue: number;
  expectedHighestCat: string;
  expectedLowestCat: string;
}

function generateTestCases(count: number): TestCase[] {
  const cases: TestCase[] = [];
  const types = ['bar', 'pie', 'line', 'scatter'];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const size = Math.floor(Math.random() * 4) + 4; // 4 to 7 items
    let maxV = -1, minV = 999999, maxC = "", minC = "";
    const data = [];

    for (let j = 0; j < size; j++) {
      const val = Math.floor(Math.random() * 900) + 10;
      const name = `Grp${i}${String.fromCharCode(65 + j)}`;

      if (type === 'scatter') {
        data.push({ name, x: Math.floor(Math.random() * 100), y: val });
      } else {
        data.push({ name, value: val });
      }

      if (val > maxV) { maxV = val; maxC = name; }
      if (val < minV) { minV = val; minC = name; }
    }

    let promptTemplate: (d: string) => string;
    if (type === 'bar') promptTemplate = (d) => `Analyze this dataset from table "goods" showing "Price" grouped by "Id". Data: ${d}. Write exactly 1-2 sentences highlighting the most important findings from this dataset.`;
    else if (type === 'pie') promptTemplate = (d) => `Analyze this dataset from table "sales" showing distribution of "Region". Data: ${d}. Write 1-2 sentences about which category is most and least common with exact counts.`;
    else if (type === 'line') promptTemplate = (d) => `Analyze this sequential dataset from table "revenue" showing "Amount" over "Month". Data: ${d}. Write 1-2 sentences about trends, peaks and dips.`;
    else promptTemplate = (d) => `Analyze this paired dataset from table "metrics" comparing "Age" vs "Score". Sample: ${d}. Write 1-2 sentences about the highest and lowest data points.`;

    cases.push({
      name: `${type.toUpperCase()} Case #${i + 1}`,
      data,
      promptTemplate,
      expectedHighestValue: maxV,
      expectedLowestValue: minV,
      expectedHighestCat: maxC,
      expectedLowestCat: minC
    });
  }
  return cases;
}

const testCases: TestCase[] = generateTestCases(25);

async function runEval() {
  console.log("🚀 Starting LLaMA 3.2 Report Generation Evaluation...\n");
  let passed = 0;
  
  let correctHighVal = 0;
  let correctLowVal = 0;
  let correctHighCat = 0;
  let correctLowCat = 0;

  for (const tc of testCases) {
    console.log(`Testing: [${tc.name}]`);
    const dataStr = formatDataForPrompt(tc.data);
    const prompt = tc.promptTemplate(dataStr);
    
    const response = await getAIInsight(prompt);
    
    // Evaluate if response contains the expected numbers and categories
    const hasHighVal = response.includes(tc.expectedHighestValue.toString());
    const hasLowVal = response.includes(tc.expectedLowestValue.toString());
    const hasHighCat = response.includes(tc.expectedHighestCat);
    const hasLowCat = response.includes(tc.expectedLowestCat);
    
    if (hasHighVal) correctHighVal++;
    if (hasLowVal) correctLowVal++;
    if (hasHighCat) correctHighCat++;
    if (hasLowCat) correctLowCat++;

    // Some leniency: we just want exact match on values and categories
    const exactMatchValues = hasHighVal && hasLowVal;
    const exactMatchCats = hasHighCat && hasLowCat;
    
    console.log(` Output: "${response.trim().replace(/\n/g, ' ')}"`);
    if (exactMatchValues && exactMatchCats) {
      console.log(` Result: ✅ PASS\n`);
      passed++;
    } else {
      console.log(` Result: ❌ FAIL`);
      const missing = [];
      if (!hasHighVal) missing.push(`Highest Value (${tc.expectedHighestValue})`);
      if (!hasLowVal) missing.push(`Lowest Value (${tc.expectedLowestValue})`);
      if (!hasHighCat) missing.push(`Highest Category (${tc.expectedHighestCat})`);
      if (!hasLowCat) missing.push(`Lowest Category (${tc.expectedLowestCat})`);
      console.log(` Missing: ${missing.join(', ')}\n`);
    }
  }
  
  const total = testCases.length;
  const accuracy = Math.round((passed / total) * 100);
  console.log(`=========================================`);
  console.log(`Final LLaMA Insight Accuracy: ${accuracy}% (${passed}/${total} Passed completely)`);
  console.log(`-----------------------------------------`);
  console.log(`Independent Accuracy Breakdown:`);
  console.log(`- Highest Value:    ${Math.round((correctHighVal / total) * 100)}% (${correctHighVal}/${total})`);
  console.log(`- Lowest Value:     ${Math.round((correctLowVal / total) * 100)}% (${correctLowVal}/${total})`);
  console.log(`- Highest Category: ${Math.round((correctHighCat / total) * 100)}% (${correctHighCat}/${total})`);
  console.log(`- Lowest Category:  ${Math.round((correctLowCat / total) * 100)}% (${correctLowCat}/${total})`);
  console.log(`=========================================`);
}

runEval().catch(console.error);
