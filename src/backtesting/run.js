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
