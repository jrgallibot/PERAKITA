const { withAppBuildGradle } = require('@expo/config-plugins');

/** Ensure Gradle bundles JS from apps/mobile, not the monorepo root. */
module.exports = function withMonorepoAndroidRoot(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    contents = contents.replace(
      'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()',
      'def projectRoot = file("../../").getAbsolutePath()'
    );
    if (!contents.includes('def resolveNodePath = { String expression ->')) {
      contents = contents.replace(
        'def projectRoot = file("../../").getAbsolutePath()',
        `def projectRoot = file("../../").getAbsolutePath()
def resolveNodePath = { String expression ->
    def value = ["node", "--print", expression].execute(null, new File(projectRoot)).text.trim()
    def realRoot = System.getenv("PERAKITA_REAL_REPO_ROOT")
    def shortRoot = System.getenv("PERAKITA_SHORT_REPO_ROOT")
    if (realRoot != null && shortRoot != null && value.startsWith(realRoot)) {
        value = shortRoot + value.substring(realRoot.length()).replace("\\\\", "/").replaceFirst("^/", "")
    }
    return value
}`
      );
    }
    contents = contents.replace('// root = file("../../")', 'root = file("../../")');
    contents = contents.replace(
      'entryFile = file(["node", "-e", "require(\'expo/scripts/resolveAppEntry\')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())',
      'entryFile = file("../../index.js")'
    );
    contents = contents.replace(
      'entryFile = file(["node", "-e", "console.log(require(\'@expo/config/paths\').resolveEntryPoint(process.argv[1], {platform:\'android\'}))", projectRoot].execute(null, new File(projectRoot)).text.trim())',
      'entryFile = file("../../index.js")'
    );
    contents = contents.replace(
      'entryFile = file(["node", "--print", "require.resolve(\'expo-router/entry\')"].execute(null, new File(projectRoot)).text.trim())',
      'entryFile = file("../../index.js")'
    );
    contents = contents.replace(
      'entryFile = file(resolveNodePath("require.resolve(\'expo-router/entry\')"))',
      'entryFile = file("../../index.js")'
    );
    contents = contents.replace(
      'reactNativeDir = new File(["node", "--print", "require.resolve(\'react-native/package.json\')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()',
      'reactNativeDir = new File(resolveNodePath("require.resolve(\'react-native/package.json\')")).getParentFile().getAbsoluteFile()'
    );
    contents = contents.replace(
      'hermesCommand = new File(["node", "--print", "require.resolve(\'react-native/package.json\')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"',
      'hermesCommand = new File(resolveNodePath("require.resolve(\'react-native/package.json\')")).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"'
    );
    contents = contents.replace(
      'codegenDir = new File(["node", "--print", "require.resolve(\'@react-native/codegen/package.json\', { paths: [require.resolve(\'react-native/package.json\')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()',
      'codegenDir = new File(resolveNodePath("require.resolve(\'@react-native/codegen/package.json\', { paths: [require.resolve(\'react-native/package.json\')] })")).getParentFile().getAbsoluteFile()'
    );
    contents = contents.replace(
      'cliFile = new File(["node", "--print", "require.resolve(\'@expo/cli\', { paths: [require.resolve(\'expo/package.json\')] })"].execute(null, rootDir).text.trim())',
      'cliFile = new File(resolveNodePath("require.resolve(\'@expo/cli\', { paths: [require.resolve(\'expo/package.json\')] })"))'
    );
    cfg.modResults.contents = contents;
    return cfg;
  });
};
