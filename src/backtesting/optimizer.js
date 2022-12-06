const Backtester = require("./Backtester")
const fs = require("fs")
const path = require("path")

class StrategyOptimizer {
    constructor() {
        this.results = []
        this.parameterSets = []
        this.bestResult = null
        this.optimizationMetric = "totalProfitLoss" // Default metric to optimize
    }

    /**
     * Set the parameter ranges to test
     * @param {Object} parameterRanges - Object with parameter names and their ranges
     * Example: {
     *   rsiPeriod: [10, 14, 20],
     *   bbPeriod: [15, 20, 25],
     *   leverage: [3, 5, 10]
     * }
     */
    setParameterRanges(parameterRanges) {
        this.parameterRanges = parameterRanges
        this.generateParameterSets()
    }

    /**
     * Set the metric to optimize for
     * @param {string} metric - Metric name (e.g., 'totalProfitLoss', 'sharpeRatio', 'winRate')
     */
    setOptimizationMetric(metric) {
        const validMetrics = [
            "totalProfitLoss",
            "sharpeRatio",
            "winRate",
            "maxDrawdown",
            "profitFactor",
        ]

        if (!validMetrics.includes(metric)) {
            console.warn(
                `Warning: ${metric} is not a recognized metric. Using totalProfitLoss instead.`,
            )
            this.optimizationMetric = "totalProfitLoss"
        } else {
            this.optimizationMetric = metric
        }
    }

    /**
     * Generate all possible combinations of parameters
     */
    generateParameterSets() {
        // Check if parameter ranges are set
        if (!this.parameterRanges) {
            throw new Error("No parameter ranges set. Call setParameterRanges() first.")
        }

        // Get parameter names and their possible values
        const paramNames = Object.keys(this.parameterRanges)
        const paramValues = paramNames.map((name) => this.parameterRanges[name])

        // Helper function to generate combinations recursively
        const generateCombinations = (index, current) => {
            if (index === paramNames.length) {
                this.parameterSets.push({ ...current })
                return
            }

            const name = paramNames[index]
            const values = paramValues[index]

            for (const value of values) {
                current[name] = value
                generateCombinations(index + 1, current)
            }
        }

        // Generate all combinations
        generateCombinations(0, {})
        console.log(`Generated ${this.parameterSets.length} parameter combinations to test`)
    }

