module.exports = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
    testMatch: ["**/test/**/*.test.ts"],
    collectCoverageFrom: ["src/**/*.ts"],
    coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
    testTimeout: 3000, // 3 second timeout per individual test
    // Force Jest to exit after tests complete or fail
    forceExit: true,
    // Allow parallel test execution for better performance
    // Tests are isolated and can run concurrently
    maxWorkers: "50%",
};
