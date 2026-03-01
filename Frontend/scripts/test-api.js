const BASE = "https://f6j0abdfqn2ixg-8080.proxy.runpod.net";

async function testDiscovery() {
  console.log("=== Testing POST /discovery ===");
  try {
    const res = await fetch(`${BASE}/discovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "steel manufacturer ISO 9001",
        certifications: [],
        regulatory: [],
        strict_mode: true,
        top_k: 3
      })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Discovery error:", e.message);
  }
}

testDiscovery();
