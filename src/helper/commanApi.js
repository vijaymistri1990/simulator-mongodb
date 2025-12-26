let apiEndpoint;
let commonApi;
let sampleFileApi;

const hostname = window.location.hostname;
 if (hostname === "www.zianai.in") {
    apiEndpoint = "https://api.zianai.in/api"
    commonApi = "https://api.zianai.in/"
    sampleFileApi = 'https://api.zianai.in/'
} else if (hostname === "localhost") {
    apiEndpoint = 'http://localhost:4000/api'
    commonApi = 'http://localhost:4000/'
    sampleFileApi = 'http://localhost:4000/'
}
module.exports = {
    apiEndpoint,
    commonApi,
    sampleFileApi
}
