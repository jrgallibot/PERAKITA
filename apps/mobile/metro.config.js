const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
require('../../scripts/load-root-env.cjs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const expoRouterRoot = fs.realpathSync(path.resolve(projectRoot, 'node_modules/expo-router'));
const pnpmVirtualStoreRoot = path.resolve(expoRouterRoot, '../../..');

const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot, pnpmVirtualStoreRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  '@perakita/shared': path.resolve(workspaceRoot, 'packages/shared'),
  'expo-router': path.resolve(projectRoot, 'node_modules/expo-router'),
  'expo-router/entry': path.resolve(projectRoot, 'node_modules/expo-router/entry.js'),
  'expo-router/entry-classic': path.resolve(projectRoot, 'node_modules/expo-router/entry-classic.js'),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-router/entry') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(expoRouterRoot, 'entry.js'),
    };
  }
  if (moduleName === 'expo-router/entry-classic') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(expoRouterRoot, 'entry-classic.js'),
    };
  }
  try {
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    try {
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName, { paths: [projectRoot] }),
      };
    } catch {
      throw error;
    }
  }
};
config.resolver.disableHierarchicalLookup = false;
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
