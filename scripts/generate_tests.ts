import fs from "fs";

const types = ['bar', 'pie', 'line', 'scatter'];
const templates = {
  bar: (d: string) => `Analyze this dataset from table "goods" showing "Price" grouped by "Id". Data: ${d}. Write exactly 1-2 sentences highlighting the most important findings from this dataset.`,
  pie: (d: string) => `Analyze this dataset from table "sales" showing distribution of "Region". Data: ${d}. Write 1-2 sentences about which category is most and least common with exact counts.`,
  line: (d: string) => `Analyze this sequential dataset from table "revenue" showing "Amount" over "Month". Data: ${d}. Write 1-2 sentences about trends, peaks and dips.`,
  scatter: (d: string) => `Analyze this paired dataset from table "metrics" comparing "Age" vs "Score". Sample: ${d}. Write 1-2 sentences about the highest and lowest data points.`
};

let output = "";

for (let i = 0; i < 25; i++) {
  const type = types[i % types.length];
  const size = Math.floor(Math.random() * 4) + 4; // 4 to 7
  let maxV = -1, minV = 999999, maxC = "", minC = "";
  let data = [];
  
  for (let j = 0; j < size; j++) {
    const val = Math.floor(Math.random() * 900) + 10;
    const name = `Cat${i}${String.fromCharCode(65+j)}`;
    if (type === 'scatter') {
      const x = Math.floor(Math.random() * 100);
      data.push(`{ name: "${name}", x: ${x}, y: ${val} }`);
    } else {
      data.push(`{ name: "${name}", value: ${val} }`);
    }
    
    if (val > maxV) { maxV = val; maxC = name; }
    if (val < minV) { minV = val; minC = name; }
  }
  
  output += `
  {
    name: "Auto ${type.toUpperCase()} ${i+1}",
    data: [
      ${data.join(",\n      ")}
    ],
    promptTemplate: (d) => \`${templates[type as keyof typeof templates]('${d}')}\`,
    expectedHighestValue: ${maxV},
    expectedLowestValue: ${minV},
    expectedHighestCat: "${maxC}",
    expectedLowestCat: "${minC}"
  },`;
}

console.log(output);
