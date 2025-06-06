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
    // "**/?(*.)+(spec|test).+(ts|js)",
    "**/comment.controller.test.ts",
  ],
  moduleNameMapper: {
    // strip the ".js" off any relative import before resolving
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFiles: ["<rootDir>/tests/setupTestEnv.ts"],
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  clearMocks: true,
  forceExit: true,
  verbose: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
};
