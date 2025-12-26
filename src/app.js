'use strict';
const path = require('path');
// Load environment variables from root .env file
// dotenv 17.x automatically loads from root directory
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const config = require('./config/config');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const http = require('http');
const server = http.createServer(app);

// Connect to MongoDB (non-blocking)
connectDB().catch(err => {
    logger.error('Initial MongoDB connection failed:', err.message);
});

// Security middleware
app.use(helmet());

// Static files
app.use(express.static(path.join(__dirname, 'assets/simulator_img')));

// Body parser
app.use(express.json({ limit: '50mb' }));

// CORS configuration
const whitelist = ['http://localhost:3000', 'http://localhost:3001', 'https://www.zianai.in'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(function (req, res, next) {
    const origin = req.headers.origin;
    // Allow requests from whitelist or requests without origin (Postman, API testing tools)
    if (origin && whitelist.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
        // Allow requests without origin (Postman, curl, etc.)
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
        // Origin not in whitelist
        return res.status(403).send('<h1 style="text-align:center">403 Forbidden</h1><hr/>');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'access-token,refresh-token,Authorization, Authentication, Content-Type, origin,action, accept, token,withCredentials');
    res.setHeader('Access-Control-Expose-Headers', 'security_token,x-forwarded-for,Content-Disposition');
    res.setHeader('Cache-Control', 'no-store,max-age=0');
    next();
});

// Routes
app.use(config.APP_PREFIX, routes);

// 404 handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handler
app.use(errorHandler);

app.set('port', Number(process.env.PORT) || 8000);

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

module.exports = { app, server };

