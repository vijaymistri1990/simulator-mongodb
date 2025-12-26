function handleError(res, statusCode, message, access_expire = false, refresh_expire = false) {
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        access_expire: access_expire,
        refresh_expire: refresh_expire
    });
}

function handleSuccess(res, statusCode, message, data = null) {
    res.status(statusCode).json({
        status: 'success',
        statusCode,
        message,
        data
    });
}

module.exports = {
    handleError,
    handleSuccess
};

