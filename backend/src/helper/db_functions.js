const crypto = require('crypto');
const common = require('common-utils');
const { createLogDb } = require('../helper/log_function');
const fs = require('fs');

// Helper function to convert MongoDB query to Mongoose query
function buildMongooseQuery(model, where = null, orderBy = null, limit = null, offset = null) {
    let query = model.find(where || {});

    if (orderBy) {
        const [field, direction] = orderBy.split(' ');
        query = query.sort({ [field]: direction === 'DESC' ? -1 : 1 });
    }

    if (offset && limit) {
        query = query.skip(parseInt(offset)).limit(parseInt(limit));
    } else if (limit) {
        query = query.limit(parseInt(limit));
    }

    return query;
}

// Mongoose-based helper functions
async function selectedRows(model, selected_field = "*", where = null, orderBy = null, limit = false) {
    try {
        let query = model.find(where || {});

        if (selected_field !== "*") {
            const fields = selected_field.split(',').map(f => f.trim());
            query = query.select(fields.join(' '));
        }

        if (orderBy) {
            const [field, direction] = orderBy.split(' ');
            query = query.sort({ [field]: direction === 'DESC' ? -1 : 1 });
        }

        if (limit) {
            query = query.limit(1);
        }

        const data_res = await query.exec();

        if (data_res && data_res.length > 0) {
            return data_res[0];
        } else if (data_res && data_res.length === 0) {
            return false;
        } else {
            return data_res;
        }
    } catch (error) {
        const error_log = common.error_log_message('0', '0', error, where, "db_functions.js", "selectedRows");
        createLogDb('error_common_else_checkoutpp_file', error_log);
        return false;
    }
}

const deleteRetNo = async (model, where) => {
    try {
        if (!where || Object.keys(where).length === 0) {
            const error_log = common.error_log_message('0', '0', 'No where condition', where, "db_functions.js", "deleteRetNo");
            createLogDb('error_common_else_checkoutpp_file', error_log);
            return false;
        }

        await model.deleteMany(where);
        return true;
    } catch (error) {
        const error_log = common.error_log_message('0', '0', error, where, "db_functions.js", "deleteRetNo");
        createLogDb('error_common_else_checkoutpp_file', error_log);
        return false;
    }
};

function getEncryptDecryptData(action, string) {
    try {
        let output = false;
        let encrypt_method = "aes-256-cbc";
        let secret_key = 'SIMULATOR_@%$&@*#_SECRETKEY';
        let secret_iv = 'SIMULATOR_$%&@*#^@_SECRETIV';

        let password_iv = crypto.createHash('sha256').update(secret_iv).digest('hex');
        let password_hash = crypto.createHash('sha256').update(secret_key, 'utf8').digest('hex');
        /* hash */
        let key = hex2bin(password_hash);
        /* iv - encrypt method AES-256-CBC expects 16 bytes - else you will get a warnin */
        let iv = hex2bin(password_iv)
        password_iv = Buffer.alloc(16, iv, "binary");
        password_hash = Buffer.alloc(32, key, "binary");
        if (action == 'encrypt') {
            let cipher = crypto.createCipheriv(encrypt_method, password_hash, password_iv);
            return Buffer.from(cipher.update(string, 'utf8', 'base64') + cipher.final('base64')).toString('base64');
        } else if (action == 'decrypt') {
            string = Buffer.from(string, 'base64').toString('utf8')
            let decipher = crypto.createDecipheriv('aes-256-cbc', password_hash, password_iv);
            return decipher.update(string, 'base64', 'utf8') + decipher.final('utf8')
        }
        return output;
    } catch (error) {
        return false;
    }
}

function hex2bin(hex) {
    let bytes = []; let i = 0; let len = hex.length - 1;
    for (; i < len; i += 2)
        bytes.push(parseInt(hex.substr(i, 2), 16));
    return String.fromCharCode.apply(String, bytes);
}

async function insert(model, fields, is_need_data = true) {
    try {
        const document = new model(fields);
        if (is_need_data) {
            return await document.save();
        } else {
            await document.save();
            return true;
        }
    } catch (error) {
        console.log("error=======================>", error)
        createLogDb('error_query_insert_fail', { 'log': error.stack });
        return false;
    }
}

