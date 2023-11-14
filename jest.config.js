module.exports = {
    testEnvironment: "node",
    roots: ["<rootDir>/test"],
    testMatch: ["**/*.test.ts"],
    transform: {
        "^.+\\.ts?$": "ts-jest",
    },
    reporters: [
        "default",
        [
            "jest-junit",
            {
                suiteName: "Unit Tests",
                outputDirectory: ".",
                outputName: "test-reports/junit-unit.xml",
                includeConsoleOutput: "true",
            },
        ],
    ],
    coverageDirectory: "./coverage/unit",
    coverageReporters: ["json", "text", "html"],
};
