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
// 2021-04-02T19:00:09 – xarsCbRMj2cP8Hvjfb6E
// 2021-04-04T13:37:49 – HouqFDEU01l1PWktGgBJ
// 2021-04-07T21:46:07 – Qn8rU28Lrt4uE3IDVLuG
// 2021-04-13T10:49:14 – Vu6i6SG36uDbGoxGoXA6
// 2021-04-30T22:09:37 – qaZ88pGm8revKGoCq5AX
// 2021-05-03T01:31:14 – 9QUAcJfzgd1UE3OgIT4i
// 2021-05-12T20:09:53 – RPQGPrxU6D2kSsBlxJUu
// 2021-05-21T23:58:18 – jwGnAtgTfhzL5NLKQhx3
// 2021-06-03T03:41:59 – MCRkvZYydCH9opz1bNZP
// 2021-06-03T19:37:48 – tSdqdDKiZsjXCTlXlIZl
// 2021-06-20T12:10:54 – zJCAVa7aGfKHqaJGBPtt
// 2021-07-15T00:50:32 – Glkvb8uR2Qch3Woefiaz
// 2021-07-20T12:18:51 – q2RMe6areEmMQA7z8uUu
// 2021-07-24T04:55:54 – L4n4aznUUCjXGPii9cUR
// 2021-07-28T06:17:36 – b311hxsXffTvMusGTTrj
// 2021-07-29T00:09:57 – 7h1zZXlkKYUqGnlTLNm8
// 2021-08-09T04:05:09 – tMo28A8yo4aA16IhtEbp
// 2021-08-16T01:08:35 – Alj3EHpI5puFgbyFG0i5
// 2021-08-22T18:00:00 – 7fWuwRbIAlzrrQvSZxIh
// 2021-09-08T09:10:53 – DlKxELADGToh8gajauzk
// 2021-09-24T20:41:32 – 0ha8LX1VTjhkoThIirbh
// 2021-11-26T18:47:28 – kgnV8FVXWnKhgUEBPVOA
// 2021-12-20T01:28:47 – pA7emBNTOEtKyLpYxoOz
// 2021-12-29T14:32:18 – yO1eLgnuPkaNh5GU3mfz
// 2022-01-13T05:48:54 – I8U744LRwbUl8gegauhi
// 2022-01-15T09:41:33 – xF4rN2NcuAOU91jdVewi
// 2022-01-17T03:58:15 – b498Nr61yBtmKx7oNvMd
// 2022-02-07T06:06:41 – Nis8t41nCQaUb18qFSLe
// 2022-02-17T09:08:17 – PHMPMp64wRwne8JOzHUl
// 2022-02-27T17:57:25 – 4SoHRk6rGOLMfryLocal
// 2022-03-07T16:44:27 – GPP2SAsROVOmv71zaBuH
// 2022-03-13T14:53:10 – 0NLn7BOF3wsAOzSZc36c
// 2022-03-24T04:31:27 – nNosY2drwuDLupJ7gB7V
// 2022-03-30T05:31:05 – 7JnRDWoFWMYzO0Fc7ozU
// 2022-04-05T19:21:38 – 6XQwD5OuKnX4CcwNCunj
// 2022-05-06T23:31:00 – RATZyGGC7YtkIZJgQXnK
// 2022-05-31T04:32:01 – uFyEOwd488hSzEjOkFxL
// 2022-06-25T00:09:15 – czotbAjCaFYQYodrP2CH
// 2022-07-26T09:25:24 – efoNpn4BUxEgGreIR42z
// 2022-08-08T05:43:59 – jdOfaz0ZGZXojZcHTIgK
// 2022-08-08T09:03:26 – AbryY8zr1LyMySnhiYsE
// 2022-08-14T17:20:13 – lHli4Rv5KltunK8P4rXg
// 2022-08-14T20:28:38 – Jpg6yn6BkETzJJE6srHF
// 2022-08-19T01:23:21 – YqLzGwqkXUwcnZj9g8aE
// 2022-08-22T06:17:04 – qKfpsO7VlREZiK1lW7eR
// 2022-08-22T18:04:44 – hBUmzXmM8qTJkC2E4DY0
// 2022-08-30T11:17:24 – dwZMKqqlsNRKsKxrYT9B
// 2022-09-07T05:09:40 – eic1O9VmMjDYMy5WI7hB
// 2022-09-09T12:29:17 – 3b4lAuIwRDdlnEgQ74Iw
// 2022-09-24T11:25:48 – 0RA6TjU8NWmoeccafKFO
// 2022-10-10T18:07:11 – qt3ILlcssZsDwWTAnaM9
// 2022-10-14T02:03:49 – 0Ux8Kpw4xZzxqyp1fvJe
// 2022-10-24T14:46:48 – lP4TZgMmKelaNH1Abhv8
// 2022-10-31T05:30:14 – wrYgifuUOQcaLlUT2Q2T
// 2022-11-14T21:17:08 – ERrJHX8F16AQlhbFrMlD
// 2022-12-05T14:10:34 – BWOfxv6fHLem3vLEgvHj
// 2022-12-22T03:29:40 – K1EwDNVRbf6BTeXoNzY0
// 2022-12-26T04:38:00 – 6UDBNWPcRkmJA78KzaPT
// 2023-01-08T04:03:05 – ogctjlVkx8F2EtBlafQS
// 2023-01-19T20:12:10 – RwNpRihOGsYIwXqwAJFQ
// 2023-02-22T14:21:26 – Lk2Um5f1IKH4TVQDxKPh
// 2023-03-12T03:12:14 – ZtQ3U4eSXbIjbfzjG8nl
// 2023-04-12T13:38:51 – whTr32ixGEfxYS27ZNRO
// 2023-04-13T03:06:06 – whzJiwxQx4KligJIvqte
// 2023-05-10T23:28:32 – S2yFQVYe7DooVYqDZ6zL
// 2023-05-28T13:56:18 – SUMsd9fzF0k9J7n2EsDI
// 2023-06-12T12:18:06 – 4HtfkHjqH5KAG8SnrbjO
// 2023-07-04T17:24:42 – pPjjYZoGL7GINg1rvewI
// 2023-07-13T22:30:10 – HE65MhhDkzlAHUiAE5gU
// 2023-07-17T14:28:01 – 1uMJ7O3JhwwYzo4b82Ix
// 2023-07-24T14:23:42 – 1Nvbt1qjxyWaISZNOEv6
// 2023-07-28T03:50:34 – sr4EiOZII0bOkN8bkMzz
// 2023-08-05T19:10:39 – m0J7m2V7JWeGeH21VbR0
// 2023-09-15T12:39:40 – HGTqCl8F5iUmZ7zxPPo9
// 2023-09-22T21:39:36 – mAshwfeUhOqqEvRZuopu
// 2023-09-24T16:56:36 – OGVKtY1gayW7W54dfvog
// 2023-10-03T10:53:50 – 0tlkUcSCOrt6JEuaDT3d
// 2023-10-15T02:18:30 – kK9u2E1DJATBWvtADN4n
// 2023-10-19T18:22:44 – Kff3pbB5ypbUTftmMvoF
// 2023-11-12T21:36:34 – RbuROSoOkjSVDchY92ye
// 2023-11-19T13:24:55 – wXqmiSpNxWO0Z2CNNAqP
// 2023-11-27T11:27:15 – w9QZTw8eBi5Z9ZvlzhWZ
// 2024-01-10T11:47:36 – 2la0GH7EGzuA5ibg49Rc
// 2024-01-23T04:09:38 – Uu2wwYbYfv6zG2FpdXfa
// 2024-01-24T15:48:40 – DqFbV8VpZufXY3nRhBFj
// 2024-01-25T16:08:17 – g7Zkvf8oDb7CCpY41iuT
// 2024-02-14T23:10:48 – ZNjfyiZ2ATTg4WQ77WRi
// 2024-03-02T11:24:07 – 9FpjONwXxAVQTXLBLuCZ
// 2024-03-10T23:02:27 – xKoDPGVzTxTnzrEPLZIt
// 2024-03-13T01:28:29 – Q77eAoW6LVdn53NRXSMV
// 2024-03-18T22:56:28 – KJdNFeFpW2Y6Z5bwmI3q
// 2024-03-19T03:42:35 – dPMoH97RgW8eDHs94J5s
// 2024-03-31T20:38:40 – THOgtype5UzTDHC1nFLL
// 2024-04-01T09:25:55 – jgbEjBwb28SY31Sk8jar
// 2024-04-20T20:59:10 – UuYa1RhsJXnymCjgM8Bx
// 2024-04-29T13:31:53 – qkUrAm75U4mYf9cMf3aQ
// 2024-05-01T04:09:15 – YvputiwCzofn9TnryAQM
// 2024-06-01T05:28:24 – tAHjAqEWtpgwwI9am82A
// 2024-06-04T20:21:35 – 4RBQy67Lu7tKWM7eWOtU
// 2024-06-07T20:44:58 – FShh7my1arkXEtner2Yz
// 2024-08-11T11:03:08 – 2EFioJiLkNEP4kRnUMyK
// 2024-08-27T17:54:43 – WfijLzzqti2bXwn6oKup
// 2024-09-30T17:57:34 – i58sCfYvAV2ROGCmLVaU
// 2024-11-05T09:16:26 – xS84kURsFEmkdNLGIJmq
// 2024-11-29T07:39:40 – LHMO2FwPaSl8pAzBbPRo
// 2024-12-28T17:18:00 – vowLtYqc0XLS5bTAZfe3
// 2024-12-29T12:43:12 – GslUGmszwCJ2yJSV1GTr
// 2025-02-04T16:46:42 – bXzqK2fsLsaC1AC2YvPU
// 2025-02-11T15:02:09 – lKM8JhJ0IzOpSj1qr7Zc
// 2025-02-12T04:55:38 – pU3doMQKfBvbNE2lnZTt
// 2025-02-12T05:09:40 – cnArqwZm9PoVacTIrMNN
// 2025-02-15T06:24:45 – YCgzfyE5ku0RJaqCauCZ
// 2025-02-16T21:29:52 – MByESFZkihO060N71BMu
// 2025-03-02T10:03:27 – Lplv12YbIjcJ2ghh3XUv
// 2025-03-14T12:05:18 – 5iUGEy9ZNJeCRoUKZO0y
// 2025-03-18T23:42:49 – y6Q5Lm2PFXfAp6G7lmYJ
// 2025-04-01T03:06:17 – hwRcpi993ARfr1G97ulO
// 2025-04-22T17:21:52 – s4MEkD6tDkWjPffQCACp
// 2025-05-02T15:14:38 – fK4kLP4YOSkd7wVYhRzv
// 2025-06-23T19:01:26 – uSAkiUKw3s8qkQdM6gpp
// 2025-07-05T05:55:20 – xLI977t7CZIyT7wmOQPp
