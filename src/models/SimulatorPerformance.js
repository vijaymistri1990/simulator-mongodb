const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const simulatorPerformanceSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    performance: {
        type: Number,
        default: 0
    },
    result: {
        type: String,
        default: null
    },
    metrics: {
        type: Map,
        of: Number,
        default: new Map()
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Compound index for user_id and month
simulatorPerformanceSchema.index({ user_id: 1, month: 1 }, { unique: true });

class SimulatorPerformance extends BaseModel {
    constructor() {
        super(simulatorPerformanceSchema, 'SimulatorPerformance');
    }

    async getPerformanceByUserAndMonth(userId, month) {
        try {
            return await this.model.findOne({ user_id: userId, month });
        } catch (error) {
            throw error;
        }
    }

    async updatePerformance(userId, month, data) {
        try {
            return await this.model.findOneAndUpdate(
                { user_id: userId, month },
                { $set: data },
                { new: true }
            );
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new SimulatorPerformance();

