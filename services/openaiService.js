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
async function generateBlogPost(topic, postNumber = 1) {
    if (!openai) {
        return {
            success: false,
            error: 'AI API key not configured. Please add OPENROUTER_API_KEY or OPENAI_API_KEY to your .env file.'
        };
    }

    const topicInfo = BLOG_TOPICS.find(t => t.id === topic) || { name: topic, description: topic };

    const systemPrompt = `You are a Senior Tech Editor for ToolsVault, a premier developer tools platform.
Your task is to write high-quality, authoritative, and SEO-optimized blog posts that rank well on Google.
Writing Style:
- Professional, concise, and incredibly informative.
- Use active voice and strong transitions.
- Structure content with clear hierarchy (H2, H3).
- Include deep technical insights, not just surface-level fluff.`;

    const userPrompt = `Write a comprehensive, deep-dive blog post about "${topicInfo.name}" (${topicInfo.description}).

STRICT CONTENT REQUIREMENTS:
1. **Word Count**: Aim for 1200-1500 words of high-value content.
2. **SEO Optimization**:
   - Use the primary keyword naturally 3-4 times.
   - Include LSI (Latent Semantic Indexing) keywords related to ${topicInfo.name}.
   - Write a click-worthy title within 60 chars.
   - Write a compelling meta description (150-160 chars) that encourages clicks.
3. **Structure**:
   - **Introduction**: Hook the reader, define the problem, and state the article's value.
   - **Key Concepts**: Deep explanation of core ideas.
   - **Practical Examples**: Real-world use cases or Code Snippets (use markdown code blocks).
   - **Pros & Cons**: Balanced view (if applicable).
   - **Best Practices**: Expert advice for 2026.
   - **FAQ Section**: Answer 3 common questions about this topic.
   - **Conclusion**: Summary and call to action.
4. **Formatting**: Use Markdown for everything (Bold key terms, Lists for readability).

OUTPUT FORMAT (Valid JSON only):
{
  "title": "Optimized SEO Title",
  "excerpt": "Engaging summary for the blog card (no markdown)",
  "content": "Full markdown article content...",
  "metaTitle": "Title Tag for Google",
  "metaDescription": "Meta Description tag",
  "keywords": ["primary keyword", "lsi keyword 1", "lsi keyword 2", "tech", "guide"],
  "tags": ["tag1", "tag2"],
  "readingTime": number (estimated minutes)
}

Context: This is post #${postNumber} in a batch generation. Make it unique.`;

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
            max_tokens: 3000,
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

${topicInfo.name} has evolved significantly in recent years, becoming a cornerstone for modern development workflows. This guide will explore everything you need to know to master it in 2026.

## Why ${topicInfo.name} Matters

In today's fast-paced tech environment, efficiency is everything. ${topicInfo.name} offers:
*   **Scalability**: Handle growing demands with ease.
*   **Maintainability**: Write cleaner, more sustainable code.
*   **Speed**: Accelerate your development cycle.

## Core Concepts & Features

### 1. Advanced Architecture
Understanding the underlying structure is key. Most professionals overlook this, leading to technical debt.

### 2. Integration Patterns
How does it fit into your stack? 
\`\`\`javascript
// Example configuration for ${topicInfo.id}
const config = {
  enabled: true,
  mode: 'advanced',
  retryAttempts: 3
};
\`\`\`

## Best Practices for 2026

*   **Audit Regularly**: Ensure your implementation stays secure.
*   **Use Automation**: Don't do manually what scripts can handle.
*   **Stay Updated**: The ecosystem changes weekly.

## Common Pitfalls to Avoid

| Mistake | Solution |
| :--- | :--- |
| Ignoring documentation | Read the official guides first |
| Over-optimization | Build MVP, then refactor |
| Security laxity | Implement headers & auth early |

## Frequently Asked Questions

**Q: Is ${topicInfo.name} suitable for beginners?**
A: Absolutely! While it has depth, the basics are approachable.

**Q: How does it compare to competitors?**
A: It generally offers better performance in high-load scenarios.

## Conclusion

Mastering ${topicInfo.name} is a journey. By following these best practices, you'll be well on your way to becoming an expert.
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
async function generateMultiplePosts(topic, count = 1) {
    if (!openai) {
        return [{
            success: false,
            error: 'AI API key not configured'
        }];
    }

    const results = [];

    for (let i = 0; i < count; i++) {
        const result = await generateBlogPost(topic, i + 1);
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
