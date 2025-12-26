const Simulator = require('../models/Simulator');
const { handleSuccess, handleError } = require('../utils/responseHandler');
const logger = require('../utils/logger');
const ogs = require('open-graph-scraper');
const fs = require('fs').promises;
const path = require('path');

const simulatorController = {
    // Create new simulator
    async newAddSimulator(req, res) {
        try {
            const {
                query,
                locale,
                user_location,
                longtitude,
                latitude,
                result_show,
                result
            } = req.body;

            const simulator = await Simulator.create({
                query,
                locale,
                location: user_location,
                coordinates: {
                    longitude: longtitude,
                    latitude
                },
                resultShow: result_show,
                result,
                status: '1' // default to active
            });

            return handleSuccess(res, 201, 'Simulator created successfully', { id: simulator._id });
        } catch (error) {
            logger.error('Error in newAddSimulator:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Add simulator topic
    async newAddSimulatorTopics(req, res) {
        try {
            const {
                simulator_id,
                simulator_type,
                location,
                link,
                slider_type,
                slider_name,
                slider_result_json,
                final_result_show,
                final_result,
                more_videos,
                scrb_link,
                question_type,
                questions,
                link_with_description
            } = req.body;

            const simulator = await Simulator.findById(simulator_id);
            if (!simulator) {
                return handleError(res, 404, 'Simulator not found');
            }

            let topicData = {
                simulator_type,
                location,
                slider_type,
                slider_name,
                slider_result_json,
                final_result_show,
                final_result
            };

            // Handle different simulator types
            if (simulator_type === 4) {
                // Video type
                const videoMetadata = await Promise.all(
                    more_videos.map(async (videoUrl) => {
                        const { result } = await ogs({ url: videoUrl });
                        return {
                            link: videoUrl,
                            metadata: result
                        };
                    })
                );
                topicData.more_videos = videoMetadata;
            } else if (simulator_type === 5) {
                // Image type
                const imagePath = await saveBase64Image(scrb_link);
                topicData.scrb_link = scrb_link;
                topicData.image_path = imagePath;
            } else if (simulator_type === 2) {
                // Question type
                topicData.question_type = question_type;
                // Convert questions to snake_case
                topicData.questions = questions ? questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    correct_answer: q.correctAnswer || q.correct_answer
                })) : [];
            } else if (simulator_type === 3) {
                // Link with description
                topicData.link_with_description = link_with_description;
            } else {
                // Default type with link
                const { result } = await ogs({ url: link });
                topicData.link = link;
                topicData.link_metadata = result;
            }

            const updatedSimulator = await Simulator.findByIdAndUpdate(
                simulator_id,
                { $push: { topics: topicData } },
                { new: true }
            );

            return handleSuccess(res, 201, 'Topic added successfully', { simulator: updatedSimulator });
        } catch (error) {
            logger.error('Error in newAddSimulatorTopics:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get simulator list with pagination
    async simulatorList(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const [simulators, total] = await Promise.all([
                Simulator.find()
                    .sort({ _id: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Simulator.countDocuments()
            ]);

            return handleSuccess(res, 200, 'Simulators fetched successfully', {
                simulators,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            });
        } catch (error) {
            logger.error('Error in simulatorList:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get simulator topics
    async simulatorTopicList(req, res) {
        try {
            const { simulator_id } = req.query;
            if (!simulator_id) {
                return handleError(res, 400, 'Simulator ID is required');
            }

            const simulator = await Simulator.findById(simulator_id);

            if (!simulator) {
                return handleError(res, 404, 'Simulator not found');
            }

            return handleSuccess(res, 200, 'Topics fetched successfully', simulator.topics || []);
        } catch (error) {
            logger.error('Error in simulatorTopicList:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Get specific simulator topic
    async simulatorTopicListData(req, res) {
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
            return handleSuccess(res, 200, 'Topic fetched successfully', topic);
        } catch (error) {
            logger.error('Error in simulatorTopicListData:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Delete simulator
    async simulatorDelete(req, res) {
        try {
            const { simulator_id } = req.body;
            if (!simulator_id) {
                return handleError(res, 400, 'Simulator ID is required');
            }

            const simulator = await Simulator.findByIdAndDelete(simulator_id);
            if (!simulator) {
                return handleError(res, 404, 'Simulator not found');
            }

            return handleSuccess(res, 200, 'Simulator deleted successfully');
        } catch (error) {
            logger.error('Error in simulatorDelete:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Delete simulator topic
    async simulatorDeleteTopics(req, res) {
        try {
            const { simulator_id, topic_id } = req.body;
            if (!simulator_id || !topic_id) {
                return handleError(res, 400, 'Simulator ID and Topic ID are required');
            }

            const simulator = await Simulator.findByIdAndUpdate(
                simulator_id,
                { $pull: { topics: { _id: topic_id } } },
                { new: true }
            );

            if (!simulator) {
                return handleError(res, 404, 'Simulator not found');
            }

            return handleSuccess(res, 200, 'Topic deleted successfully');
        } catch (error) {
            logger.error('Error in simulatorDeleteTopics:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Update simulator
    async simulatorUpdate(req, res) {
        try {
            const {
                id,
                query,
                locale,
                user_location,
                longtitude,
                latitude,
                result_show,
                result
            } = req.body;

            const simulator = await Simulator.findByIdAndUpdate(
                id,
                {
                    query,
                    locale,
                    location: user_location,
                    coordinates: {
                        longitude: longtitude,
                        latitude: latitude
                    },
                    resultShow: result_show,
                    result
                },
                { new: true }
            );

            if (!simulator) {
                return handleError(res, 404, 'Simulator not found');
            }

            return handleSuccess(res, 200, 'Simulator updated successfully', { simulator });
        } catch (error) {
            logger.error('Error in simulatorUpdate:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Update simulator status
    async simulatorStatusUpdate(req, res) {
        try {
            const { id, status } = req.body;
            if (!id || !status) {
                return handleError(res, 400, 'ID and status are required');
            }

            const simulator = await Simulator.findByIdAndUpdate(
                id,
                { status },
                { new: true }
            );

            if (!simulator) {
                return handleError(res, 404, 'Simulator not found');
            }

            return handleSuccess(res, 200, 'Status updated successfully', { simulator });
        } catch (error) {
            logger.error('Error in simulatorStatusUpdate:', error);
            return handleError(res, 500, 'Internal server error');
        }
    },

    // Update simulator topic
    async simulatorUpdateTopics(req, res) {
        try {
            const {
                simulator_id,
                topic_id,
                ...updateData
            } = req.body;

            if (!simulator_id || !topic_id) {
                return handleError(res, 400, 'Simulator ID and Topic ID are required');
            }

            const simulator = await Simulator.findOneAndUpdate(
                {
                    _id: simulator_id,
                    'topics._id': topic_id
                },
                {
                    $set: {
                        'topics.$': {
                            ...updateData,
                            _id: topic_id
                        }
                    }
                },
                { new: true }
            );

            if (!simulator) {
                return handleError(res, 404, 'Simulator or topic not found');
            }

            return handleSuccess(res, 200, 'Topic updated successfully', { simulator });
        } catch (error) {
            logger.error('Error in simulatorUpdateTopics:', error);
            return handleError(res, 500, 'Internal server error');
        }
    }
};

// Helper function to save base64 image
async function saveBase64Image(base64Data) {
    try {
        const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image data');
        }

        const imageBuffer = Buffer.from(matches[2], 'base64');
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const filePath = path.join(__dirname, '../../assets/simulator_img', fileName);

        await fs.writeFile(filePath, imageBuffer);
        return fileName;
    } catch (error) {
        logger.error('Error saving base64 image:', error);
        throw error;
    }
}

module.exports = simulatorController;

