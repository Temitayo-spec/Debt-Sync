const { expo } = require("./app.json");

module.exports = {
  expo: {
    ...expo,
    android: {
      ...expo.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || expo.android?.googleServicesFile,
    },
    plugins: ["expo-web-browser"],
  },
};
