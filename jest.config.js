/** @ts-check @type jest.ProjectConfig */
module.exports = {
  testPathIgnorePatterns: ['build'],
  testMatch: ["**/*.test.ts"],
  preset: 'ts-jest',
  testEnvironment: 'node',
};