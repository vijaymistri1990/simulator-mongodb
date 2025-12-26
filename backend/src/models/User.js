const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const BaseModel = require('./BaseModel');

const userSchema = new mongoose.Schema({
    user_name: {
        type: String,
        required: [true, 'User name is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    type: {
        type: String,
        enum: ['0', '1'],
        default: '0',
        comment: '0 = users, 1 = admin'
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

class User extends BaseModel {
    constructor() {
        super(userSchema, 'User');
    }
}

module.exports = new User();

