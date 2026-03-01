const res = await fetch("https://f6j0abdfqn2ixg-8080.proxy.runpod.net/openapi.json");
const data = await res.json();

console.log("=== SCHEMAS ===");
console.log(JSON.stringify(data.components, null, 2));

console.log("\n=== PATHS ===");
for (const [path, methods] of Object.entries(data.paths)) {
  for (const [method, detail] of Object.entries(methods)) {
    console.log(`\n--- ${method.toUpperCase()} ${path} ---`);
    if (detail.requestBody) {
      console.log("Request:", JSON.stringify(detail.requestBody, null, 2));
    }
    if (detail.parameters) {
      console.log("Params:", JSON.stringify(detail.parameters, null, 2));
    }
  }
}
