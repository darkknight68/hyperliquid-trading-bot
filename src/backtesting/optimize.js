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
// 2021-09-04T17:48:36 – 1nklGRNwUTZX730BwsfU
// 2021-09-10T22:45:19 – s6bX7SgPI697du8ouQbr
// 2021-09-14T18:25:11 – L3WdBCNc205coi821kTR
// 2021-09-18T04:23:00 – rNNafsQk9EV1lbGVpp1C
// 2021-09-20T06:02:19 – s2vNO4evoz73QIx1MP4U
// 2021-10-13T06:08:34 – 5HrMsDD57YWvkXVX3gjK
// 2021-10-16T23:34:37 – 52U9cQTvIksJbZC3XFcl
// 2021-11-09T02:04:32 – fqccdBNZdveiJ3ZD1Kbq
// 2021-11-14T09:29:35 – Bhmun8nnXJUgL9ouGyS7
// 2021-11-24T13:21:50 – 3SMlyWJWzvt6UJglVN9S
// 2021-11-24T13:49:34 – 4LLtnThNdqVKxo1WhVS5
// 2021-12-02T17:40:01 – u20p7vNVF3trBCGUqeda
// 2021-12-08T20:50:49 – lAj2jUKwvnsvcPOPwWkq
// 2021-12-27T04:46:59 – 0nkLsaCv7s8QW3aqnbnr
// 2022-01-28T17:13:24 – tHkcRspgUwz6CBTSCKvb
// 2022-02-09T13:03:05 – ydwV7JYk4XHiwygeCRV2
// 2022-02-25T09:59:10 – wnhPnCJzQdSNXl9N2n31
// 2022-02-27T06:55:40 – U1WVYaGKBapWIg1HBNGJ
// 2022-03-05T21:38:47 – 8dvgeRjA0e3OtyopLMAp
// 2022-03-15T04:54:38 – 1Z9F9mn2iv62bgjnJ2WU
// 2022-04-06T11:44:27 – yn0brqYwvkow2rpmy6bJ
// 2022-05-04T01:33:11 – aSvI418AwrwwMKTEafhf
// 2022-05-08T16:40:52 – qXKQC4kxJssvP1udyMde
// 2022-05-23T00:26:02 – 5bJXFPF0Bw4vlBQIywfz
// 2022-05-30T23:30:38 – ZKuVdoggWHjZ7YgmtZP9
// 2022-05-31T03:56:57 – kFoaEJ7tNdBdOvSR1QdI
// 2022-06-06T20:21:27 – htofWUdzfQT05tLmILRJ
// 2022-06-13T10:03:00 – ts4LSNM6dtrXu4TkeQWy
// 2022-06-27T01:03:55 – wDaM9xEK578IeU83c7ti
// 2022-07-08T14:54:27 – WGHdJO4pgtn998zGYtFr
// 2022-08-01T05:08:15 – YYLokaouWwLbMC0W1zdb
// 2022-08-02T00:42:51 – DPrSpP5ultGlXIBSpTD2
// 2022-08-03T15:54:57 – 1VZoZ4ZgzfrW2OoK8Cys
// 2022-08-31T16:24:53 – r37xGFmWY2uPMs4FswQl
// 2022-09-14T22:21:55 – b4A1FYr3oLsbyDUSauii
// 2022-09-24T04:07:56 – vsglDGeYVj6nhF9tUSNB
// 2022-09-26T10:55:17 – 3F6LgDkvtQGGvxUH4PQo
// 2022-10-24T14:20:52 – 7TUa28V5nuhBrFkAwMdm
// 2022-10-29T11:35:02 – 8pi3fe9p5Ds8rrBTvzSx
// 2022-11-17T19:12:30 – GvJV6wZJFdK1hJ5MiORd
// 2022-11-30T23:59:01 – sDnaImOKeGPtd1HvwZ0i
// 2022-12-06T02:44:59 – wyDgY6KDkkxO95zQf9MW
// 2022-12-16T07:16:31 – 1t0RlemBlgrIpJQns8if
// 2022-12-19T12:33:26 – o1R08BPtEYOtIJNvPoJq
// 2022-12-29T12:14:47 – pBI6p248kRMlhX0EsEhl
// 2023-02-02T05:04:37 – T9EUdwsTtfgNJhaLlfc9
// 2023-02-02T13:25:19 – zbRYhmVENH7ZxjqFoMQ6
// 2023-02-18T09:29:49 – usZ1G1ycB5RspYTQxsJN
// 2023-03-01T00:44:24 – pB49soWSuTPJnTvgyIJv
// 2023-03-01T09:42:15 – zN9ME7oLsThJhcTVSxSa
// 2023-03-21T11:00:01 – pqMcge9W0zb5pwkM7fxw
// 2023-03-26T11:09:17 – 1WxaCJQrHaPH3Yf2NoDQ
// 2023-04-08T10:52:46 – MKkJmXkgWAgYtxaw1OGa
// 2023-04-21T10:23:37 – Q4eoukWIzcLfTR1lfH4p
// 2023-05-01T13:31:33 – crZnG1LCC2wvELbT6JAb
// 2023-05-04T18:15:53 – PWX2PZC3NlZLcl3Lu9Rc
// 2023-05-21T07:14:56 – WRVzeZI4jkAjz9hIsFr0
// 2023-05-28T19:32:43 – qn5nKzv62XWHDfF1RqdF
// 2023-06-23T22:14:13 – 0op92CNcyrxRTtjnkVJl
// 2023-06-28T16:06:58 – M3XrgbCcHjVw0qS6ZPGL
// 2023-07-09T00:53:34 – jPPhVvqCF2kGHZNKuE3N
// 2023-07-17T11:12:55 – FyVoZHlA4c95t2e0QHbe
// 2023-08-15T21:55:32 – ZUoR9HKpw5G0tGWtA19R
// 2023-08-18T20:13:28 – sflhlaVv0LIRQqwWHdFT
// 2023-09-04T02:10:30 – 1hVaMf3SdW9PrGqZSr0g
// 2023-09-07T18:18:40 – YFylzXriKBUfEY5IE7fk
// 2023-09-17T16:02:08 – 7aCrTNmwC57u1ELtmqtr
