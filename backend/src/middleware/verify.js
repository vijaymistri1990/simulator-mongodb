"use strict";
const jwt = require("jsonwebtoken");
const config = require('../config/config');
const { handleError } = require('../utils/responseHandler');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
    let { status_code_config: statusCode, en_message_config: en } = config;
    if (req.method !== "OPTIONS") {
        let token = req.headers.authentication;
        if (token) {
            try {
                token = Buffer.from(token, 'base64').toString('utf8');
                const decoded = jwt.verify(token, config.secret);

                if (decoded) {
                    // Verify user still exists
                    const user = await User.model.findById(decoded.id);
                    if (!user) {
                        return handleError(res, statusCode.UNAUTHORIZED, 'User not found');
                    }

                    res.locals.user_id = decoded.id;
                    res.locals.user_name = decoded.user_name || user.user_name;
                    res.locals.user_type = decoded.type || user.type;
                    next();
                } else {
                    handleError(res, statusCode.BAD_REQUEST, en.ERROR_SOMETHING_WRONG);
                }
            } catch (err) {
                if (err.name === 'TokenExpiredError') {
                    return handleError(res, statusCode.UNAUTHORIZED, 'Token expired');
                }
                handleError(res, statusCode.UNAUTHORIZED, en.ERROR_NOT_VALID_TOKEN);
            }
        } else {
            handleError(res, statusCode.BAD_REQUEST, en.ERROR_NO_FOUND_TOKEN);
        }
    } else {
        next();
    }
};

module.exports = verifyToken;

