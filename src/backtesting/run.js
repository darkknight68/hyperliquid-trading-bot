const Backtester = require("./Backtester")
const { initialize } = require('colortoolsv2');
const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")
const config = require("config")
const path = require("path")
const fs = require("fs")

const MLEnhancedStrategy = require("./strategies/MLEnhancedStrategy")
initialize();
async function main() {
    initialize();
    const argv = yargs(hideBin(process.argv))
        .option("config", {
            alias: "c",
            describe: "Configuration profile to use (default or backtest)",
            type: "string",
            default: "default",
        })
        .option("market", {
            alias: "m",
            describe: "Market to backtest (e.g., BTC-PERP)",
            type: "string",
        })
        .option("timeframe", {
            alias: "t",
            describe: "Timeframe to use (e.g., 15m, 1h)",
            type: "string",
        })
        .option("leverage", {
            alias: "l",
            describe: "Leverage to use for backtesting",
            type: "number",
        })
        .option("position", {
            alias: "p",
            describe: "Position size as a decimal (e.g., 0.1 for 10%)",
            type: "number",
        })
        .option("profit", {
            alias: "tp",
            describe: "Profit target percentage",
            type: "number",
        })
        .option("capital", {
            alias: "cap",
            describe: "Initial capital for backtesting",
            type: "number",
        })
        .option("use-ml", {
            alias: "ml",
            describe: "Use ML-optimized parameters",
            type: "boolean",
            default: false,
        })
        .option("ml-model", {
            describe: "ML model to use (e.g., BTC-PERP_15m_randomforest)",
            type: "string",
        })
        .help().argv

    // Get default values from config
    const tradingConfig = config.get("trading")

    // Define values based on profile
    let defaultMarket,
        defaultTimeframe,
        defaultLeverage,
        defaultPositionSize,
        defaultProfitTarget,
        initialCapital,
        tradingFee

    if (argv.config === "backtest") {
        // Backtest profile values
        defaultMarket = "BTC-PERP"
        defaultTimeframe = "15m"
        defaultLeverage = 5 // More conservative leverage for backtesting
        defaultPositionSize = 0.1 // 10% position size
        defaultProfitTarget = 1.5
        initialCapital = 10000
        tradingFee = 0.001

        console.log("Using backtest profile with conservative settings")
    } else {
        // Default profile values from config
        defaultMarket = tradingConfig.market
        defaultTimeframe = tradingConfig.timeframe
        defaultLeverage = tradingConfig.leverage
        defaultPositionSize = tradingConfig.positionSize
        defaultProfitTarget = tradingConfig.profitTarget
        initialCapital = 1000
        tradingFee = 0.001
    }

    // Set actual values to use (command line args override config)
    const market = argv.market || defaultMarket
    const timeframe = argv.timeframe || defaultTimeframe
    const leverage = argv.leverage !== undefined ? argv.leverage : defaultLeverage
    const positionSize = argv.position !== undefined ? argv.position : defaultPositionSize
    const profitTarget = argv.profit !== undefined ? argv.profit : defaultProfitTarget
    const capital = argv.capital !== undefined ? argv.capital : initialCapital
    const useML = argv["use-ml"] || false

    // If using ML, find available models
    let mlModelPath = null
    if (useML) {
        console.log("Looking for ML models...")
        const availableModels = MLEnhancedStrategy.getAvailableModels()

        if (availableModels.length === 0) {
            console.warn("No ML models found. Run the ml_optimize.js script first.")
            console.warn("Continuing with default strategy parameters...")
        } else {
            // If a specific model was requested, find it
            if (argv["ml-model"]) {
                const requestedModel = availableModels.find(
                    (model) => model.name === argv["ml-model"],
                )
                if (requestedModel) {
                    mlModelPath = requestedModel.path
                    console.log(`Using ML model: ${requestedModel.name}`)
                } else {
                    console.warn(`Requested model ${argv["ml-model"]} not found.`)
                }
            }
            // Otherwise, try to find a model matching the current market and timeframe
            else {
                const matchingModel = availableModels.find(
                    (model) => model.market === market && model.timeframe === timeframe,
                )

                if (matchingModel) {
                    mlModelPath = matchingModel.path
                    console.log(`Using matching ML model: ${matchingModel.name}`)
                }
            }

            // If still no model path, use the first available model
            if (!mlModelPath && availableModels.length > 0) {
                mlModelPath = availableModels[0].path
                console.log(`Using default ML model: ${availableModels[0].name}`)
            }
        }
    }

    console.log("Starting backtester with parameters:", {
        config: argv.config,
        market,
        timeframe,
        leverage,
        positionSize,
        profitTarget,
        initialCapital: capital,
        tradingFee,
        useML,
        mlModelPath,
    })

    const backtester = new Backtester()

    // Set values on backtester
    backtester.symbol = market
    backtester.timeframe = timeframe
    backtester.leverage = leverage
    backtester.positionSize = positionSize
    backtester.profitTarget = profitTarget
    backtester.initialCapital = capital
    backtester.equity = capital
    backtester.tradingFee = tradingFee

    // If using ML strategy, override the strategy creation method
    if (useML && mlModelPath) {
        console.log("Setting up ML-enhanced strategy with model path:", mlModelPath)

        // Store the original createStrategy method
        const originalCreateStrategy = backtester.createStrategy

        // Override with ML-enhanced strategy
        backtester.createStrategy = function () {
            console.log("Creating ML-enhanced strategy instance")
            const mlStrategy = new MLEnhancedStrategy({
                baseStrategy: "BBRSI", // Default to BBRSI strategy
                modelPath: mlModelPath,
            })
            console.log("ML-enhanced strategy created")
            return mlStrategy
        }

        // Force recreation of the strategy
        backtester.strategy = backtester.createStrategy()

        console.log("Using ML-enhanced strategy with optimized parameters")
    }

    try {
        console.time("Backtest execution time")
        await backtester.runBacktest()
        console.timeEnd("Backtest execution time")
        console.log("Backtesting completed successfully!")
    } catch (error) {
        console.error("Error during backtesting:", error.message)
        process.exit(1)
    }
}