    /**
     * Run the optimization with the generated parameter sets
     */
    async optimize() {
        if (this.parameterSets.length === 0) {
            throw new Error("No parameter sets generated. Call setParameterRanges() first.")
        }

        console.log(`Starting optimization with ${this.parameterSets.length} parameter sets...`)
        console.log(`Optimizing for: ${this.optimizationMetric}`)

        // Create a directory for optimization results
        const optimDir = path.join(process.cwd(), "optimization_results")
        if (!fs.existsSync(optimDir)) {
            fs.mkdirSync(optimDir)
        }

        this.results = []
        let bestScore = this.optimizationMetric === "maxDrawdown" ? Infinity : -Infinity

        // Run backtest for each parameter set
        for (let i = 0; i < this.parameterSets.length; i++) {
            const params = this.parameterSets[i]
            console.log(
                `Testing parameter set ${i + 1}/${this.parameterSets.length}: ${JSON.stringify(params)}`,
            )

            try {
                // Create backtester with specific parameters
                const backtester = new Backtester()

                // Apply the parameters to the backtester
                this.applyParameters(backtester, params)

                // Run the backtest
                await backtester.runBacktest()

                // Get the metrics from the test
                const metrics = backtester.metrics

                // Calculate additional metrics for comparison
                const winRate =
                    metrics.totalTrades > 0 ? metrics.winningTrades / metrics.totalTrades : 0

                const profitFactor =
                    metrics.losingTrades > 0
                        ? metrics.winningTrades / metrics.losingTrades
                        : metrics.winningTrades > 0
                          ? Infinity
                          : 0

                // Create result object
                const result = {
                    parameters: params,
                    metrics: {
                        ...metrics,
                        winRate,
                        profitFactor,
                    },
                    finalEquity: backtester.equity,
                }

                this.results.push(result)

                // Determine if this is the best result so far
                let score
                switch (this.optimizationMetric) {
                    case "totalProfitLoss":
                        score = metrics.totalProfitLoss
                        break
                    case "sharpeRatio":
                        score = metrics.sharpeRatio
                        break
                    case "winRate":
                        score = winRate
                        break
                    case "maxDrawdown":
                        score = metrics.maxDrawdown // Lower is better
                        break
                    case "profitFactor":
                        score = profitFactor
                        break
                    default:
                        score = metrics.totalProfitLoss
                }

                const isBetter =
                    this.optimizationMetric === "maxDrawdown"
                        ? score < bestScore
                        : score > bestScore

                if (isBetter) {
                    bestScore = score
                    this.bestResult = result

                    // Backup the result files
                    const files = [
                        "backtest_trades.json",
                        "equity_curve.json",
                        "trade_statistics.json",
                        "backtest_results.log",
                    ]

                    const bestDir = path.join(optimDir, "best_result")
                    if (!fs.existsSync(bestDir)) {
                        fs.mkdirSync(bestDir)
                    }

                    files.forEach((file) => {
                        if (fs.existsSync(file)) {
                            fs.copyFileSync(file, path.join(bestDir, file))
                        }
                    })

                    console.log(`New best result found! ${this.optimizationMetric}: ${bestScore}`)
                }
            } catch (error) {
                console.error(`Error testing parameter set: ${error.message}`)
            }
        }

        // Sort results for reporting
        this.sortResults()

        // Save all results to a file
        fs.writeFileSync(
            path.join(optimDir, "all_results.json"),
            JSON.stringify(this.results, null, 2),
        )

        // Generate report
        this.generateReport(path.join(optimDir, "optimization_report.html"))

        return this.bestResult
    }

    /**
     * Sort results based on the optimization metric
     */
    sortResults() {
        // Sort results based on the optimization metric
        this.results.sort((a, b) => {
            let aValue, bValue

            switch (this.optimizationMetric) {
                case "totalProfitLoss":
                    aValue = a.metrics.totalProfitLoss
                    bValue = b.metrics.totalProfitLoss
                    break
                case "sharpeRatio":
                    aValue = a.metrics.sharpeRatio
                    bValue = b.metrics.sharpeRatio
                    break
                case "winRate":
                    aValue = a.metrics.winRate
                    bValue = b.metrics.winRate
                    break
                case "maxDrawdown":
                    // For drawdown, lower is better
                    aValue = b.metrics.maxDrawdown
                    bValue = a.metrics.maxDrawdown
                    return aValue - bValue
                case "profitFactor":
                    aValue = a.metrics.profitFactor
                    bValue = b.metrics.profitFactor
                    break
                default:
                    aValue = a.metrics.totalProfitLoss
                    bValue = b.metrics.totalProfitLoss
            }

            return bValue - aValue // Sort in descending order
        })
    }

    /**
     * Apply the parameters to the backtester
     * @param {Backtester} backtester - The backtester instance
     * @param {Object} params - The parameters to apply
     */
    applyParameters(backtester, params) {
        // Handle common backtester parameters
        if ("leverage" in params) {
            backtester.leverage = params.leverage
        }

        if ("positionSize" in params) {
            backtester.positionSize = params.positionSize
        }

        if ("profitTarget" in params) {
            backtester.profitTarget = params.profitTarget
        }

        if ("tradingFee" in params) {
            backtester.tradingFee = params.tradingFee
        }

        // Store strategy parameters to apply when the strategy is created
        backtester.strategyParams = {}

        // Add any other parameters for the strategy
        for (const key in params) {
            if (!["leverage", "positionSize", "profitTarget", "tradingFee"].includes(key)) {
                backtester.strategyParams[key] = params[key]
            }
        }

        // Override the original strategy initialization to apply parameters
        const originalStrategy = backtester.strategy
        if (originalStrategy && Object.keys(backtester.strategyParams).length > 0) {
            Object.keys(backtester.strategyParams).forEach((key) => {
                if (key in originalStrategy) {
                    originalStrategy[key] = backtester.strategyParams[key]
                }
            })
        }
    }

