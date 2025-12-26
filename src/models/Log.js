const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    type: {
        type: String,
        default: 'general'
    },
    log: {
        type: String,
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
logSchema.index({ type: 1, createdAt: -1 });
logSchema.index({ createdAt: -1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;

