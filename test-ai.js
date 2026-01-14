require('dotenv').config();
const OpenAI = require('openai');

async function testAI() {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error("❌ No API Key found in .env");
        return;
    }

    console.log("🔑 Testing with Key:", apiKey.substring(0, 10) + "...");

    const isOpenRouter = apiKey.startsWith('sk-or-');
    const baseURL = isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';

    console.log("🌐 Endpoint:", baseURL);

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
        defaultHeaders: isOpenRouter ? {
            'HTTP-Referer': 'https://toolsvault.com',
            'X-Title': 'ToolsVault Test',
        } : {},
    });

    try {
        console.log("⏳ Sending request...");
        const response = await client.chat.completions.create({
            model: isOpenRouter ? 'google/gemini-2.0-flash-exp:free' : 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say hello!' }],
            temperature: 0.7,
        });

        console.log("✅ Success!");
        console.log("📝 Response:", response.choices[0].message.content);
    } catch (error) {
        console.error("❌ Error:");
        console.error("   Status:", error.status);
        console.error("   Code:", error.code);
        console.error("   Type:", error.type);
        console.error("   Message:", error.message);
    }
}

testAI();
