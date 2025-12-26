const User = require('../models/User');
const SimulatorPerformance = require('../models/SimulatorPerformance');
const SimulatorWork = require('../models/SimulatorWork');
const SimulatorUserData = require('../models/SimulatorUserData');
const { handleSuccess, handleError } = require('../utils/responseHandler');
const config = require('../config/config');
const logger = require('../utils/logger');
const common = require('common-utils');
const { db } = require('../helper');

const adminController = {
    // Create new user
    async newUser(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const reqData = req.body;

            if (!common.isRealValue(reqData)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            // Check if user_name already exists
            const checkExistUser = await User.model.findOne({ user_name: reqData.user_name });
            if (checkExistUser) {
                return handleError(res, statusCode.OK, en.USER_NAME_ALREADY_EXITS);
            }

            // Create new user (password will be hashed by pre-save hook)
            const user = await User.model.create({
                name: reqData.name,
                user_name: reqData.user_name,
                password: reqData.password,
                type: '0' // default to user
            });

            // Create performance and work sheets for the user (12 months)
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

            return handleSuccess(res, statusCode.OK, en.DATA_FETCH_SUCCESSFULLY, []);
        } catch (error) {
            logger.error('Error in newUser:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Get user list with pagination
    async userList(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const { limit = 10, page = 1 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);

            const [userData, totalData] = await Promise.all([
                User.model.find()
                    .sort({ _id: 1 })
                    .skip(skip)
                    .limit(Number(limit)),
                User.model.countDocuments()
            ]);

            if (userData.length > 0 && totalData) {
                // Remove password from response
                const sanitizedUserData = userData.map(user => {
                    const userObj = user.toObject();
                    delete userObj.password;
                    return userObj;
                });

                const data = {
                    user_data: sanitizedUserData || [],
                    total_data: totalData
                };

                return handleSuccess(res, statusCode.OK, en.DATA_FETCH_SUCCESSFULLY, data);
            } else {
                return handleError(res, statusCode.OK, en.ERROR_NO_DATA_FOUND);
            }
        } catch (error) {
            logger.error('Error in userList:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Delete user and related data
    async deleteUser(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const reqData = req.body;

            if (!common.isRealValue(reqData)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const userId = reqData.id;

            // Delete user and all related data
            const [deleteUser, deleteSimulatorUserData, deletePerformanceData, deleteWorkData] = await Promise.all([
                User.model.findByIdAndDelete(userId),
                SimulatorUserData.model.deleteMany({ userId }),
                SimulatorPerformance.model.deleteMany({ user_id: userId }),
                SimulatorWork.model.deleteMany({ user_id: userId })
            ]);

            if (deleteUser) {
                return handleSuccess(res, statusCode.OK, en.USER_DELETE_SUCCESSFULLY, []);
            } else {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }
        } catch (error) {
            logger.error('Error in deleteUser:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Update user
    async updateUser(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const reqData = req.body;

            if (!common.isRealValue(reqData)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const userId = reqData.id;
            const checkExistUser = await User.model.findById(userId);

            if (!checkExistUser) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            // Check if user_name is already taken by another user
            const checkExistUserName = await User.model.findOne({
                user_name: reqData.user_name,
                _id: { $ne: userId }
            });

            if (checkExistUserName && checkExistUser.user_name !== reqData.user_name) {
                return handleError(res, statusCode.OK, en.USER_NAME_ALREADY_EXITS);
            }

            const updateUser = await User.model.findByIdAndUpdate(
                userId,
                {
                    user_name: reqData.user_name,
                    name: reqData.name
                },
                { new: true }
            ).select('-password');

            if (updateUser) {
                return handleSuccess(res, statusCode.OK, en.USER_UPDATE_SUCCESSFULLY, []);
            } else {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }
        } catch (error) {
            logger.error('Error in updateUser:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Update user password
    async updatePassword(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const reqData = req.body;

            if (!common.isRealValue(reqData)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const userId = reqData.id;

            if (reqData.password !== reqData.confirm_password) {
                return handleError(res, statusCode.OK, en.PASSWORD_NOT_MATCH);
            }

            const checkExistUser = await User.model.findById(userId);
            if (!checkExistUser) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            // Update password (will be hashed by pre-save hook)
            checkExistUser.password = reqData.confirm_password;
            await checkExistUser.save();

            return handleSuccess(res, statusCode.OK, en.PASSWORD_CHANGE_SUCCESSFULLY, []);
        } catch (error) {
            logger.error('Error in updatePassword:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    }
};

module.exports = adminController;