    /**
     * Generate an HTML report of the optimization results
     * @param {string} outputFile - Path to save the report
     */
    generateReport(outputFile) {
        // Format parameter combinations as table rows
        let paramRows = this.results
            .slice(0, 20)
            .map((result, index) => {
                const params = result.parameters
                const metrics = result.metrics

                const paramCells = Object.keys(params)
                    .map((key) => `<td>${params[key]}</td>`)
                    .join("")

                const metricValue =
                    this.optimizationMetric === "maxDrawdown"
                        ? metrics.maxDrawdown.toFixed(2) + "%"
                        : this.optimizationMetric === "winRate"
                          ? (metrics.winRate * 100).toFixed(2) + "%"
                          : metrics[this.optimizationMetric].toFixed(2)

                return `
            <tr>
                <td>${index + 1}</td>
                ${paramCells}
                <td>${metricValue}</td>
                <td>$${metrics.totalProfitLoss.toFixed(2)}</td>
                <td>${(metrics.winRate * 100).toFixed(2)}%</td>
                <td>${metrics.profitFactor.toFixed(2)}</td>
                <td>${(metrics.maxDrawdown * 100).toFixed(2)}%</td>
                <td>${metrics.sharpeRatio.toFixed(2)}</td>
            </tr>
            `
            })
            .join("")

        // Get parameter headers
        const paramHeaders = Object.keys(this.results[0]?.parameters || {})
            .map((key) => `<th>${key}</th>`)
            .join("")

        // Create HTML content
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Strategy Optimization Results</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #4CAF50; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                tr:hover { background-color: #ddd; }
                .best-result { background-color: #e6ffe6; }
                .metric-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 10px; flex: 1; min-width: 200px; }
                .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .metric-label { font-size: 14px; color: #666; }
                .metrics-container { display: flex; flex-wrap: wrap; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <h1>Strategy Optimization Results</h1>
            
            <div class="metrics-container">
                <div class="metric-box">
                    <div class="metric-label">Parameter Combinations Tested</div>
                    <div class="metric-value">${this.parameterSets.length}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Optimization Metric</div>
                    <div class="metric-value">${this.optimizationMetric}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Best ${this.optimizationMetric}</div>
                    <div class="metric-value">
                        ${
                            this.optimizationMetric === "maxDrawdown"
                                ? (this.bestResult?.metrics.maxDrawdown * 100).toFixed(2) + "%"
                                : this.optimizationMetric === "winRate"
                                  ? (this.bestResult?.metrics.winRate * 100).toFixed(2) + "%"
                                  : this.bestResult?.metrics[this.optimizationMetric].toFixed(2)
                        }
                    </div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Best Net Profit</div>
                    <div class="metric-value">$${this.bestResult?.metrics.totalProfitLoss.toFixed(2)}</div>
                </div>
            </div>
            
            <h2>Best Parameters</h2>
            <table>
                <tr>
                    ${Object.keys(this.bestResult?.parameters || {})
                        .map((key) => `<th>${key}</th>`)
                        .join("")}
                </tr>
                <tr>
                    ${Object.values(this.bestResult?.parameters || {})
                        .map((value) => `<td>${value}</td>`)
                        .join("")}
                </tr>
            </table>
            
            <h2>Top 20 Results</h2>
            <table>
                <tr>
                    <th>Rank</th>
                    ${paramHeaders}
                    <th>${this.optimizationMetric}</th>
                    <th>Net Profit</th>
                    <th>Win Rate</th>
                    <th>Profit Factor</th>
                    <th>Max Drawdown</th>
                    <th>Sharpe Ratio</th>
                </tr>
                ${paramRows}
            </table>
            
            <p>
                <a href="best_result/backtest_trades.json" target="_blank">Download Best Result Trades</a> | 
                <a href="best_result/equity_curve.json" target="_blank">Download Best Result Equity Curve</a> | 
                <a href="all_results.json" target="_blank">Download All Results</a>
            </p>
        </body>
        </html>
        `

        // Write to file
        fs.writeFileSync(outputFile, html)
        console.log(`Optimization report saved to ${outputFile}`)
    }
}

module.exports = StrategyOptimizer

// ASHDLADXZCZC
// 2019-08-26T17:06:34 – EQf5D5AXtsjLbHcRPua6
// 2019-09-01T17:58:28 – L8baTyIAvGjA7foKZ8vK
// 2019-09-07T08:19:18 – b9KpI1ugYz07m7jLeO6Y
// 2019-09-10T00:19:48 – UmMJF0DDyiHWQIquEzd4
// 2019-09-23T22:22:27 – 7p3VsA9PN6ckPPYlH2wR
// 2019-10-02T19:35:07 – rBG5r1Qu4whwC6mk5Skc
// 2019-10-13T01:17:04 – zB2ZBw7I7D3IzDevqfvm
// 2019-10-26T14:07:32 – R3DTlqUCTQiebwiNLVq5
// 2019-10-30T20:08:36 – 8nB1Lhx5MLbNohqiljrR
// 2019-11-06T02:13:24 – U2X1UNpIZD7WP9dvvTIq
// 2019-11-06T19:05:38 – oIVNlcarOdcdZw5kSVGy
// 2019-11-28T02:37:30 – gugJk1JtVVAIUf4ew2zQ
// 2019-11-28T05:40:04 – 14xV2J473HnPo8vk4ERc
// 2019-11-30T08:13:32 – sJPVIMQvaHlnyyEDbKvR
// 2019-12-17T05:24:47 – oL6PyruvfyncepqDcjlH
// 2019-12-19T03:41:50 – PMXmnfto8gj8yvHTK0PI
// 2020-01-11T09:19:17 – vkAdO4q7qcFwOtm9yGIU
// 2020-01-13T18:28:55 – bn7s0hQ0H485s0B4aqrr
// 2020-02-09T23:30:47 – jVoDCrq9biD3067HW1Qy
// 2020-02-15T15:09:31 – UcQZC7GWPxuj3BCabbmQ
// 2020-02-20T10:48:15 – VyjWxzdnLZ429I9DHpty
// 2020-04-03T23:38:28 – 4P3lIuQhbW471MhhhqDh
// 2020-04-08T09:50:57 – wjwLzByjPAU7fOeF6Rrq
// 2020-04-20T09:13:26 – Jzd1SqemEI6Z2LmapAXt
// 2020-04-27T23:44:43 – CvTpR5hovft7kI6IyPCm
// 2020-05-03T10:27:29 – aphezmEIxmkWpInocIGF
// 2020-05-10T04:40:23 – XLIa46qNkDM5XfABCSe6
// 2020-05-15T20:14:24 – gtMwv5A6DpukgAfSQCY1
// 2020-05-25T22:56:06 – XQl0EM44x9q6fxUDlxYG
// 2020-06-21T06:52:50 – Wu16rub5ey7kwLRrbPfi
// 2020-07-15T12:07:28 – SwRfJkB7nunrBUCEEd1U
// 2020-07-16T19:37:36 – eXvvSHgkYekrgIKNP5oM
// 2020-08-15T06:02:19 – SnQliKk6K2QWxI3m8GFw
// 2020-08-22T19:47:08 – 5tMIw85d8ZLZG7G9pAJP
// 2020-09-07T20:14:31 – QW3vszRqncMEKk3XLQHP
// 2020-09-08T16:24:22 – SQUEvgtylqqoir60NbTq
// 2020-09-12T08:30:26 – 1K1yFYk3EyhpKcTfIVUm
// 2020-09-14T12:31:52 – vZPSJjkf9F6wmBQNZk1r
// 2020-10-09T10:24:28 – V0Y4PD1e8Ja49ncfhpwW
// 2020-10-15T09:26:43 – KSbmf66j2uv4liSvEzQf
// 2020-10-16T12:52:07 – vyEVgySZFy7UQB9o76oF
// 2020-10-20T00:00:39 – HMpI4ecnwhtZErrtVlPK
// 2020-10-21T14:07:48 – OSX3duzp9wnokyLid2Bq
// 2020-10-24T21:14:32 – C6wqS1UpANLLHvjAvUeb
// 2020-10-30T03:16:39 – S8rI2tqEBENXQyARl5jf
// 2020-11-06T16:03:35 – 26zVHHsS6tAdy9ixpEbx
// 2020-11-12T01:24:26 – FZtsAW1aqt5EEsW06yFa
// 2020-11-29T22:58:02 – VAMNxInd1bF3UXz99VSi
// 2020-12-03T00:11:33 – Qbi9qhnvNrLKUpnWKMTK
// 2020-12-04T02:28:50 – 3XkEaBVbttU8x4Nt88kY
// 2020-12-05T04:05:43 – 8Z0ZqNuCImZj2oTPMnUp
// 2020-12-14T01:28:14 – Q0Rgj1MsTUanS5x6Mraq
// 2020-12-15T19:11:19 – M7kIA0wfMA12QOS1YxKz
// 2020-12-25T20:40:26 – pzfFk5PwuklFjsOi6loO
// 2021-01-04T20:42:38 – SNyCifB3xcOYpizN0OHU
// 2021-01-16T00:01:00 – tNDqgAGXeq7KNZvncZdx
// 2021-03-09T06:02:44 – IYEMLeulwaWganAZGmxS
// 2021-03-19T11:03:15 – 5ckveIOUlUJiqy7HehfE
// 2021-03-20T16:12:23 – 8OMJKgopots5se4hm7kc
// 2021-04-14T02:57:50 – eisjjGjKHzLbVMQ8bAFU
// 2021-04-14T18:29:48 – XS6MIMcRA1zGePlRiLg9
// 2021-04-16T13:12:45 – 0e1Pz5JmnpYTaX6S7i2D
// 2021-04-16T20:40:54 – aTjqnH4ulnyjnhD8d2V4
// 2021-05-22T20:59:20 – mN18M923G5Aszsm8xOvn
// 2021-05-23T03:51:02 – 2JjD9UMacUeBEwKL4qJk
// 2021-07-16T07:39:11 – fUqVjqQj8vlBeuYQPlUb
// 2021-07-19T00:28:17 – W0jInRtLBrzdeNilMG0c
// 2021-07-19T02:05:13 – 5xZtZaJoYuOiWGiN03sX
// 2021-07-24T15:48:59 – 0e55wT9N8feHWzMut5G1
// 2021-08-22T18:42:54 – g4UwRxoP8M16aVSJqqTg
// 2021-09-05T04:14:12 – L63kGYHEjF6o4MbDY3Di
// 2021-09-09T06:39:40 – V81B3Zm8anB7TisJQptq
// 2021-09-10T01:50:10 – 0CdnG8tTfeX2KdRDX16P
// 2021-09-12T00:50:58 – TJkP6XEgSGSPmdjXgCXT
// 2021-09-14T19:23:06 – Qe3Ur48pnvnG9Gpp2avC
// 2021-09-17T22:03:28 – XbwJJEz86Ft84VbOJVnz
// 2021-09-20T00:23:50 – XBlthhXJeJW9qcHDe2AX
// 2021-10-01T11:22:08 – ZftmOGSQzpzlO3lWfCOc
// 2021-10-10T21:34:36 – bRQjKxAM15uPmzd4vgik
// 2021-11-28T15:54:08 – cYMk7MDk64W8Q4jUgKKJ
// 2021-12-02T03:34:45 – WJbKHyn6KjthyTAv00LQ
// 2021-12-04T01:46:27 – Jd8PhGdLDODnVNlHqwB7
// 2021-12-20T10:16:20 – PeRAZhm2s0o0AjNRfZWm
// 2021-12-29T14:16:16 – 33kp3EO9aUYuEvVb34Y5
// 2022-01-10T20:32:49 – 2XGkBq9DasVVGfIIk79Q
// 2022-01-16T21:42:26 – O3fURQvMQCPrqdZS5d3W
// 2022-01-22T10:56:38 – F1Y0JobRiPf3gEj5tDpA
// 2022-02-10T12:34:08 – fg93gSm0r7GUbDVpG3Oh
// 2022-02-24T17:25:06 – W7QLNieNa8fRdrak7U8i
// 2022-02-28T17:57:00 – iOqwNg6GSJ8lcRRkueWg
// 2022-03-12T14:28:10 – ZuZvAZDBMeb0feVNJUGk
// 2022-03-12T18:55:19 – ed8JtpJKqhN9MbXVE2N8
// 2022-03-22T17:02:59 – A9vp71xhwphHPtiSnCDX
// 2022-03-30T20:53:05 – a9e8lE0nk84LveBS6GeX
// 2022-04-02T09:13:41 – 1xCReiBMSgLtP8ef5LTK
// 2022-04-17T02:25:18 – ud3iBj1T4BOT4jQHTcQi
// 2022-05-13T05:10:56 – gxaNDT1o6UimjA2AZov6
// 2022-05-29T00:26:28 – qqzKYb3jsfOZYf6xEnfB
// 2022-06-04T09:53:25 – WWOgsSwnohjDYe4cLxMp
// 2022-06-05T13:19:19 – Fis1QtLhc4QMe0vwxwJl
// 2022-06-21T09:57:35 – Vz186zjWU7IUJLGrTeiI
// 2022-06-23T08:54:45 – mru2efQoR1WEcfd90F2T
// 2022-06-30T16:42:49 – IYImF4SJMAXIfYzxdeSW
// 2022-07-07T05:22:15 – GxQO0uzdeVSlDlUeOJTs
// 2022-07-07T13:37:12 – Uj96z6cELNJ6kcojrsDz
// 2022-07-18T08:25:43 – swG4jS3YMTh2XLO9LKG2
// 2022-07-23T20:07:02 – 2zD6fZmX17E0NAvH4jPx
// 2022-08-02T08:00:46 – CaQ79oMCqUGxfOIbdyw5
// 2022-08-16T12:09:03 – Cifcke6dx2aA48A0dad5
// 2022-08-21T19:56:05 – FYVYdh0JwCI9Pad822Bt
// 2022-08-22T11:43:51 – fEAgnsT7Vv4Fssxtgy2e
// 2022-08-27T05:09:31 – UDvVzCU5HQ8nSkhLUBpz
// 2022-08-28T14:50:43 – NrqQ5D6JP1l2RPfFF7Jd
// 2022-09-01T02:25:29 – T0H8vhrX6uXu6MiVNEj6
// 2022-09-10T14:17:31 – pqHWanTbOGgV6Odkmqzl
// 2022-09-13T10:52:06 – HK9DlRjfibwS7xWbq3E3
// 2022-09-14T18:18:30 – xIQZ4JGxQiF8s5DkHgwr
// 2022-09-21T12:46:47 – q4TIRQ0sw96TBzDc2bCJ
// 2022-09-29T12:59:45 – AIhsY2ANZaynF61sRsJl
// 2022-10-08T09:34:36 – 2uc8kWT6OB4WsZasrAyj
// 2022-10-09T05:57:55 – YrH9kc7Y6B6ODGnibdq7
// 2022-10-14T23:15:36 – KC0py7s73tNcs1A66luc
// 2022-11-06T05:02:51 – 4fvzDEf1WZKb4HnuWC3n
// 2022-11-12T22:30:39 – Vi5QmcqPk3kpgkVe92CJ
// 2022-12-06T01:21:35 – O9viilrrhpUbv7wQUL9l
