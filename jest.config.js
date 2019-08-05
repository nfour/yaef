/** @ts-check @type jest.ProjectConfig */
module.exports = {
  testPathIgnorePatterns: ['build'],
  testMatch: ["**/*.test.ts"],
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ["/node_modules/", "/build/"],
  globals: {
    'ts-jest': {
      tsConfig: require('./tsconfig.settings.json').compilerOptions
    }
  }
};