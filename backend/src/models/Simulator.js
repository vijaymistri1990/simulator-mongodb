const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const topicSchema = new mongoose.Schema({
    simulator_type: {
        type: Number,
        required: true,
        enum: [1, 2, 3, 4, 5] // 1: default, 2: question, 3: link with description, 4: video, 5: image
    },
    location: {
        type: String,
        required: true
    },
    slider_type: {
        type: String,
        required: true
    },
    slider_name: {
        type: String,
        required: true
    },
    slider_result_json: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    final_result_show: {
        type: Boolean,
        default: false
    },
    final_result: {
        type: String
    },
    // For video type (type 4)
    more_videos: [{
        link: String,
        metadata: mongoose.Schema.Types.Mixed
    }],
    // For image type (type 5)
    scrb_link: String,
    image_path: String,
    // For question type (type 2)
    question_type: String,
    questions: [{
        question: String,
        options: [String],
        correct_answer: String
    }],
    // For link with description type (type 3)
    link_with_description: {
        link: String,
        description: String
    },
    // For default type (type 1)
    link: String,
    link_metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const simulatorSchema = new mongoose.Schema({
    query: {
        type: String,
        required: true
    },
    locale: {
        type: String,
        required: true
    },
    user_location: {
        type: String,
        required: true
    },
    longtitude: {
        type: Number
    },
    latitude: {
        type: Number
    },
    result_show: {
        type: Boolean,
        default: false
    },
    result: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    topics: [topicSchema]
}, { timestamps: true });

// Indexes
simulatorSchema.index({ query: 1, locale: 1 }, { unique: true });
simulatorSchema.index({ status: 1 });
simulatorSchema.index({ createdAt: -1 });

// Methods
simulatorSchema.methods.addTopic = async function (topicData) {
    this.topics.push(topicData);
    return this.save();
};

simulatorSchema.methods.updateTopic = async function (topicId, updateData) {
    const topic = this.topics.id(topicId);
    if (!topic) {
        throw new Error('Topic not found');
    }
    Object.assign(topic, updateData);
    return this.save();
};

simulatorSchema.methods.deleteTopic = async function (topicId) {
    this.topics.pull(topicId);
    return this.save();
};

// Static methods
simulatorSchema.statics.findByQueryAndLocale = async function (query, locale) {
    return this.findOne({ query, locale });
};

simulatorSchema.statics.findActive = async function () {
    return this.find({ status: 'active' });
};

const Simulator = mongoose.model('Simulator', simulatorSchema);

module.exports = Simulator;

