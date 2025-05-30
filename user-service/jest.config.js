import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: [
    // any .test.ts or .spec.ts files
    "**/?(*.)+(spec|test).+(ts|js)",
  ],
  moduleNameMapper: {
    // strip the ".js" off any relative import before resolving
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  clearMocks: true,
  forceExit: true,
  verbose: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
};