async function update(model, where, fields, return_fields = '') {
    try {
        if (!where || Object.keys(where).length === 0) {
            return false;
        }

        const options = { new: true };
        if (return_fields) {
            options.select = return_fields;
        }

        return await model.findOneAndUpdate(where, { $set: fields }, options);
    } catch (error) {
        let error_log = common.error_log_message('0', '0', error, where, "db_function.js", "update");
        createLogDb('common_else_error', error_log);
        return false;
    }
}

async function selectResults(model, selected_field = '*', where = null, orderBy = null, groupBy = null, limit = null, offset = null) {
    try {
        let query = model.find(where || {});

        if (selected_field !== '*') {
            const fields = selected_field.split(',').map(f => f.trim());
            query = query.select(fields.join(' '));
        }

        if (groupBy) {
            // MongoDB aggregation for GROUP BY
            const pipeline = [];
            if (where) {
                pipeline.push({ $match: where });
            }
            pipeline.push({ $group: { _id: `$${groupBy}`, count: { $sum: 1 } } });
            return await model.aggregate(pipeline);
        }

        if (orderBy) {
            const [field, direction] = orderBy.split(' ');
            query = query.sort({ [field]: direction === 'DESC' ? -1 : 1 });
        }

        if (offset && limit) {
            query = query.skip(parseInt(offset)).limit(parseInt(limit));
        } else if (limit) {
            query = query.limit(parseInt(limit));
        }

        return await query.exec();
    } catch (error) {
        let error_log = common.error_log_message('0', '0', error, where, "db_query.js", "selectResults");
        createLogDb('error_common_else_cht_file', error_log);
        return [];
    }
}

async function getTotalData(model, where = null, group_by = null) {
    try {
        if (group_by) {
            const pipeline = [];
            if (where) {
                pipeline.push({ $match: where });
            }
            pipeline.push({ $group: { _id: `$${group_by}` } });
            pipeline.push({ $group: { _id: null, count: { $sum: 1 } } });
            const result = await model.aggregate(pipeline);
            return result.length > 0 ? result[0].count : 0;
        } else {
            return await model.countDocuments(where || {});
        }
    } catch (error) {
        createLogDb('error_common_else_cht_file', {
            'store_client_id': 0,
            'type': '0',
            'log': error.stack
        });
        return 0;
    }
}

const check_exists = async (model, condition) => {
    try {
        // Convert condition string to query object if needed
        let query = {};
        if (typeof condition === 'string') {
            // Simple condition parser - can be enhanced
            const parts = condition.split('=');
            if (parts.length === 2) {
                query[parts[0].trim()] = parts[1].trim().replace(/['"]/g, '');
            }
        } else {
            query = condition;
        }

        const count = await model.countDocuments(query);
        return [{ is_exists: count > 0 }];
    } catch (error) {
        createLogDb('error_query_check_exits_fail', {
            'store_client_id': 0,
            'type': '0',
            'log': error.stack
        });
        return [{ is_exists: false }];
    }
};

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

async function storeImage(matches, res, pathImg) {
    return new Promise(resolve => {
        try {
            let image = Buffer.from(matches[2], 'base64');
            let file_size = image.length / (1024 * 1024);
            let path = '';
            const config = require('../config/config');
            if ((matches.length != 3) || (!config.ALLOWED_IMG_TYPE.includes(matches[1])) || (file_size > 2)) {
                /* Do nothing */
                resolve(false);
            } else {
                let image_name = new Date().getTime() + '_' + randomNumber(0, 10000);
                path = image_name + matches[1].replace('image/', '.');
                let target_path = pathImg + path;
                let writeStream = fs.createWriteStream(target_path);
                /* write some data with a base64 encoding */
                writeStream.write(matches[2], 'base64');
                /* This is here incase any errors occur */
                writeStream.on('error', function (err) {
                    console.log(err, 'error');
                });
                writeStream.on('finish', function () {
                    resolve(path);
                });
                /* close the stream */
                writeStream.end();
            }
        } catch (error) {
            console.log(error, "error")
            resolve('');
        }
    });
}

module.exports = {
    selectedRows,
    deleteRetNo,
    insert,
    update,
    getEncryptDecryptData,
    selectResults,
    getTotalData,
    check_exists,
    storeImage,
    randomNumber
}

