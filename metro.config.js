const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// pdf-lib ships both CJS (main) and ESM (module) builds. Metro picks up the
// ESM build which fails at runtime due to CJS/ESM interop issues with tslib.
// resolveRequest forces Metro to always load the CJS build of pdf-lib on
// every platform, avoiding the tslib destructure crash entirely.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "pdf-lib") {
    return {
      filePath: path.resolve(__dirname, "node_modules/pdf-lib/cjs/index.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
