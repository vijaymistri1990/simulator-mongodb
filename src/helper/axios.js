import axios from 'axios'

const { apiEndpoint } = require('./commanApi')
let userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')) : {};
const service = axios.create({
    headers: {

    }
})
const handleSuccess = (response) => {
    return response
}

const handleError = (error) => {
    return Promise.reject(error)
}
service.interceptors.response.use(handleSuccess, handleError)

const renewToken = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_tokens')
    localStorage.removeItem('userData')
    window.location.href = '/sign-in'
}
export const ApiCall = async (method, path, payload, header = null) => {
    try {
        const response = await service.request({
            method,
            url: apiEndpoint + path,
            responseType: 'json',
            data: payload,
            // headers: header
        })
        return response
    } catch (error) {
        console.log(error, 'errorerrorerror');
        if (error.message === 'Network Error') {
            console.log(`${error}, Server is not responding, please try again after some time`)
        }
        if (error.response?.data?.statusCode === 401 && header && !header['access-token']) {
            if (error.response.data.access_expire) {
                renewToken()
            } else if (error.response.data.refresh_expire) {
                return error.response
            }
        } else {
            return error.response
        }
    }
    // }
}
export const GetApiCall = async (method, path, header = [], flag = false) => {

    try {
        const response = await service.request({
            method,
            url: apiEndpoint + path,
            responseType: 'json',
            // headers: header
        })
        return response
    } catch (error) {
        if (error.message === 'Network Error') {
            console.log(`${error}, Server is not responding, please try again after some time`)
        }
        if (error.response?.data?.statusCode === 401) {
            if (error.response.data.access_expire) {
                renewToken()
            } else if (error.response.data.refresh_expire) {
                return error.response
            }
        } else {
            return error.response
        }
    }
    //   }
}

export const GetUserApiCall = async (method, path, header = [], flag = false) => {
    if (!header['authentication'] && userData?.user == 0) {
        renewToken()
    } else {
        try {
            const response = await service.request({
                method,
                url: apiEndpoint + path,
                responseType: 'json',
                headers: header
            })
            return response
        } catch (error) {
            if (error.message === 'Network Error') {
                console.log(`${error}, Server is not responding, please try again after some time`)
            }
            if (error.response?.data?.statusCode === 401) {
                if (error.response.data.access_expire) {
                    renewToken()
                } else if (error.response.data.refresh_expire) {
                    return error.response
                }
            } else {
                return error.response
            }
        }
    }
}


export const UserApiCall = async (method, path, payload, header = null) => {
    if (!header['authentication'] && userData?.user == 0) {
        renewToken()
    } else {
        try {
            const response = await service.request({
                method,
                url: apiEndpoint + path,
                responseType: 'json',
                data: payload,
                headers: header
            })
            return response
        } catch (error) {
            if (error.message === 'Network Error') {
                console.log(`${error}, Server is not responding, please try again after some time`)
            }
            if (error.response?.data?.statusCode === 401 && header && !header['access-token']) {
                if (error.response.data.access_expire) {
                    renewToken()
                } else if (error.response.data.refresh_expire) {
                    return error.response
                }
            } else {
                return error.response
            }
        }
    }
}


