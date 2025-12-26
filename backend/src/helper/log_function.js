const mongoose = require('mongoose');
const common = require('common-utils');
const LogModel = require('../models/Log');

const createLogDb = async (table = 'general', log_data = null, query = null) => {
    try {
        if (!query && log_data) {
            // Create log document
            const logDocument = {
                type: table,
                log: JSON.stringify(log_data),
                createdAt: new Date()
            };

            await LogModel.create(logDocument);
            return true;
        } else if (query) {
            // If query is provided, treat it as a log message
            const logDocument = {
                type: table || 'general',
                log: typeof query === 'string' ? query : JSON.stringify(query),
                createdAt: new Date()
            };

            await LogModel.create(logDocument);
            return true;
        }
        return false;
    } catch (error) {
        // Fallback: try to save error log
        try {
            const errorLog = {
                type: 'error_log_function',
                log: JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    originalTable: table,
                    originalData: log_data
                }),
                createdAt: new Date()
            };
            await LogModel.create(errorLog);
        } catch (fallbackError) {
            console.error('Failed to save log:', fallbackError);
        }
        return false;
    }
};

module.exports = { createLogDb };

