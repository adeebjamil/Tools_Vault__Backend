const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Please provide a topic ID (slug)'],
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Please provide a topic name'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Topic', topicSchema);
