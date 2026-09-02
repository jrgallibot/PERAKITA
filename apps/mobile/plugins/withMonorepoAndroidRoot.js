const { withAppBuildGradle } = require('@expo/config-plugins');

/** Ensure Gradle bundles JS from apps/mobile, not the monorepo root. */
module.exports = function withMonorepoAndroidRoot(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    contents = contents.replace(
      'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()',
      'def projectRoot = file("../../").getAbsolutePath()'
    );
    contents = contents.replace('// root = file("../../")', 'root = file("../../")');
    contents = contents.replace(
      'entryFile = file(["node", "-e", "require(\'expo/scripts/resolveAppEntry\')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())',
      'entryFile = file(["node", "-e", "console.log(require(\'@expo/config/paths\').resolveEntryPoint(process.argv[1], {platform:\'android\'}))", projectRoot].execute(null, new File(projectRoot)).text.trim())'
    );
    cfg.modResults.contents = contents;
    return cfg;
  });
};
