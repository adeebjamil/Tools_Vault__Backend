// OpenRouter Service - Uses OpenRouter API (OpenAI-compatible)
// OpenRouter provides access to multiple AI models through one API

let openai = null;

// Initialize with OpenRouter
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (apiKey) {
    const OpenAI = require('openai');
    openai = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.OPENROUTER_API_KEY
            ? 'https://openrouter.ai/api/v1'
            : 'https://api.openai.com/v1',
        defaultHeaders: process.env.OPENROUTER_API_KEY ? {
            'HTTP-Referer': 'https://toolsvault.com',
            'X-Title': 'ToolsVault Blog Generator',
        } : {},
    });
    console.log(`✅ AI Service initialized (${process.env.OPENROUTER_API_KEY ? 'OpenRouter' : 'OpenAI'})`);
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

    const systemPrompt = `You are an expert content writer for ToolsVault, a website offering free online developer tools. 
Write engaging, SEO-optimized blog posts that are informative and helpful.
Your writing style is professional yet approachable, with clear explanations and practical examples.`;

    const userPrompt = `Create a unique, comprehensive blog post about "${topicInfo.name}" (${topicInfo.description}).

Requirements:
1. Must be 100% unique and not copied content
2. Should be 800-1200 words
3. Include practical tips and examples
4. Make it engaging and easy to read
5. Focus on providing value to developers and tech enthusiasts

Please provide the response in the following JSON format:
{
  "title": "Catchy, SEO-friendly title (50-60 characters)",
  "excerpt": "Brief summary for preview cards (150-160 characters)",
  "content": "Full blog post content in Markdown format with proper headings (H2, H3), paragraphs, lists, and code blocks where appropriate",
  "metaTitle": "SEO meta title (50-60 characters)",
  "metaDescription": "SEO meta description (150-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tags": ["tag1", "tag2", "tag3"],
  "readingTime": estimated reading time in minutes (number)
}

Make this post unique - it's post #${postNumber} in a series about ${topicInfo.name}.`;

    try {
        const response = await openai.chat.completions.create({
            // Use a cost-effective model via OpenRouter
            model: process.env.OPENROUTER_API_KEY
                ? 'openai/gpt-4o-mini'  // OpenRouter model name format
                : 'gpt-4o-mini',        // Direct OpenAI format
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 2500,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0].message.content;
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
        console.error('AI API Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
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