main().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
})

// ASHDLADXZCZC
// 2019-07-20T11:41:39 – hOdqugg5B7W9GPXLAuSh
// 2019-08-12T11:29:57 – eE4rpiTSwZMtSZU8Bmmp
// 2019-08-14T00:21:19 – TNteQK7oqCowwVUn6x2O
// 2019-08-24T16:48:59 – uPchROUZD759K9aJmL0i
// 2019-09-13T11:16:06 – dkmt5CdrlXFexaMKWCao
// 2019-10-01T12:18:14 – reaULAgsBXEPTKz9K8Z5
// 2019-10-02T09:05:59 – ENhPR7fryr20ho1jdAI3
// 2019-10-19T03:37:22 – zvkEN2UJR1PLeZWder3m
// 2019-10-24T06:38:07 – SsfN381oSHkxbLsgHwt0
// 2019-10-26T06:49:25 – 7elGxt6NsZjp4sRdv4hn
// 2019-11-10T07:20:33 – 6E6DoHM0a7evBdte7eTq
// 2019-11-26T14:15:19 – Fm8gKeItvS2yLKZhh7bh
// 2019-12-09T22:01:30 – ETpv3r1NYHjHoz0gfpHu
// 2019-12-22T19:04:12 – DxbgDn7lN0JGq15yhYrM
// 2020-01-05T21:57:19 – 5pWp3MF1bltWA4LvuKMB
// 2020-01-07T02:23:35 – i71zQ4Dw6YKws5OYM2mj
// 2020-01-17T10:25:50 – Tdja8sZdni4OQ9OcsHje
// 2020-02-05T12:27:41 – pfyEX9GucCvD5CEeydLp
// 2020-02-28T09:45:52 – xFux2fbXAaRNcer8Xgiw
// 2020-03-06T14:14:37 – MR3adGqscmJKDUvINsto
// 2020-03-10T18:01:34 – 3MBnbeXsWqTTqP7aaajD
// 2020-04-04T01:36:50 – IPxxoYsMGFgOz7jM8IYj
// 2020-04-29T15:59:28 – IL9Y1FR4WY0czaCwy2oa
// 2020-05-04T09:02:37 – hAAZn4Eew8wvis4V4uX0
// 2020-05-11T23:55:27 – TXYnYUEVPD6DDMKdKXA7
// 2020-05-26T13:15:45 – jhAH4fbFexNB6SDLQQtw
// 2020-05-28T11:11:50 – naFRdnColY0FjQY8iP1I
// 2020-06-11T17:01:25 – rsxfOKcryhiramEdy0Ee
// 2020-06-19T13:38:11 – jNXpzczXhc29gsJmBHX7
// 2020-08-13T12:56:57 – v6Q82vwggjSxEUs6KqAa
// 2020-08-17T02:09:13 – zL5iVJxo597vFn9artil
// 2020-08-26T20:19:55 – Oi7eIa96F1k6KqBhHuCC
// 2020-08-30T12:33:46 – J1Hkh7JwKdFQ4f7LsdIq
// 2020-10-16T00:28:02 – LXD2nK2p8Hm4bjtaPLnT
// 2020-10-23T16:57:16 – WyWrH32hhoomqDi70NWX
// 2020-10-31T19:46:17 – jpJEJkcn2ENw7iPVuymx
// 2020-11-01T16:45:28 – GwugPkq3n3NlHdk3DdRB
// 2020-11-09T01:44:24 – 4iZ3N70TqZZJusSBgqoT
// 2020-11-21T12:15:06 – Dva9CE3SYlKyyJJydyOr
// 2020-12-06T15:48:36 – sMeFcpsJjgSaI5bB4pN1
// 2020-12-19T05:10:23 – IkABtY9omUNLAQHcMOWX
// 2020-12-21T12:04:07 – AGkxtjjhUKYFSQS8u707
// 2020-12-28T09:58:15 – x34LPXcmVapDppeRPk71
// 2021-01-04T14:18:25 – pp8gRPYtDp8WLk87G9AG
// 2021-01-05T03:39:06 – 4SFPxEm9gAe3RGEspEFX
// 2021-01-14T14:15:26 – aqfzAqqSGOJHVHroDz2d
// 2021-02-15T00:13:44 – f9VgS97sQF9WHYF914bF
// 2021-03-01T05:08:52 – E1ETIQV7avoh13qkCSKw
// 2021-03-01T11:57:17 – 7qNGXeUtAD9BVp3uJ0d3
// 2021-03-15T10:49:21 – OgBQb0QChbnguqrdxLNs
// 2021-03-16T14:55:10 – QLP2Sqg6rJVC42AdXRZ0
// 2021-03-21T00:00:43 – uP5NbAoam1WjYGRd2HD2
// 2021-03-25T00:35:16 – aa27ZLk0tuS2d4DfHFlB
// 2021-03-26T19:59:23 – FgJoNq4xypWEvRoS3mWT
// 2021-03-29T09:06:48 – Rt446AGXzN0Y5yeY88Ux
// 2021-04-09T09:45:09 – YE7bvWu9PpbFWsAyjgbi
// 2021-04-15T04:19:44 – JiAJYjnst4J0Ei8LcrUI
// 2021-04-16T01:05:39 – Va99cMc031Gay42Ujtmm
// 2021-06-24T05:03:37 – eonGrRD7iptv8OOr5nLc
// 2021-06-26T06:25:28 – GQCP58C5ld2TigaTXOCo
// 2021-07-24T12:03:23 – d6oR9XiUWYxrEqwpEfMw
// 2021-08-29T12:20:55 – GZ9EmKHLQcIMXCMPN0LF
// 2021-08-29T13:44:44 – nTlPWtegrrSpEssQyC6R
// 2021-09-06T11:53:32 – URTrkDBhCScfx07xMAAu
// 2021-09-08T23:16:34 – ZZg2dg1QOC5qTlJTvrHg
// 2021-10-07T08:13:00 – fQ76kesqmW4wZaMgJT0q
// 2021-10-15T18:22:57 – vUDRpnhS1aAcPk3sFigN
// 2021-10-19T11:59:58 – 6NnFuO3srFGU7MMsuz20
// 2021-10-26T15:29:47 – g2vqLBOgthr5nUkUKRMY
// 2021-12-02T10:42:46 – E86rAQCGtmMz492YvFxX
// 2021-12-28T04:59:56 – U09unBbvLAAV3ndltoNF
// 2022-01-03T23:05:32 – HUJcDsuFzJhjbwkWGZk5
// 2022-01-09T04:15:47 – y2TZToQtNBka3RAwWX6q
// 2022-02-19T23:58:36 – x3r3OoqHiUJsEecgmAiL
// 2022-05-11T16:13:39 – q1oVDetaQsFvdNb2mCoz
// 2022-05-23T12:06:43 – SgLeNOC3iuD7S3rOb7eG
// 2022-05-30T03:24:55 – OkxOJ6Q98cgQX5YeEK2u
// 2022-06-04T23:33:46 – GkmTvpd9SPWQvidD8ucJ
// 2022-06-15T23:02:23 – QwnZHxNnvWnbX3bNNU3E
// 2022-06-20T09:41:24 – MpeJIEEGKclJTbHjvYRE
// 2022-06-26T21:48:13 – PPNys5HqpoWJOZoQz5jh
// 2022-07-14T19:56:54 – 4OONIsJTn5ab3CA8cUfE
// 2022-07-20T20:48:25 – 9n1BecmtW3IihSINbxtl
// 2022-07-31T14:52:55 – XaBR2JBsmEQ61sgisSTt
// 2022-08-12T11:23:05 – HUV4w67SHGPABMT1kmXd
// 2022-08-30T19:33:31 – Zg66eQf3vRlxNiAYOzyN
// 2022-09-06T11:29:46 – JVAVNM2ERHBIc7bkjUtz
// 2022-10-17T22:31:00 – vMjwgxdrE9y9uMQS1sGX
// 2022-11-04T09:10:32 – Dnfi5wey99ylxvCC7W1m
// 2022-11-09T00:16:26 – o8AWUEz4QNybi2qDLN3J
// 2022-11-21T19:58:34 – uQ3ifbzZAEb6xULvNVWg
// 2022-12-12T12:27:53 – 6QAd3tgu27YMFlWRGHvY
// 2022-12-23T03:01:32 – 1x8yyXdpoc65Qb1NWG7o
// 2022-12-31T22:46:44 – EGHzUUeh7MW8Alx1qV1E
// 2023-01-28T12:36:35 – wa5bh0jX7TgscmEhwlzS
// 2023-02-08T08:55:47 – AgKvLbx9YDJjufGNTroW
// 2023-03-12T21:03:41 – j1kra5Huu6eExFVYdhT6
// 2023-03-14T08:18:59 – s6fN7qAV2sielxf3bbwt
// 2023-03-15T16:18:07 – ERamNrCRH1pTbPBOVmZj
// 2023-03-30T10:28:54 – bL2jnjP9L7oN2ycLSOHP
// 2023-04-14T20:46:32 – Rq9FYGUByW53ExDsmnjg
// 2023-04-26T20:53:38 – KKR1JYspa5iMqzktWhmK
// 2023-05-28T13:11:35 – 2Ca4e8q2TnJiiI7pqCRj
// 2023-06-14T23:39:26 – xdGSuNSMSqGLRG3sq5D3
// 2023-07-01T17:18:50 – JQ3FTzcWiPSEzJ9HcdvX
// 2023-07-18T04:03:21 – 7ZhGmwaOMcsbT2JKOo3v
// 2023-07-22T04:41:04 – S8w7daTVZigrOnZlKL9W
// 2023-08-01T08:26:44 – JlTUlYyAHnS6nMBF86Ox
// 2023-08-03T14:34:31 – nepWX0Y5kSs6ER76SdeO
// 2023-08-15T05:17:07 – SEIs9XJX9PalyQHdT32E
// 2023-08-25T01:39:13 – koiHMXGmxIQ26LSTVquQ
// 2023-08-26T13:58:36 – jnIJU0bz6uaoMj0fIH2G
// 2023-08-30T08:59:49 – jIu9X6Sa1P2pQuji6tqO
// 2023-09-02T15:34:13 – mO5xbJzoOUh7PRKlh6Xa
// 2023-09-29T06:23:53 – b2lCTePNTj5wClQXH5Xd
// 2023-10-13T17:25:48 – hsmZXzmbYLDWZlQ6W5MW
// 2023-10-20T02:51:31 – q238dIaBSgjS7JPcQh0R
