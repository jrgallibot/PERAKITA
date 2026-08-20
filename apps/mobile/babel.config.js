require('../../scripts/load-root-env.cjs');

module.exports = function (api) {
  api.cache.using(
    () =>
      `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}:${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''}`
  );
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
