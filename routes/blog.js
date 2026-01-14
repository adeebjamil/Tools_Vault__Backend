const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const { generateBlogPost, generateMultiplePosts, getTopics, isOpenAIAvailable } = require('../services/openaiService');

// Middleware to check if user is admin (simplified)
const isAdmin = (req, res, next) => {
    // In production, verify JWT token and check admin role
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === process.env.ADMIN_SECRET_KEY || process.env.NODE_ENV !== 'production') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Admin access required' });
    }
};

// ==========================================
// PUBLIC ROUTES (for blog page)
// ==========================================

// Get all published posts
router.get('/public', async (req, res) => {
    try {
        const { limit, category } = req.query;

        let query = BlogPost.find({ status: 'published' });

        if (category) {
            query = query.where('category').equals(category);
        }

        query = query.sort({ createdAt: -1 });

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const posts = await query.select('title slug excerpt featuredImage category tags readingTime publishedAt createdAt');

        res.json({
            success: true,
            count: posts.length,
            data: posts
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single published post by slug
router.get('/public/:slug', async (req, res) => {
    try {
        const post = await BlogPost.findOne({
            slug: req.params.slug,
            status: 'published'
        });

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        // Increment views
        post.views += 1;
        await post.save();

        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

const Topic = require('../models/Topic');

// Get blog stats
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const total = await BlogPost.countDocuments();
        const drafts = await BlogPost.countDocuments({ status: 'draft' });
        const published = await BlogPost.countDocuments({ status: 'published' });

        res.json({
            success: true,
            data: {
                total,
                drafts,
                published
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available topics (from DB + Defaults)
router.get('/topics', isAdmin, async (req, res) => {
    try {
        // Fetch from DB
        let dbTopics = await Topic.find().sort({ name: 1 });

        // Default topics from Service
        const defaultTopics = getTopics();

        // Merge: If DB has topics, use them. We can also choose to always show defaults. 
        // Let's decide to SHOW BOTH (deduplicated by ID) or just DB if user created some.
        // User request: "topics should be shown to us while creating AI post".
        // Strategy: Combine DB topics with Default topics.

        const allTopicsMap = new Map();

        // Add defaults first
        defaultTopics.forEach(t => allTopicsMap.set(t.id, t));

        // Add/Overwrite with DB topics
        dbTopics.forEach(t => allTopicsMap.set(t.id, t.toObject ? t.toObject() : t));

        const combinedTopics = Array.from(allTopicsMap.values());

        res.json({
            success: true,
            data: combinedTopics,
            aiAvailable: isOpenAIAvailable()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new topic
router.post('/topics', isAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        // Generate ID from name
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '', '');

        const existingTopic = await Topic.findOne({ id });
        if (existingTopic) {
            return res.status(400).json({ success: false, error: 'Topic already exists' });
        }

        const topic = await Topic.create({
            id,
            name,
            description: description || name
        });

        res.status(201).json({ success: true, data: topic });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update a topic
router.put('/topics/:id', isAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;

        const topic = await Topic.findOne({ id: req.params.id });

        if (!topic) {
            return res.status(404).json({ success: false, error: 'Topic not found' });
        }

        if (name) topic.name = name;
        if (description) topic.description = description;

        await topic.save();

        res.json({ success: true, data: topic });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a topic
router.delete('/topics/:id', isAdmin, async (req, res) => {
    try {
        const topic = await Topic.findOneAndDelete({ id: req.params.id });

        if (!topic) {
            return res.status(404).json({ success: false, error: 'Topic not found' });
        }

        res.json({ success: true, message: 'Topic deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all posts (admin - includes drafts)
router.get('/', isAdmin, async (req, res) => {
    try {
        const { status } = req.query;

        let query = BlogPost.find();

        if (status) {
            query = query.where('status').equals(status);
        }

        const posts = await query.sort({ createdAt: -1 });
        const counts = await BlogPost.getCountByStatus();

        res.json({
            success: true,
            counts,
            data: posts
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single post by ID (admin)
router.get('/:id', isAdmin, async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create post manually
router.post('/', isAdmin, async (req, res) => {
    try {
        const slug = await BlogPost.generateSlug(req.body.title);
        const post = await BlogPost.create({
            ...req.body,
            slug,
            authorId: req.body.authorId || 'admin'
        });

        res.status(201).json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update post
router.put('/:id', isAdmin, async (req, res) => {
    try {
        const post = await BlogPost.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete post
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const post = await BlogPost.findByIdAndDelete(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Publish post
router.post('/:id/publish', isAdmin, async (req, res) => {
    try {
        const post = await BlogPost.findByIdAndUpdate(
            req.params.id,
            {
                status: 'published',
                publishedAt: new Date()
            },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        res.json({ success: true, data: post, message: 'Post published successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Unpublish post (move to draft)
router.post('/:id/unpublish', isAdmin, async (req, res) => {
    try {
        const post = await BlogPost.findByIdAndUpdate(
            req.params.id,
            { status: 'draft' },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        res.json({ success: true, data: post, message: 'Post moved to drafts' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// AI GENERATION ROUTES
// ==========================================

// Generate posts using AI
router.post('/generate', isAdmin, async (req, res) => {
    try {
        const { topic, count = 1, internalLinks = [] } = req.body;

        if (!isOpenAIAvailable()) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.'
            });
        }

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        if (count < 1 || count > 10) {
            return res.status(400).json({ success: false, error: 'Count must be between 1 and 10' });
        }

        // Generate posts using OpenAI
        const results = await generateMultiplePosts(topic, count, internalLinks);

        // Save successful generations to database as drafts
        const savedPosts = [];
        const errors = [];

        for (const result of results) {
            if (result.success) {
                try {
                    const slug = await BlogPost.generateSlug(result.data.title);
                    const post = await BlogPost.create({
                        title: result.data.title,
                        slug,
                        content: result.data.content,
                        excerpt: result.data.excerpt,
                        metaTitle: result.data.metaTitle,
                        metaDescription: result.data.metaDescription,
                        keywords: result.data.keywords,
                        category: result.data.category,
                        tags: result.data.tags,
                        readingTime: result.data.readingTime,
                        aiGenerated: true,
                        status: 'draft',
                        authorId: 'ai-generator'
                    });
                    savedPosts.push(post);
                } catch (saveError) {
                    errors.push({ title: result.data.title, error: saveError.message });
                }
            } else {
                errors.push({ error: result.error });
            }
        }

        res.json({
            success: true,
            message: `Generated ${savedPosts.length} posts successfully`,
            data: {
                generated: savedPosts.length,
                failed: errors.length,
                posts: savedPosts,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate single post preview (without saving)
router.post('/generate/preview', isAdmin, async (req, res) => {
    try {
        const { topic, internalLinks = [] } = req.body;

        if (!isOpenAIAvailable()) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI API key not configured'
            });
        }

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        const result = await generateBlogPost(topic, 1, internalLinks);

        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
