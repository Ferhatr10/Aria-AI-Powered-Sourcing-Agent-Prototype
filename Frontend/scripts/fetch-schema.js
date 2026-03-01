const response = await fetch("https://f6j0abdfqn2ixg-8080.proxy.runpod.net/openapi.json");
const data = await response.json();

console.log("=== PATHS ===");
for (const [path, methods] of Object.entries(data.paths)) {
  for (const [method, details] of Object.entries(methods)) {
    console.log(`\n${method.toUpperCase()} ${path}`);
    console.log("Summary:", details.summary || "N/A");
    console.log("Tags:", details.tags?.join(", ") || "N/A");
    
    if (details.parameters) {
      console.log("Parameters:", JSON.stringify(details.parameters, null, 2));
    }
    
    if (details.requestBody) {
      console.log("Request Body:", JSON.stringify(details.requestBody, null, 2));
    }
    
    if (details.responses) {
      for (const [code, resp] of Object.entries(details.responses)) {
        console.log(`Response ${code}:`, JSON.stringify(resp, null, 2));
      }
    }
  }
}

console.log("\n=== SCHEMAS ===");
if (data.components?.schemas) {
  for (const [name, schema] of Object.entries(data.components.schemas)) {
    console.log(`\n--- ${name} ---`);
    console.log(JSON.stringify(schema, null, 2));
  }
}
