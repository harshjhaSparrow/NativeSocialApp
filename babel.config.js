module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // This is the missing piece!
    plugins: [
      process.env.NODE_ENV === "production" && "transform-remove-console",
      "react-native-reanimated/plugin", // Only add this if you use Reanimated
    ].filter(Boolean),
  };
};