const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .ts and .tsx are recognized
config.resolver.sourceExts.push('ts', 'tsx', 'cjs');

module.exports = config;