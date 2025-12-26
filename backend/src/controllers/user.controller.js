const User = require('../models/User');
const Simulator = require('../models/Simulator');
const SimulatorPerformance = require('../models/SimulatorPerformance');
const SimulatorWork = require('../models/SimulatorWork');
const { handleSuccess, handleError } = require('../utils/responseHandler');
const config = require('../config/config');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const userController = {
    // Sign in user
    async signIn(req, res) {
        try {
            const { user_name, password } = req.body;

            if (!user_name || !password) {
                return handleError(res, 400, 'User name and password are required');
            }

            // Find user by user_name (case-sensitive match as per MongoDB document)
            const user = await User.model.findOne({ user_name: user_name });
            if (!user) {
                return handleError(res, 401, 'Invalid credentials');
            }

            // Compare password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return handleError(res, 401, 'Invalid credentials');
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user._id.toString(),
                    user_name: user.user_name,
                    type: user.type
                },
                config.secret,
                { expiresIn: '24h' }
            );

            return handleSuccess(res, 200, 'Login successful', {
                token,
                user: {
                    id: user._id.toString(),
                    user_name: user.user_name,
                    name: user.name || '',
                    type: user.type
                }
            });
        } catch (error) {
            logger.error('Error in signIn:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get simulator topics list
    async simulatorTopicsList(req, res) {
        try {
            const { simulator_id } = req.query;
            if (!simulator_id) {
                return handleError(res, 400, 'Simulator ID is required');
            }

            const simulator = await Simulator.findById(simulator_id)
                .select('topics query locale');

            if (!simulator) {
                return handleError(res, 404, 'Simulator not found');
            }

            return handleSuccess(res, 200, 'Topics fetched successfully', {
                simulator_id: simulator._id,
                query: simulator.query,
                locale: simulator.locale,
                topics: simulator.topics
            });
        } catch (error) {
            logger.error('Error in simulatorTopicsList:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get simulator topic data
    async simulatorTopicsData(req, res) {
        try {
            const { simulator_id, topic_id } = req.query;
            if (!simulator_id || !topic_id) {
                return handleError(res, 400, 'Simulator ID and Topic ID are required');
            }

            const simulator = await Simulator.findOne({
                _id: simulator_id,
                'topics._id': topic_id
            });

            if (!simulator) {
                return handleError(res, 404, 'Topic not found');
            }

            const topic = simulator.topics.id(topic_id);
            return handleSuccess(res, 200, 'Topic data fetched successfully', topic);
        } catch (error) {
            logger.error('Error in simulatorTopicsData:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Submit simulator topic sub data
    async simulatorTopicsSubData(req, res) {
        try {
            const { simulator_id, topic_id, user_data } = req.body;
            const userId = res.locals.user_id;

            if (!simulator_id || !topic_id) {
                return handleError(res, 400, 'Simulator ID and Topic ID are required');
            }

            // Here you can save user submission data if needed
            // For now, just return success
            return handleSuccess(res, 200, 'Data submitted successfully', {
                simulator_id,
                topic_id,
                user_id: userId
            });
        } catch (error) {
            logger.error('Error in simulatorTopicsSubData:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Reset simulator data
    async simulatorTopicsReset(req, res) {
        try {
            const { simulator_id } = req.body;
            const userId = res.locals.user_id;

            if (!simulator_id) {
                return handleError(res, 400, 'Simulator ID is required');
            }

            // Reset user's performance and work data for this simulator
            // This is a placeholder - implement based on your requirements
            return handleSuccess(res, 200, 'Simulator data reset successfully');
        } catch (error) {
            logger.error('Error in simulatorTopicsReset:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get performance result
    async performanceResult(req, res) {
        try {
            const userId = res.locals.user_id;
            const { month } = req.query;

            let query = { user_id: userId };
            if (month) {
                query.month = parseInt(month);
            }

            const performanceData = await SimulatorPerformance.model.find(query)
                .sort({ month: 1 });

            return handleSuccess(res, 200, 'Performance data fetched successfully', performanceData);
        } catch (error) {
            logger.error('Error in performanceResult:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Update performance result
    async performanceResultUpdate(req, res) {
        try {
            const userId = res.locals.user_id;
            const { month, performance, metrics, notes } = req.body;

            if (!month) {
                return handleError(res, 400, 'Month is required');
            }

            const performanceData = await SimulatorPerformance.updatePerformance(
                userId,
                parseInt(month),
                {
                    performance,
                    metrics,
                    notes
                }
            );

            if (!performanceData) {
                return handleError(res, 404, 'Performance data not found');
            }

            return handleSuccess(res, 200, 'Performance updated successfully', performanceData);
        } catch (error) {
            logger.error('Error in performanceResultUpdate:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get work sheet
    async worksheet(req, res) {
        try {
            const userId = res.locals.user_id;
            const { month } = req.query;

            let query = { user_id: userId };
            if (month) {
                query.month = parseInt(month);
            }

            const workData = await SimulatorWork.model.find(query)
                .sort({ month: 1 });

            return handleSuccess(res, 200, 'Work sheet data fetched successfully', workData);
        } catch (error) {
            logger.error('Error in worksheet:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Update work sheet
    async worksheetUpdate(req, res) {
        try {
            const userId = res.locals.user_id;
            const { month, work_hours, tasks, notes } = req.body;

            if (!month) {
                return handleError(res, 400, 'Month is required');
            }

            // Convert tasks completedAt to completed_at if needed
            const processedTasks = tasks ? tasks.map(task => {
                if (task.completedAt) {
                    task.completed_at = task.completedAt;
                    delete task.completedAt;
                }
                if (task.correctAnswer) {
                    task.correct_answer = task.correctAnswer;
                    delete task.correctAnswer;
                }
                return task;
            }) : undefined;

            const workData = await SimulatorWork.updateWork(
                userId,
                parseInt(month),
                {
                    work_hours,
                    tasks: processedTasks,
                    notes
                }
            );

            if (!workData) {
                return handleError(res, 404, 'Work sheet data not found');
            }

            return handleSuccess(res, 200, 'Work sheet updated successfully', workData);
        } catch (error) {
            logger.error('Error in worksheetUpdate:', error);
            return handleError(res, 500, 'Internal server error');
        }
    }
};

module.exports = userController;

