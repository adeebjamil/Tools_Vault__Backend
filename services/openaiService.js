// OpenRouter Service - Uses OpenRouter API (OpenAI-compatible)
// OpenRouter provides access to multiple AI models through one API

let openai = null;

// Initialize with OpenRouter
// Initialize with OpenRouter
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (apiKey) {
    const OpenAI = require('openai');
    // Auto-detect OpenRouter key
    const isOrKey = apiKey.startsWith('sk-or-');
    const isOpenRouter = isOrKey || (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 0);

    const config = {
        apiKey: apiKey,
    };

    if (isOpenRouter) {
        config.baseURL = 'https://openrouter.ai/api/v1';
        config.defaultHeaders = {
            'HTTP-Referer': 'https://toolsvault.com',
            'X-Title': 'ToolsVault',
        };
    }

    try {
        openai = new OpenAI(config);
        console.log(`✅ AI Service Initialized`);
        console.log(`   - Provider: ${isOpenRouter ? 'OpenRouter' : 'OpenAI'}`);
        console.log(`   - Model endpoint: ${config.baseURL || 'Default OpenAI'}`);
        console.log(`   - Key Prefix: ${apiKey.substring(0, 8)}...`);
    } catch (e) {
        console.error("Failed to initialize OpenAI client:", e);
    }
} else {
    console.log('⚠️  No AI API key found - AI features disabled');
}

// Blog topics/categories available
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

// Check if AI is available
function isOpenAIAvailable() {
    return openai !== null;
}

