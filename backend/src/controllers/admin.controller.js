const User = require('../models/User');
const SimulatorPerformance = require('../models/SimulatorPerformance');
const SimulatorWork = require('../models/SimulatorWork');
const { handleSuccess, handleError } = require('../utils/responseHandler');
const config = require('../config/config');
const logger = require('../utils/logger');

const adminController = {
    // Create new user
    async newUser(req, res) {
        try {
            const { name, user_name, password, type } = req.body;

            // Check if user_name already exists
            const existingUserByUsername = await User.model.findOne({ user_name });
            if (existingUserByUsername) {
                return handleError(res, 400, 'User name already exists');
            }

            // Create new user
            const user = await User.model.create({
                name,
                user_name,
                password,
                type: type || '0'
            });

            // Create performance and work sheets for the user
            const months = Array.from({ length: 12 }, (_, i) => i + 1);
            const performanceSheets = months.map(month => ({
                user_id: user._id,
                month
            }));
            const workSheets = months.map(month => ({
                user_id: user._id,
                month
            }));

            await Promise.all([
                SimulatorPerformance.model.insertMany(performanceSheets),
                SimulatorWork.model.insertMany(workSheets)
            ]);

            return handleSuccess(res, 201, 'User created successfully', { user });
        } catch (error) {
            logger.error('Error in newUser:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get user list with pagination
    async userList(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [users, total] = await Promise.all([
                User.model.find()
                    .select('-password')
                    .skip(skip)
                    .limit(parseInt(limit))
                    .sort({ createdAt: -1 }),
                User.model.countDocuments()
            ]);

            return handleSuccess(res, 200, 'Users fetched successfully', {
                users,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            });
        } catch (error) {
            logger.error('Error in userList:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Delete user and related data
    async deleteUser(req, res) {
        try {
            const { id } = req.body;

            const [user, performanceSheets, workSheets] = await Promise.all([
                User.model.findByIdAndDelete(id),
                SimulatorPerformance.model.deleteMany({ user_id: id }),
                SimulatorWork.model.deleteMany({ user_id: id })
            ]);

            if (!user) {
                return handleError(res, 404, 'User not found');
            }

            return handleSuccess(res, 200, 'User deleted successfully');
        } catch (error) {
            logger.error('Error in deleteUser:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Update user
    async updateUser(req, res) {
        try {
            const { id, user_name, name } = req.body;

            // Check if user_name is already taken by another user
            const existingUser = await User.model.findOne({
                user_name,
                _id: { $ne: id }
            });

            if (existingUser) {
                return handleError(res, 400, 'User name already exists');
            }

            const user = await User.model.findByIdAndUpdate(
                id,
                { user_name, name },
                { new: true }
            ).select('-password');

            if (!user) {
                return handleError(res, 404, 'User not found');
            }

            return handleSuccess(res, 200, 'User updated successfully', { user });
        } catch (error) {
            logger.error('Error in updateUser:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Update user password
    async updatePassword(req, res) {
        try {
            const { id, password, confirmPassword } = req.body;

            if (password !== confirmPassword) {
                return handleError(res, 400, 'Passwords do not match');
            }

            const user = await User.model.findById(id);
            if (!user) {
                return handleError(res, 404, 'User not found');
            }

            user.password = password;
            await user.save();

            return handleSuccess(res, 200, 'Password updated successfully');
        } catch (error) {
            logger.error('Error in updatePassword:', error);
            return handleError(res, 500, 'Internal server error');
        }
    }
};

module.exports = adminController;

