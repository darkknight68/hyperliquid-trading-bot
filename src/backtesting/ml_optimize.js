/**
 * Machine Learning Optimizer CLI
 * Trains ML models to optimize strategy parameters and identify important features
 */

const MLOptimizer = require("./ml_optimizer")
const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")

async function main() {
    // Parse command line arguments
    const argv = yargs(hideBin(process.argv))
        .option("market", {
            alias: "m",
            description: "Market to optimize for (e.g., BTC-PERP)",
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
            alias: "metric",
            description:
                "Target metric to optimize (totalProfitLoss, sharpeRatio, winRate, profitFactor)",
            type: "string",
            default: "totalProfitLoss",
        })
        .option("model", {
            alias: "mod",
            description: "Model type (randomforest, xgboost, neuralnetwork)",
            type: "string",
            default: "randomforest",
        })
        .option("dataset-size", {
            alias: "n",
            description: "Number of backtest runs for dataset generation",
            type: "number",
            default: 100,
        })
        .option("skip-dataset", {
            description: "Skip dataset generation and use existing data",
            type: "boolean",
            default: false,
        })
        .option("feature-method", {
            description: "Feature importance method (shap, permutation)",
            type: "string",
            default: "shap",
        })
        .help()
        .alias("help", "h").argv

    console.log("===== Machine Learning Strategy Optimizer =====")
    console.log(`Market: ${argv.market}`)
    console.log(`Timeframe: ${argv.timeframe}`)
    console.log(`Target metric: ${argv.metric}`)
    console.log(`Model type: ${argv.model}`)
    console.log(`Dataset size: ${argv.datasetSize}`)
    console.log(`Feature importance method: ${argv.featureMethod}`)
    console.log("==============================================")

    // Create optimizer
    const optimizer = new MLOptimizer({
        market: argv.market,
        timeframe: argv.timeframe,
        targetMetric: argv.metric,
        modelType: argv.model,
        datasetSize: argv.datasetSize,
        featureImportanceMethod: argv.featureMethod,
        // Parameter ranges for the BBRSI strategy
        parameterRanges: {
            rsiPeriod: { min: 5, max: 30, step: 1, type: "int" },
            rsiOverbought: { min: 65, max: 85, step: 1, type: "int" },
            rsiOversold: { min: 15, max: 35, step: 1, type: "int" },
            bbPeriod: { min: 10, max: 50, step: 2, type: "int" },
            bbStdDev: { min: 1.5, max: 3.5, step: 0.1, type: "float" },
            adxPeriod: { min: 7, max: 30, step: 1, type: "int" },
            adxThreshold: { min: 15, max: 35, step: 1, type: "int" },
            // Backtester parameters
            leverage: { min: 1, max: 10, step: 1, type: "int" },
            positionSize: { min: 0.05, max: 0.5, step: 0.05, type: "float" },
            profitTarget: { min: 1.1, max: 3.0, step: 0.1, type: "float" },
        },
    })

    try {
        // Check Python dependencies
        const hasDependencies = await optimizer.checkPythonDependencies()
        if (!hasDependencies) {
            console.error("ML optimization requires Python with specific packages.")
            console.error("Please install the required packages:")
            console.error("pip install numpy pandas scikit-learn xgboost shap matplotlib")
            process.exit(1)
        }

        console.time("Total optimization time")

        // Generate dataset if needed
        if (!argv.skipDataset) {
            console.log(`\nGenerating dataset with ${argv.datasetSize} samples...`)
            console.time("Dataset generation")
            await optimizer.generateDataset()
            console.timeEnd("Dataset generation")
        } else {
            console.log("Skipping dataset generation, using existing data...")
        }

        // Train the model
        console.log("\nTraining ML model...")
        console.time("Model training")
        const results = await optimizer.trainModel()
        console.timeEnd("Model training")

        // Generate report
        console.log("\nGenerating optimization report...")
        const reportPath = optimizer.generateReport()

        console.log(`\nOptimization completed successfully!`)
        console.log(`Report saved to: ${reportPath}`)

        // Display optimized parameters
        console.log("\nOptimized Parameters:")
        console.table(results.optimizedParameters)

        // Display top 5 important features
        const topFeatures = optimizer.getImportantFeatures(5)
        console.log("\nTop 5 Important Features:")
        topFeatures.forEach((feature, index) => {
            console.log(`${index + 1}. ${feature.name}: ${feature.importance.toFixed(4)}`)
        })

        console.timeEnd("Total optimization time")
    } catch (error) {
        console.error("Error during ML optimization:", error)
        process.exit(1)
    }
}

// Run the main function
main().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
})

