const StrategyOptimizer = require("./optimizer")
const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")

async function main() {
    // Parse command line arguments
    const argv = yargs(hideBin(process.argv))
        .option("market", {
            alias: "m",
            description: "Market to test on (e.g., BTC-PERP)",
            type: "string",
            default: "BTC-PERP",
        })
        .option("timeframe", {
            alias: "t",
            description: "Timeframe to use (e.g., 15m, 1h, 4h)",
            type: "string",
            default: "15m",
        })
        .option("metric", {
            description:
                "Metric to optimize for (totalProfitLoss, sharpeRatio, winRate, profitFactor, maxDrawdown)",
            type: "string",
            default: "totalProfitLoss",
        })
        .option("initialCapital", {
            description: "Initial capital to start with",
            type: "number",
            default: 10000,
        })
        .option("verbose", {
            alias: "v",
            description: "Enable verbose logging",
            type: "boolean",
            default: false,
        })
        .help()
        .alias("help", "h").argv

    console.log("Starting parameter optimization...")
    console.log("Market:", argv.market)
    console.log("Timeframe:", argv.timeframe)
    console.log("Optimization metric:", argv.metric)
    console.log("Initial capital:", argv.initialCapital)

    // Create optimizer
    const optimizer = new StrategyOptimizer()

    // Set optimization metric
    optimizer.setOptimizationMetric(argv.metric)

    // Define parameter ranges to test
    // These are example ranges for the BBRSIStrategy
    const parameterRanges = {
        // Backtester parameters
        leverage: [1, 2, 3, 5, 10],
        positionSize: [0.1, 0.2, 0.3, 0.5], // 10%, 20%, 30%, 50% of capital
        profitTarget: [1.2, 1.5, 2.0, 2.5], // Take profit at these multiples

        // Strategy parameters
        rsiPeriod: [7, 14, 21],
        rsiOverbought: [70, 75, 80],
        rsiOversold: [20, 25, 30],
        bbPeriod: [15, 20, 30],
        bbStdDev: [2, 2.5, 3],
        adxPeriod: [14, 21, 28],
        adxThreshold: [20, 25, 30],
    }

    // Set parameter ranges
    optimizer.setParameterRanges(parameterRanges)

    // Start optimization
    try {
        console.time("Optimization completed in")
        const bestResult = await optimizer.optimize()
        console.timeEnd("Optimization completed in")

        console.log("\n--- Best Parameter Set ---")
        console.log("Parameters:", JSON.stringify(bestResult.parameters, null, 2))
        console.log("Metric Value:", bestResult.metrics[argv.metric])
        console.log("Total Profit/Loss:", bestResult.metrics.totalProfitLoss)
        console.log("Win Rate:", (bestResult.metrics.winRate * 100).toFixed(2) + "%")
        console.log("Max Drawdown:", (bestResult.metrics.maxDrawdown * 100).toFixed(2) + "%")

        console.log(
            "\nOptimization report generated in optimization_results/optimization_report.html",
        )
        console.log("To see the best result charts, run:")
        console.log("node src/backtesting/visualize.js --results optimization_results/best_result")
    } catch (error) {
        console.error("Optimization failed:", error.message)
    }
}

// Run the main function
main().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
})

// ASHDLADXZCZC
// 2019-07-22T03:53:39 – juKFpBomPwHKnAsKoxRg
// 2019-07-23T18:47:29 – gFqQ1Q6cmS4WCIkTmF3q
// 2019-07-26T12:37:37 – QD34cGjVIDPAL2mOsKPK
// 2019-07-31T08:07:39 – wnC8Q4AW7kfeAfp9tN56
// 2019-08-02T12:38:19 – xH8IwE2A9i4W6CQqsUXd
// 2019-08-02T15:44:34 – k0T9BLjM0oPmhwXz1zGp
// 2019-08-27T23:30:38 – kVTVfuvBYPbavySecqTw
// 2019-09-17T03:10:35 – 0sHkbXA4JBcUnNyiFHek
// 2019-09-27T10:27:16 – u6kaF5xFNUl4Y1YciDxj
// 2019-11-03T19:21:29 – FpK7r3E6GN6c1RkeXXJ7
// 2019-11-14T01:12:11 – oWwzVdzKDH9uwGdnJBsK
// 2019-12-13T16:13:48 – vP4tboTsoZJhIS7UTc5M
// 2020-02-18T10:48:18 – RMbvpIvc9RGEQP00g7OJ
// 2020-02-28T01:41:48 – JC27sr41fgPW8WXVi2Or
// 2020-03-15T17:54:00 – GpCLDsCnbr2ZTvKaK5Ue
// 2020-03-21T23:44:28 – G4a8evbgpOhCthFq8jqo
// 2020-03-27T05:16:48 – 6HKdQwS4iM6DzO4iSg1h
// 2020-05-29T00:27:33 – mPEfvigDO2jDPoclAP6K
// 2020-06-27T02:22:21 – m572hC13VH7iwKRjggJP
// 2020-06-30T11:40:28 – g7gO0XXluqeQXGNG1g48
// 2020-07-19T13:03:25 – tHp0JzZK2jwLIqPToNKv
// 2020-08-14T18:53:28 – qjLjA2woj1gTMUWgeJWe
// 2020-09-16T10:02:59 – OhLBzcZSs86VQJ6zJ2gM
// 2020-10-27T22:15:39 – TvTIOaN7llRXRcAzEkSC
// 2020-11-29T17:07:17 – v5xdJo3ynEvQQ5P9nVVz
// 2020-12-01T20:36:13 – 0EkJZTS3JT3VjqeL0H2x
// 2020-12-05T08:35:39 – lE4Pu2Li1fi4STg8vEMw
// 2020-12-18T03:40:25 – 626d9YlXYRzK6KhsFMIN
// 2020-12-26T12:17:24 – JrSFdmch8RRPSb1blEWe
// 2020-12-31T21:13:55 – VNWIbQaFAA2xIJJa81SQ
// 2021-01-19T23:03:28 – jBwFGloCnJGGpMSQ8r6u
// 2021-02-09T06:06:25 – tBbsZhSreyqSuoYq1eoY
// 2021-03-16T01:23:21 – lgDMXc8lXLETjyH1Wswu
// 2021-03-16T20:52:11 – M5Uw7wkVjkAv0JnSU1HL
// 2021-03-17T21:49:52 – xuMmgRrEZ6UtN1tKhJQk
// 2021-03-23T05:50:59 – S8X5yVQ7L1kCcQwwgwZq
// 2021-03-29T17:21:08 – w4NYRedjpjFl7nqDtWvN
// 2021-04-06T07:09:28 – FoiIWfiZWbofLjFTFdN8
// 2021-04-19T12:35:01 – KgCoStnqu93t10quHTCq
// 2021-04-22T16:40:32 – Wzq1vsxrsAQI64fP3zzI
// 2021-04-23T01:24:41 – 622DcftSaUIyTNEEXyzD
// 2021-06-02T23:04:18 – UPUtPFO1I9Kya37hD8yd
// 2021-07-01T21:35:28 – 2hVql42zXZCdvADxpYZ8
// 2021-07-16T12:32:56 – ZVStkCQxFYRLeEnwH0AF
// 2021-07-16T18:10:31 – Faux9UWAngn48EHh8kvR
// 2021-07-28T16:59:56 – 1pSzw0XyZ9IlPPPWHHoJ
// 2021-08-07T09:15:27 – CjlUimAraZt6Y7eikhq5
// 2021-08-14T03:56:38 – nCqYkLGzYPETSupS1fOh
// 2021-08-27T12:07:53 – gWicJbETcWRTjxSmOnsb