// Generate a single blog post using AI
async function generateBlogPost(topic, postNumber = 1, internalLinks = []) {
    if (!openai) {
        return {
            success: false,
            error: 'AI API key not configured. Please add OPENROUTER_API_KEY or OPENAI_API_KEY to your .env file.'
        };
    }

    const topicInfo = BLOG_TOPICS.find(t => t.id === topic) || { name: topic, description: topic };

    const systemPrompt = `You are an expert technical content writer for ToolsVault.
Your goal is to write authoritative, human-like, and SEO-optimized articles.
You strictly avoid AI clichés and generic writing.
You write as a real expert explaining complex topics to another developer.`;

    let internalLinksSection = "";
    if (internalLinks && internalLinks.length > 0) {
        internalLinksSection = `
6. **Internal Linking**:
   - Naturally incorporate these internal links where relevant:
   ${internalLinks.map(link => `- [${link.anchor}](${link.url})`).join('\n   ')}
   - Do NOT force them; if they don't fit naturally, skip them.
   - Suggest 3-5 internal links total if possible.`;
    }

    const userPrompt = `Write a comprehensive, deep-dive blog post about "${topicInfo.name}" (${topicInfo.description}).

STRICT ADHERENCE TO THESE RULES IS REQUIRED:

1. **Topic Clarity**
   - Never treat the topic as a placeholder.
   - Clearly define what "${topicInfo.name}" means in the introduction.
   - If the topic is broad, break it into sub-areas.

2. **No Generic Writing**
   - Avoid vague phrases like "has evolved significantly", "better performance", "in today's fast-paced world".
   - Every claim must be explained with context or examples.
   - Do NOT use filler lines.

3. **Human-Written Style**
   - Write as a real expert explaining to another human.
   - Use a natural flow, not a robotic or textbook style.
   - Avoid common AI clichés.

4. **Practical Value**
   - Include real-world use cases.
   - Explain how people actually use this in workflows.
   - Code examples should be relevant and meaningful (use markdown).

5. **SEO Optimization**
   - Use the primary keyword ("${topicInfo.name}") naturally 3-4 times.
   - Use related semantic keywords.
   - Use proper H2, H3 hierarchy.
   - Keep paragraphs short and readable.
${internalLinksSection}

7. **Originality**
   - Content must be original and not copied.
   - No Wikipedia-style explanations.

8. **Structure**:
   - **Introduction**: Hook the reader, define the topic clearly.
   - **Deep Dive**: Core concepts explained well.
   - **Practical Application**: How to use it / Code examples.
   - **Common Pitfalls**: What to avoid.
   - **FAQ**: 3 real questions developers ask.
   - **Conclusion**: Brief wrap-up.

OUTPUT FORMAT (Valid JSON only):
{
  "title": "Optimized SEO Title",
  "excerpt": "Engaging summary for the blog card (no markdown)",
  "content": "Full markdown article content... (do NOT use H1 in content, start with H2)",
  "metaTitle": "Title Tag for Google (max 60 chars)",
  "metaDescription": "Meta Description tag (max 160 chars)",
  "keywords": ["primary keyword", "lsi keyword", "etc"],
  "tags": ["tag1", "tag2"],
  "readingTime": number (estimated minutes)
}

Context: This is post #${postNumber} in a batch. Make it unique.`;

    try {
        // Detect provider for this specific request context
        const isOrKey = process.env.OPENROUTER_API_KEY?.startsWith('sk-or-') || apiKey?.startsWith('sk-or-');

        const response = await openai.chat.completions.create({
            model: isOrKey ? 'google/gemini-2.0-flash-exp:free' : 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 3500,
        });

        let content = response.choices[0].message.content;

        // Cleanup markdown code blocks if present (Gemini often includes them)
        content = content.replace(/^```json\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');

        const parsed = JSON.parse(content);

        return {
            success: true,
            data: {
                ...parsed,
                category: topic,
                aiGenerated: true,
            }
        };
    } catch (error) {
        console.error('AI API Error:', error.status || error.message);

        // Fallback to Mock AI if API fails (Demo Mode)
        console.log("⚠️ Switching to Mock AI Generation (Fallback Mode)");
        return {
            success: true,
            data: generateMockPost(topicInfo),
            message: "Generated using Mock AI (API Key invalid or quota exceeded)"
        };
    }
}

// Helper: Generate Mock Post for Demo/Fallback
function generateMockPost(topicInfo) {
    const titles = [
        `The Ultimate Guide to ${topicInfo.name}`,
        `10 Best Practices for ${topicInfo.name} in 2026`,
        `Mastering ${topicInfo.name}: A Beginner's Guide`,
        `Why ${topicInfo.name} Matters for Developers`,
        `Advanced Techniques in ${topicInfo.name}`
    ];

    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const readingTime = Math.floor(Math.random() * 5) + 3;

    return {
        title: randomTitle,
        excerpt: `Learn everything you need to know about ${topicInfo.name}. This comprehensive guide covers essential tools, tips, and strategies to boost your workflow.`,
        content: `
## Introduction

${topicInfo.name} is a critical component in modern software development. Rather than being just a buzzword, it represents a shift in how we approach... [MOCK CONTENT - Please configure OpenAI API Key for full AI generation]

## Core Concepts

Understanding the underlying structure is key. Most professionals overlook this, leading to technical debt.

## Code Example

\`\`\`javascript
const demo = "${topicInfo.name}";
console.log(demo);
\`\`\`

## Conclusion

Mastering ${topicInfo.name} is a journey involved constant learning.
        `.trim(),
        metaTitle: `${randomTitle} | ToolsVault Guide`,
        metaDescription: `A complete guide to ${topicInfo.name} including tips, tricks, and best practices.`,
        keywords: [topicInfo.id, "guide", "tutorial", "best practices", "2026"],
        tags: [topicInfo.id, "learning"],
        readingTime: readingTime,
        category: topicInfo.id,
        aiGenerated: true
    };
}

// Generate multiple blog posts
async function generateMultiplePosts(topic, count = 1, internalLinks = []) {
    if (!openai) {
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

module.exports = {
    generateBlogPost,
    generateMultiplePosts,
    getTopics,
    isOpenAIAvailable,
    BLOG_TOPICS
};
