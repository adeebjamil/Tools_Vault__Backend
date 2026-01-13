const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxLength: [255, 'Title cannot exceed 255 characters']
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    content: {
        type: String,
        required: [true, 'Content is required']
    },
    excerpt: {
        type: String,
        maxLength: [500, 'Excerpt cannot exceed 500 characters']
    },
    metaTitle: {
        type: String,
        maxLength: [100, 'Meta title cannot exceed 100 characters']
    },
    metaDescription: {
        type: String,
        maxLength: [200, 'Meta description cannot exceed 200 characters']
    },
    keywords: [{
        type: String
    }],
    featuredImage: {
        type: String,
        default: null
    },
    category: {
        type: String,
        default: 'general'
    },
    tags: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    authorId: {
        type: String,
        default: 'admin'
    },
    readingTime: {
        type: Number,
        default: 5
    },
    aiGenerated: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    publishedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for better query performance
BlogPostSchema.index({ status: 1 });
BlogPostSchema.index({ slug: 1 });
BlogPostSchema.index({ category: 1 });
BlogPostSchema.index({ createdAt: -1 });

// Static method to generate unique slug
BlogPostSchema.statics.generateSlug = async function (title) {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingSlugs = await this.find({ slug: new RegExp(`^${slug}`) }).select('slug');

    if (existingSlugs.length > 0) {
        slug = `${slug}-${existingSlugs.length + 1}`;
    }

    return slug;
};

// Static method to get count by status
BlogPostSchema.statics.getCountByStatus = async function () {
    const drafts = await this.countDocuments({ status: 'draft' });
    const published = await this.countDocuments({ status: 'published' });

    return {
        drafts,
        published,
        total: drafts + published
    };
};

module.exports = mongoose.model('BlogPost', BlogPostSchema);
