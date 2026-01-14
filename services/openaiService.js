// Blog topics availability
const BLOG_TOPICS = [
    { id: 'web-development', name: 'Web Development', description: 'HTML, CSS, JavaScript, frameworks' },
    { id: 'productivity', name: 'Productivity Tools', description: 'Tips and tools for better workflow' },
    { id: 'programming', name: 'Programming', description: 'Coding tutorials and best practices' },
    { id: 'design', name: 'Design', description: 'UI/UX, graphics, and visual design' },
    { id: 'seo', name: 'SEO & Marketing', description: 'Search optimization and digital marketing' },
    { id: 'ai-tools', name: 'AI Tools', description: 'Artificial intelligence and automation' },
    { id: 'security', name: 'Cybersecurity', description: 'Online safety and data protection' },
    { id: 'tutorials', name: 'Tutorials', description: 'Step-by-step guides and how-tos' },
];

// Helper: Sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate a single blog post using AI with FALLBACK SYSTEM
async function generateBlogPost(topic, postNumber = 1, internalLinks = []) {

    const providers = [];

    // 1. Groq (PRIMARY - Fast & Free)
    if (process.env.GROQ_API_KEY) {
        providers.push({
            name: 'Groq (Llama 3)',
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1',
            model: 'llama-3.1-8b-instant',
        });
    }

    // 2. Gemini (SECONDARY - Rate Limited)
    if (process.env.GEMINI_API_KEY) {
        providers.push({
            name: 'Gemini',
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
            model: 'gemini-flash-latest',
        });
    }

    // 3. OpenAI / OpenRouter (BACKUP)
    if (process.env.OPENROUTER_API_KEY) {
        const isDirectOpenAI = process.env.OPENROUTER_API_KEY.startsWith('sk-proj-');
        providers.push({
            name: isDirectOpenAI ? 'OpenAI (Backup)' : 'OpenRouter (Backup)',
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: isDirectOpenAI ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1',
            model: isDirectOpenAI ? 'gpt-4o' : 'google/gemini-2.0-flash-exp:free',
            headers: isDirectOpenAI ? {} : { 'X-Title': 'ToolsVault' }
        });
    }

    if (providers.length === 0) {
        return { success: false, error: 'No AI Providers configured (Check .env)' };
    }

    // Prepare Prompts (Shared)
    const topicInfo = BLOG_TOPICS.find(t => t.id === topic) || { name: topic, description: topic };
    const systemPrompt = `You are an expert SEO Content Strategist. Your tone is professional, engaging, and human-like. You write for beginners and marketers.`;

    let internalLinksSection = "";
    if (internalLinks?.length > 0) {
        internalLinksSection = `\nInternal Links:\n${internalLinks.map(l => `- [${l.anchor}](${l.url})`).join('\n')}`;
    }

    const userPrompt = `Write a comprehensive, 1200-word blog post about "${topicInfo.name}".

    **Structure & Requirements:**
    1.  **H1 Title**: Engaging and SEO-optimized.
    2.  **Introduction**: Hook the reader immediately.
    3.  **H2 & H3 Headers**: Use keywords naturally.
    4.  **Content**: Informative, actionable, and structured with bullet points.
    5.  **SEO**: Use relevant keywords naturally throughout the text.
    6.  **Conclusion**: Summarize key takeaways.
    7.  **CTA**: Add a compelling Call to Action at the end.
    8.  **Hashtags**: Generate 5 relevant, AI-generated hashtags at the very bottom.
    9.  **Links**: If relevant, include mentions of helpful resources (like YouTube or official docs).
    ${internalLinksSection}

    **REQUIRED OUTPUT FORMAT (JSON):**
    {
      "title": "The Actual Blog Post Title",
      "excerpt": "A short, engaging summary of the post...",
      "content": "# Introduction\n\nThis is the full blog post content in Markdown format...",
      "metaDescription": "SEO Meta Description",
      "readingTime": 5
    }

    If you cannot output JSON, just write the Blog Post in Markdown.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    let lastError = null;

    // Loop through Providers
    for (const provider of providers) {
        try {
            console.log(`🤖 Attempting generation with: ${provider.name}...`);

            // FIX #1: Mandatory Delay for Gemini (Breathing room)
            if (provider.name === 'Gemini') {
                console.log("⏳ Waiting 1.5s before calling Gemini...");
                await sleep(1500);
            }

            const OpenAI = require('openai');
            const client = new OpenAI({
                apiKey: provider.apiKey,
                baseURL: provider.baseURL,
                defaultHeaders: provider.headers || {}
            });

            // FIX #2: Retry Logic for 429 Errors
            let response;
            let retries = 3;

            while (retries >= 0) {
                try {
                    response = await client.chat.completions.create({
                        model: provider.model,
                        messages: messages,
                        temperature: 0.7,
                    });
                    break; // Success, exit retry loop
                } catch (apiError) {
                    const isRateLimit = apiError.status === 429 || (apiError.error && apiError.error.code === 429);

                    if (isRateLimit && retries > 0) {
                        console.warn(`♻️ Rate Limit hit for ${provider.name}. Retrying in 2s... (${retries} retries left)`);
                        await sleep(2000);
                        retries--;
                    } else {
                        throw apiError; // Throw other errors or if out of retries
                    }
                }
            }

            let content = response.choices[0].message.content;
            let parsedData;

            // Try to parse JSON
            try {
                // cleanup fences
                let clean = content.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/```$/g, '');
                // find braces
                const firstBrace = clean.indexOf('{');
                const lastBrace = clean.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    clean = clean.substring(firstBrace, lastBrace + 1);
                }
                // strip control chars
                clean = clean.replace(/[\x00-\x1F\x7F]/g, c => (c === '\n' || c === '\t' || c === '\r') ? c : '');

                // console.log("DEBUG JSON CONTENT:", clean);
                parsedData = JSON.parse(clean);

                // Ensure excerpt exists if missing
                if (!parsedData.excerpt && parsedData.metaDescription) {
                    parsedData.excerpt = parsedData.metaDescription;
                }

                // VALIDATION: Check for lazy content
                if (!parsedData.content || parsedData.content.length < 100) {
                    throw new Error("Content too short or missing");
                }

                console.log(`✅ Success (JSON) with ${provider.name}!`);

            } catch (jsonError) {
                console.warn(`⚠️ JSON Parse/Validation failed for ${provider.name}, falling back to Raw Text.`);
                // FALLBACK: Treat entire output as Content
                parsedData = {
                    title: `${topicInfo.name} (AI Generated)`,
                    content: content,
                    excerpt: `A comprehensive guide about ${topicInfo.name}.`,
                    metaDescription: `Deep dive into ${topicInfo.name}`,
                    readingTime: 5,
                    aiGenerated: true
                };
            }

            return {
                success: true,
                data: { ...parsedData, category: topic, aiGenerated: true, provider: provider.name }
            };

        } catch (error) {
            console.error(`❌ Failed with ${provider.name}:`, error.message);
            lastError = error;
            // Continue to next provider...
        }
    }

    return {
        success: false,
        error: `All AI Providers failed. Last error: ${lastError?.message}`
    };
}

// Remove Mock Generator - we want clear failures if API key is wrong
function generateMockPost(topicInfo) {
    return null;
}

// Generate multiple blog posts
async function generateMultiplePosts(topic, count = 1, internalLinks = []) {
    if (!isOpenAIAvailable()) {
        return [{
            success: false,
            error: 'AI API key not configured'
        }];
    }

    const results = [];

    for (let i = 0; i < count; i++) {
        const result = await generateBlogPost(topic, i + 1, internalLinks);
        results.push(result);

        // Add delay between requests to avoid rate limiting
        if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return results;
}

// Get available topics
function getTopics() {
    return BLOG_TOPICS;
}

// Check if any AI provider is available
function isOpenAIAvailable() {
    return !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY);
}

module.exports = {
    generateBlogPost,
    generateMultiplePosts,
    getTopics,
    isOpenAIAvailable,
    BLOG_TOPICS
};
