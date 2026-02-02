import { scanContent } from './scanner';

console.log("Running Scanner Tests...");

const testContent = `
  Here is a var #600 and another #601.
  This one is #500.
  Mistakes: #12 (too short), #1234 (too long), #abc (not digits).
  Duplicate #600.
`;

// Test 1: Find all
const all = scanContent(testContent);
console.log("Test 1 (All):", JSON.stringify(all) === JSON.stringify(["#500", "#600", "#601"]) ? "PASS" : "FAIL", all);

// Test 2: Filter by '6'
const sixes = scanContent(testContent, '6');
console.log("Test 2 (Filter '6'):", JSON.stringify(sixes) === JSON.stringify(["#600", "#601"]) ? "PASS" : "FAIL", sixes);

// Test 3: Filter by '5'
const fives = scanContent(testContent, '5');
console.log("Test 3 (Filter '5'):", JSON.stringify(fives) === JSON.stringify(["#500"]) ? "PASS" : "FAIL", fives);

// Test 4: Edge cases
const edge = scanContent("#123 #4567 #789 #000");
console.log("Test 4 (Edge):", JSON.stringify(edge) === JSON.stringify(["#000", "#123", "#789"]) ? "PASS" : "FAIL", edge);
