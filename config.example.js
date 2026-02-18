// Configuration file for LCL Map
// Copy this file to config.js and update with your own values

module.exports = {
    // Server configuration
    port: process.env.PORT || 3000,

    // Admin password for accessing admin panel
    // IMPORTANT: Change this to a secure password!
    adminPassword: 'your-secure-password-here',

    // MapTiler API key (optional, for multi-language map labels)
    // Get a free API key at: https://www.maptiler.com/cloud/
    mapTilerApiKey: 'YOUR_API_KEY_HERE',

    // Whether to use MapTiler (true) or standard OpenStreetMap (false)
    useMapTiler: true
};
