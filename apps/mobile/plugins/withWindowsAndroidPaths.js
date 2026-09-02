const { withAppBuildGradle } = require('@expo/config-plugins');

/** Shorten native object paths on Windows (React Native New Architecture + deep monorepos). */
module.exports = function withWindowsAndroidPaths(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      contents = contents.replace(
        /defaultConfig \{\n/,
        `defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=128"
            }
        }
`
      );
    }

    if (!contents.includes('buildStagingDirectory')) {
      contents = contents.replace(
        /(\s+buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"[^\n]+\n)(\s+\})/,
        `$1    }
    externalNativeBuild {
        cmake {
            buildStagingDirectory file("\${System.getenv('LOCALAPPDATA')}/pk-cxx")
        }
    }`
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
