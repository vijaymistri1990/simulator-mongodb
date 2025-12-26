const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const simulatorUserDataSchema = new mongoose.Schema({
    simulatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulator',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    simulatorResult: {
        type: Number,
        default: null
    },
    type: {
        type: Number,
        default: 0
    },
    sxsOutcome: {
        type: Number,
        default: null
    },
    nmOutcome: {
        type: Number,
        default: null
    },
    simulatorComment: {
        type: String,
        default: null
    },
    simulatorTopicResult: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
});

// Compound index for simulatorId, userId, and type
simulatorUserDataSchema.index({ simulatorId: 1, userId: 1, type: 1 });
simulatorUserDataSchema.index({ userId: 1, type: 1 });

class SimulatorUserData extends BaseModel {
    constructor() {
        super(simulatorUserDataSchema, 'SimulatorUserData');
    }

    async getUserDataBySimulatorAndUser(simulatorId, userId) {
        try {
            return await this.model.findOne({ simulatorId, userId });
        } catch (error) {
            throw error;
        }
    }

    async getUserDataByUserAndType(userId, type) {
        try {
            return await this.model.find({ userId, type });
        } catch (error) {
            throw error;
        }
    }

    async getNextSimulatorId(userId, type, language, simulatorIds) {
        try {
            const userData = await this.model.find({ userId, type }).select('simulatorId');
            const completedSimulatorIds = userData.map(data => data.simulatorId.toString());
            
            const nextSimulator = await mongoose.model('Simulator').findOne({
                _id: { $nin: completedSimulatorIds },
                locale: language,
                status: 'active'
            }).select('_id').limit(1);
            
            return nextSimulator ? nextSimulator._id : null;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new SimulatorUserData();

