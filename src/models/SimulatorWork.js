const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const simulatorWorkSchema = new mongoose.Schema({
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
    work_hours: {
        type: Number,
        default: 0
    },
    result: {
        type: String,
        default: null
    },
    tasks: [{
        title: String,
        description: String,
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending'
        },
        completed_at: Date
    }],
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Compound index for user_id and month
simulatorWorkSchema.index({ user_id: 1, month: 1 }, { unique: true });

class SimulatorWork extends BaseModel {
    constructor() {
        super(simulatorWorkSchema, 'SimulatorWork');
    }

    async getWorkByUserAndMonth(userId, month) {
        try {
            return await this.model.findOne({ user_id: userId, month });
        } catch (error) {
            throw error;
        }
    }

    async updateWork(userId, month, data) {
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

    async addTask(userId, month, task) {
        try {
            return await this.model.findOneAndUpdate(
                { user_id: userId, month },
                { $push: { tasks: task } },
                { new: true }
            );
        } catch (error) {
            throw error;
        }
    }

    async updateTask(userId, month, taskId, taskData) {
        try {
            return await this.model.findOneAndUpdate(
                {
                    user_id: userId,
                    month,
                    'tasks._id': taskId
                },
                {
                    $set: {
                        'tasks.$': taskData
                    }
                },
                { new: true }
            );
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new SimulatorWork();

