const mongoose = require('mongoose');

// MongoDB connection is handled in config/database.js
// This file is kept for backward compatibility but uses mongoose connection
module.exports = {
    conn: mongoose.connection,
    log_conn: mongoose.connection // Using same connection for logs
};

