const mongoose = require('mongoose');

class BaseModel {
    constructor(schema, modelName) {
        this.schema = schema;
        this.modelName = modelName;
        // Check if model already exists to avoid overwriting
        if (mongoose.models[modelName]) {
            this.model = mongoose.models[modelName];
        } else {
            this.model = mongoose.model(modelName, this.schema);
        }
    }

    async create(data) {
        try {
            const document = new this.model(data);
            return await document.save();
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        try {
            return await this.model.findById(id);
        } catch (error) {
            throw error;
        }
    }

    async findOne(query) {
        try {
            return await this.model.findOne(query);
        } catch (error) {
            throw error;
        }
    }

    async find(query = {}, options = {}) {
        try {
            return await this.model.find(query, null, options);
        } catch (error) {
            throw error;
        }
    }

    async update(id, data) {
        try {
            return await this.model.findByIdAndUpdate(id, data, { new: true });
        } catch (error) {
            throw error;
        }
    }

    async delete(id) {
        try {
            return await this.model.findByIdAndDelete(id);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = BaseModel;

