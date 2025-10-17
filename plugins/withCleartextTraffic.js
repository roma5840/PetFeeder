const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, async (config) => {
    let androidManifest = config.modResults;
    let app = androidManifest.manifest.application[0];

    if (!app.$) {
      app.$ = {};
    }

    if (app.$['android:usesCleartextTraffic'] !== 'true') {
      app.$['android:usesCleartextTraffic'] = 'true';
      console.log('Added android:usesCleartextTraffic="true" to AndroidManifest.xml');
    }

    return config;
  });
};