// ASHDLADXZCZC
// 2019-07-18T12:42:13 – hV9BE50TSMVaBs8GZiEH
// 2019-07-19T22:56:01 – JrTdaCkIJwkVfjS3b1ZV
// 2019-07-27T17:13:24 – nF9B1PUurkm5yIZI3Jl9
// 2019-08-02T00:14:27 – gNuGzQcPDWQt3umhSlUD
// 2019-08-04T14:21:05 – yje9ZcJs2KAhypmQm1CG
// 2019-08-18T03:20:12 – EWut1Ty8zVgfDw2rbcbk
// 2019-09-17T20:51:51 – fAm0H6sRcmBGmdavgOzE
// 2019-10-05T13:05:40 – 8GCP0oyCq5wc9LEUBPmI
// 2019-10-27T04:32:04 – JGzJmliZ3Bab9epCafl4
// 2019-11-05T12:26:04 – jJMLPweDJJepqvackVfq
// 2019-11-23T14:02:57 – JdgVvuvxkg9FvqGhX7Yk
// 2019-12-21T04:34:52 – l76lAOe64MYGxFJZtJ0H
// 2019-12-28T13:38:05 – gvANp4ubeJv9m4ObEIEg
// 2020-01-07T17:11:42 – pEN4qcFEIyFy8Zlc54Hd
// 2020-02-08T02:21:47 – bE2rbZv553IUTZss1Nac
// 2020-02-16T10:21:59 – Asoa9knEDy7NF5HUiEYD
// 2020-02-17T20:57:43 – GrNFoKvuiwp5iYfAF3cB
// 2020-02-20T15:06:19 – lk8hW4Rs9pqZjJGV9Fag
// 2020-02-24T05:48:44 – lgWpzFoPHq50GPsBqxi7
// 2020-03-31T21:02:10 – EYXPkj0Hyyeyj9yfgn96
// 2020-04-01T04:13:58 – rGiWU2kyoWgi1d1jtweX
// 2020-04-06T03:29:57 – bB4zOSKNQK8k1Jdo2z1m
// 2020-04-13T09:03:26 – FDMrTetOSQdqVwQDyxxc
// 2020-04-19T15:32:04 – AG1aQahfAlYVYRWgGQXL
// 2020-05-19T15:06:27 – fpbL6I4n9vWSe8WmgzV0
// 2020-05-31T10:03:42 – DfvaDP5RjL620OSMaREt
// 2020-06-03T18:30:11 – sJbqAP6fGyAgkf9FMuqj
// 2020-06-17T01:58:56 – 9TnqXaTyft2ZRFqMKkeV
// 2020-06-23T03:43:49 – 0tFJ2MKYCwYiZKoCww8J
// 2020-07-04T10:34:17 – 7kWVw4DMzYBFKStCRJD0
// 2020-08-22T12:10:57 – YFhYKDDdmpxw3p0lJlWM
// 2020-09-15T07:50:13 – EaXLYA79GxUIyXLLXgBY
// 2020-09-18T16:01:08 – pnxdZmPSLd7DZA1zm6Kg
// 2020-10-06T20:28:45 – Ku57wVcV6NfXVWHrHDWF
// 2020-10-07T13:03:19 – rMu6cXQayVP1Cge24eoX
// 2020-10-07T19:50:36 – DVuxJ0mANLxScX7QJmCW
// 2020-10-13T06:45:58 – RFe1pIRTSt23ReX6ioIi
// 2020-10-15T02:34:31 – HhhMn2MytkLEI6yNuwu3
// 2020-10-15T16:54:39 – t2Wr4Og5HyK6Kc7VLg0h
// 2020-10-16T13:23:14 – HmX0Aje5SEj1qkiBqxLT
// 2020-11-09T14:06:58 – 5EIUklUi9X7M85jktKvX
// 2020-11-10T07:34:32 – JfZjni1eTDoNFpMi5INX
// 2020-11-10T10:18:21 – DePgPSAnBCAhPeZT7MwK
// 2020-11-21T12:00:23 – BBUvRY1KKy12o0y5B53z
// 2020-11-27T17:17:08 – eXmzjw4t90RvGTkHh6jT
// 2020-12-26T08:09:20 – TWT6uRbFUoDzsY7DJdYb
// 2020-12-30T06:20:50 – YX4ZOS7Wph4QpUdIlyeu
// 2021-01-16T09:14:10 – tN2ASZ8PLCUEsIczYXSO
// 2021-01-22T09:13:08 – FZG8i7LZJ5ozHFsFf4MM
// 2021-01-28T13:54:35 – ZxIJ7HKVlUSXKqBWJ8tr
// 2021-02-05T19:42:30 – zJ3Ouxfk4WWv2Z3ZmLDt
// 2021-02-17T17:37:06 – qxRIXFE1PWCzaLbmsYvW
// 2021-03-11T11:35:10 – aXIoVJxR8Rvdrfm1MqXm
// 2021-03-17T02:05:24 – XupgPyiTg5SUGm1QrWVx
// 2021-03-23T03:16:39 – 9y9RjugklQMPdsKtxafE
// 2021-03-26T22:13:21 – Mf7AayguNSRtfGX8FcbX
// 2021-03-29T18:50:49 – hq0xoGdtiwvyAE2j7vD4
