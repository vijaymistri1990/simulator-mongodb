const User = require('../models/User');
const Simulator = require('../models/Simulator');
const SimulatorPerformance = require('../models/SimulatorPerformance');
const SimulatorWork = require('../models/SimulatorWork');
const SimulatorUserData = require('../models/SimulatorUserData');
const { handleSuccess, handleError } = require('../utils/responseHandler');
const config = require('../config/config');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const common = require('common-utils');
const { db } = require('../helper');

const userController = {
    // Sign in user
    async signIn(req, res) {
        try {
            const { user_name, password } = req.body;
            const { status_code_config: statusCode, en_message_config: en } = config;

            if (!user_name || !password) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            // Find user by user_name
            const user = await User.model.findOne({ user_name });
            if (!user) {
                return handleError(res, statusCode.OK, en.ERROR_NO_DATA_FOUND);
            }

            // Compare password using bcrypt
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return handleError(res, statusCode.OK, en.WRONG_PASSWORD);
            }

            // Generate JWT token
            const tokenData = {
                user_name: user.user_name,
                name: user.name,
                id: user._id.toString(),
                user: (user.type === '1') ? 1 : 0
            };

            jwt.sign(tokenData, config.secret, { expiresIn: 1440 * 60 }, (err, security_token) => {
                if (err) {
                    logger.error('JWT sign error:', err);
                    return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
                } else {
                    res.setHeader("security_token", Buffer.from(security_token).toString('base64'));
                    const return_data = {
                        user_data: tokenData,
                        token: Buffer.from(security_token).toString('base64')
                    };
                    return handleSuccess(res, statusCode.OK, en.LOGIN_SUCESSFULLY, return_data);
                }
            });
        } catch (error) {
            logger.error('Error in signIn:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Get simulator topics list
    async simulatorTopicsList(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const { limit = 10, page = 1, language } = req.query;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(res.locals.user_name) || !common.isRealValue(language)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const skip = (Number(page) - 1) * Number(limit);
            const type = (language === 'English(in)') ? 1 : 0;

            // Get user submitted data
            const userSubData = await SimulatorUserData.model.find({ userId, type });

            // Get simulators by locale and status
            const [simulatorData, totalData] = await Promise.all([
                Simulator.find({ status: 'active', locale: language })
                    .sort({ _id: 1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Simulator.countDocuments({ status: 'active', locale: language })
            ]);

            if (simulatorData.length > 0 && totalData) {
                let startSimulatorId = simulatorData[0]?._id;

                // Find next simulator ID that user hasn't completed
                if (userSubData.length > 0) {
                    const userSubIds = userSubData.map(data => data.simulatorId.toString());
                    const nextSimulator = await Simulator.findOne({
                        _id: { $nin: userSubIds },
                        locale: language,
                        status: '1'
                    }).select('_id').limit(1);

                    if (nextSimulator) {
                        startSimulatorId = nextSimulator._id;
                    }
                }

                const data = {
                    user_data: simulatorData || [],
                    total_data: totalData,
                    user_sub_data: userSubData || [],
                    start_simulator_id: startSimulatorId
                };

                return handleSuccess(res, statusCode.OK, en.DATA_FETCH_SUCCESSFULLY, data);
            } else {
                return handleError(res, statusCode.OK, en.ERROR_NO_DATA_FOUND);
            }
        } catch (error) {
            logger.error('Error in simulatorTopicsList:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Get simulator topic data
    async simulatorTopicsData(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const { simulator_id } = req.query;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(res.locals.user_name) || !common.isRealValue(simulator_id)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            // Get simulator data
            const simulatorData = await Simulator.findById(simulator_id);
            if (!simulatorData) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            // Get all active simulator IDs (status '1' = active)
            const simulatorIds = await Simulator.find({ status: '1' }).select('_id');
            const simulatorIdData = simulatorIds.map(s => s._id.toString());

            // Get simulator topics (embedded in simulator)
            const simulatorTopicsData = simulatorData.topics || [];

            // Get user submitted data for this simulator
            const userSubData = await SimulatorUserData.model.find({ simulatorId: simulator_id, userId });

            if (simulatorTopicsData.length > 0 && simulatorData) {
                const data = {
                    simulator_topics_data: simulatorTopicsData,
                    simulator_data: simulatorData,
                    user_sub_data: userSubData || [],
                    length: simulatorTopicsData.length,
                    simulator_id_data: simulatorIdData
                };

                return handleSuccess(res, statusCode.OK, en.DATA_FETCH_SUCCESSFULLY, data);
            } else {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }
        } catch (error) {
            logger.error('Error in simulatorTopicsData:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Submit simulator topic sub data
    async simulatorTopicsSubData(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const reqData = req.body;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(res.locals.user_name) || !common.isRealValue(reqData)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const data = {
                simulatorId: reqData?.simulator_id,
                userId: userId,
                simulatorResult: reqData?.simulator_result,
                simulatorComment: reqData?.simulator_comment,
                type: reqData?.type,
                sxsOutcome: reqData?.sxs_outcome,
                nmOutcome: reqData?.nm_outcome,
                simulatorTopicResult: reqData?.simulator_topic_result
            };

            const insertSimulatorUserData = await SimulatorUserData.model.create(data);

            if (insertSimulatorUserData) {
                return handleSuccess(res, statusCode.OK, en.DATA_ADD_SUCCESSFULLY, []);
            } else {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }
        } catch (error) {
            logger.error('Error in simulatorTopicsSubData:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Reset simulator data
    async simulatorTopicsReset(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const { type } = req.body;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(res.locals.user_name)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const deleteUserSubData = await SimulatorUserData.model.deleteMany({ userId, type });

            if (deleteUserSubData) {
                return handleSuccess(res, statusCode.OK, en.DATA_FETCH_SUCCESSFULLY, []);
            } else {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }
        } catch (error) {
            logger.error('Error in simulatorTopicsReset:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Get performance result
    async performanceResult(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(res.locals.user_name)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const performanceResultData = await SimulatorPerformance.model.find({ userId })
                .select('_id userId month result')
                .sort({ month: 1 });

            if (performanceResultData.length > 0) {
                return handleSuccess(res, statusCode.OK, en.DATA_RESET_SUCCESSFULLY, performanceResultData);
            } else {
                return handleError(res, statusCode.OK, en.ERROR_NO_DATA_FOUND);
            }
        } catch (error) {
            logger.error('Error in performanceResult:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Update performance result
    async performanceResultUpdate(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const reqData = req.body;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(reqData.id) || !common.checkValues(reqData.result)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const updatePerformanceData = await SimulatorPerformance.model.findOneAndUpdate(
                { userId, _id: reqData.id },
                { $set: { result: reqData.result } },
                { new: true }
            );

            if (updatePerformanceData) {
                return handleSuccess(res, statusCode.OK, en.DATA_UPDATE_SUCCESSFULLY, []);
            } else {
                return handleError(res, statusCode.OK, en.ERROR_NO_DATA_FOUND);
            }
        } catch (error) {
            logger.error('Error in performanceResultUpdate:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Get work sheet
    async worksheet(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(res.locals.user_name)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const workResultData = await SimulatorWork.model.find({ userId })
                .select('_id userId month result')
                .sort({ month: 1 });

            if (workResultData.length > 0) {
                return handleSuccess(res, statusCode.OK, en.DATA_FETCH_SUCCESSFULLY, workResultData);
            } else {
                return handleError(res, statusCode.OK, en.ERROR_NO_DATA_FOUND);
            }
        } catch (error) {
            logger.error('Error in worksheet:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    },

    // Update work sheet
    async worksheetUpdate(req, res) {
        try {
            const { status_code_config: statusCode, en_message_config: en } = config;
            const reqData = req.body;
            const userId = res.locals.user_id;

            if (!common.checkValues(userId) || !common.checkValues(reqData.id) || !common.checkValues(reqData.result)) {
                return handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
            }

            const updateWorkData = await SimulatorWork.model.findOneAndUpdate(
                { userId, _id: reqData.id },
                { $set: { result: reqData.result } },
                { new: true }
            );

            if (updateWorkData) {
                return handleSuccess(res, statusCode.OK, en.DATA_UPDATE_SUCCESSFULLY, []);
            } else {
                return handleError(res, statusCode.OK, en.ERROR_NO_DATA_FOUND);
            }
        } catch (error) {
            logger.error('Error in worksheetUpdate:', error);
            return handleError(res, config.status_code_config.BAD_REQUEST, config.en_message_config.ERROR_SOMETHING_WRONG);
        }
    }
};

module.exports = userController;
