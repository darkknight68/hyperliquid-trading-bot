const Backtester = require("./Backtester")
const fs = require("fs")
const path = require("path")
const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")

class MultiSymbolTester {
    constructor(options = {}) {
        this.markets = options.markets || []
        this.timeframe = options.timeframe || "15m"
        this.leverage = options.leverage || 5
        this.positionSize = options.positionSize || 0.1
        this.profitTarget = options.profitTarget || 1.5
        this.initialCapital = options.initialCapital || 10000
        this.tradingFee = options.tradingFee || 0.001
        this.startDate = options.startDate || null
        this.endDate = options.endDate || null
        this.strategyParams = options.strategyParams || {}

        this.results = []
        this.combinedEquityCurve = []
        this.combinedMetrics = {
            totalProfitLoss: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalTrades: 0,
            winRate: 0,
            averageWin: 0,
            averageLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            profitFactor: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            marketsCovered: 0,
        }
    }

    /**
     * Add a market to test
     * @param {string} market - Market symbol
     */
    addMarket(market) {
        if (!this.markets.includes(market)) {
            this.markets.push(market)
        }
    }

    /**
     * Set multiple markets to test
     * @param {Array<string>} markets - Array of market symbols
     */
    setMarkets(markets) {
        this.markets = [...markets]
    }

    /**
     * Run backtests on all specified markets
     */
    async runAllBacktests() {
        if (this.markets.length === 0) {
            throw new Error("No markets specified. Add markets before running tests.")
        }

        console.log(`Starting multi-symbol backtest on ${this.markets.length} markets`)
        console.log(
            `Timeframe: ${this.timeframe}, Leverage: ${this.leverage}, Position Size: ${this.positionSize}, Profit Target: ${this.profitTarget}`,
        )

        // Create output directory
        const outputDir = path.join(process.cwd(), "multi_symbol_results")
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir)
        }

        let overallEquity = this.initialCapital
        this.results = []

        // Initialize the combined equity curve with the initial capital
        this.combinedEquityCurve = []
        const firstTimestamp = new Date().getTime()
        this.combinedEquityCurve.push({
            timestamp: firstTimestamp,
            equity: overallEquity,
            drawdown: 0,
            trade: null,
        })

        // Track the combined performance metrics
        let combinedWinningTrades = 0
        let combinedLosingTrades = 0
        let combinedTotalTrades = 0
        let combinedProfitLoss = 0
        let combinedTotalWin = 0
        let combinedTotalLoss = 0
        let combinedLargestWin = 0
        let combinedLargestLoss = 0
        let allReturns = []

        for (let i = 0; i < this.markets.length; i++) {
            const market = this.markets[i]
            console.log(`\nTesting market ${i + 1}/${this.markets.length}: ${market}`)

            try {
                // Create backtester for this market
                const backtester = new Backtester({
                    market,
                    timeframe: this.timeframe,
                    leverage: this.leverage,
                    positionSize: this.positionSize,
                    profitTarget: this.profitTarget,
                    initialCapital: this.initialCapital,
                    tradingFee: this.tradingFee,
                })

                // Apply any strategy parameters
                if (Object.keys(this.strategyParams).length > 0) {
                    Object.assign(backtester.strategyParams, this.strategyParams)
                }

                // Set date range if specified
                if (this.startDate) {
                    backtester.startDate = this.startDate
                }
                if (this.endDate) {
                    backtester.endDate = this.endDate
                }

                // Run the backtest
                await backtester.runBacktest()

                // Get results
                const marketResult = {
                    market,
                    metrics: backtester.metrics,
                    finalEquity: backtester.equity,
                    equityCurve: backtester.equityCurve,
                    trades: backtester.trades,
                }

                // Add to overall results
                this.results.push(marketResult)

                // Update combined metrics
                combinedWinningTrades += backtester.metrics.winningTrades
                combinedLosingTrades += backtester.metrics.losingTrades
                combinedTotalTrades += backtester.metrics.totalTrades
                combinedProfitLoss += backtester.metrics.totalProfitLoss

                // Track combined win/loss metrics
                combinedTotalWin += backtester.metrics.winningTrades * backtester.metrics.averageWin
                combinedTotalLoss +=
                    backtester.metrics.losingTrades * Math.abs(backtester.metrics.averageLoss)

                if (backtester.metrics.largestWin > combinedLargestWin) {
                    combinedLargestWin = backtester.metrics.largestWin
                }

                if (Math.abs(backtester.metrics.largestLoss) > combinedLargestLoss) {
                    combinedLargestLoss = Math.abs(backtester.metrics.largestLoss)
                }

                // Add daily returns to combined returns
                allReturns = allReturns.concat(backtester.dailyReturns || [])

                // Update combined equity curve
                this.mergeCurves(backtester.equityCurve)

                // Generate market-specific reports
                this.generateMarketReport(market, marketResult, outputDir)

                console.log(`Market ${market} test complete: `)
                console.log(`  Profit/Loss: $${backtester.metrics.totalProfitLoss.toFixed(2)}`)
                console.log(`  Win Rate: ${(backtester.metrics.winRate * 100).toFixed(2)}%`)
                console.log(`  Max Drawdown: ${(backtester.metrics.maxDrawdown * 100).toFixed(2)}%`)
                console.log(`  Trades: ${backtester.metrics.totalTrades}`)
            } catch (error) {
                console.error(`Error testing market ${market}: ${error.message}`)
            }
        }

        // Calculate combined metrics
        const successfulMarkets = this.results.length
        this.combinedMetrics = {
            totalProfitLoss: combinedProfitLoss,
            winningTrades: combinedWinningTrades,
            losingTrades: combinedLosingTrades,
            totalTrades: combinedTotalTrades,
            winRate: combinedTotalTrades > 0 ? combinedWinningTrades / combinedTotalTrades : 0,
            averageWin: combinedWinningTrades > 0 ? combinedTotalWin / combinedWinningTrades : 0,
            averageLoss: combinedLosingTrades > 0 ? -combinedTotalLoss / combinedLosingTrades : 0,
            largestWin: combinedLargestWin,
            largestLoss: -combinedLargestLoss,
            profitFactor:
                combinedTotalLoss > 0
                    ? combinedTotalWin / combinedTotalLoss
                    : combinedTotalWin > 0
                      ? Infinity
                      : 0,
            maxDrawdown: this.calculateMaxDrawdown(this.combinedEquityCurve),
            sharpeRatio: this.calculateSharpeRatio(allReturns),
            marketsCovered: successfulMarkets,
        }

        // Save combined equity curve
        fs.writeFileSync(
            path.join(outputDir, "combined_equity_curve.json"),
            JSON.stringify(this.combinedEquityCurve, null, 2),
        )

        // Save combined metrics
        fs.writeFileSync(
            path.join(outputDir, "combined_metrics.json"),
            JSON.stringify(this.combinedMetrics, null, 2),
        )

        // Save all results
        fs.writeFileSync(
            path.join(outputDir, "all_results.json"),
            JSON.stringify(this.results, null, 2),
        )

        // Generate summary report
        this.generateSummaryReport(outputDir)

        console.log("\n--- Multi-Symbol Backtest Complete ---")
        console.log(
            `Tested ${successfulMarkets} out of ${this.markets.length} markets successfully`,
        )
        console.log(`Combined Profit/Loss: $${this.combinedMetrics.totalProfitLoss.toFixed(2)}`)
        console.log(`Combined Win Rate: ${(this.combinedMetrics.winRate * 100).toFixed(2)}%`)
        console.log(
            `Combined Max Drawdown: ${(this.combinedMetrics.maxDrawdown * 100).toFixed(2)}%`,
        )
        console.log(`Total Trades: ${this.combinedMetrics.totalTrades}`)
        console.log(`Sharpe Ratio: ${this.combinedMetrics.sharpeRatio.toFixed(2)}`)
        console.log(`Results saved to ${outputDir}`)

        return {
            results: this.results,
            combinedMetrics: this.combinedMetrics,
            combinedEquityCurve: this.combinedEquityCurve,
        }
    }

    /**
     * Merge a market equity curve into the combined curve
     * @param {Array} marketCurve - The market equity curve to merge
     */
    mergeCurves(marketCurve) {
        if (!marketCurve || marketCurve.length === 0) return

        // Create a map of the existing timestamps in combined curve
        const combinedMap = new Map()
        this.combinedEquityCurve.forEach((point) => {
            combinedMap.set(point.timestamp, point)
        })

        // Process each point in the market curve
        marketCurve.forEach((marketPoint) => {
            const timestamp = marketPoint.timestamp

            if (combinedMap.has(timestamp)) {
                // If this timestamp exists, update the equity
                const combinedPoint = combinedMap.get(timestamp)

                // If this point has a trade, add its PnL to the combined equity
                if (marketPoint.trade) {
                    combinedPoint.equity += marketPoint.trade.pnl || 0
                    combinedPoint.trade = marketPoint.trade // Store the latest trade
                }

                // Update drawdown calculation later
            } else {
                // If this timestamp doesn't exist yet, add it to the combined curve
                // but use the latest equity from the combined curve as a base
                const latestEquity =
                    this.combinedEquityCurve[this.combinedEquityCurve.length - 1].equity

                const newPoint = {
                    timestamp,
                    equity: latestEquity,
                    drawdown: 0,
                    trade: marketPoint.trade,
                }

                // If this point has a trade, add its PnL
                if (marketPoint.trade) {
                    newPoint.equity += marketPoint.trade.pnl || 0
                }

                this.combinedEquityCurve.push(newPoint)
                combinedMap.set(timestamp, newPoint)
            }
        })

        // Sort combined curve by timestamp
        this.combinedEquityCurve.sort((a, b) => a.timestamp - b.timestamp)

        // Recalculate drawdowns for the entire curve
        this.recalculateDrawdowns()
    }

    /**
     * Recalculate drawdowns for the entire equity curve
     */
    recalculateDrawdowns() {
        let peak = this.initialCapital

        for (let i = 0; i < this.combinedEquityCurve.length; i++) {
            const point = this.combinedEquityCurve[i]

            // Update peak if we have a new high
            if (point.equity > peak) {
                peak = point.equity
            }

            // Calculate drawdown as a percentage from peak
            const drawdown = peak > 0 ? (peak - point.equity) / peak : 0
            point.drawdown = drawdown
        }
    }

    /**
     * Calculate maximum drawdown from equity curve
     * @param {Array} equityCurve - The equity curve
     * @returns {number} Maximum drawdown as a decimal
     */
    calculateMaxDrawdown(equityCurve) {
        if (!equityCurve || equityCurve.length === 0) return 0

        let maxDrawdown = 0
        for (const point of equityCurve) {
            if (point.drawdown > maxDrawdown) {
                maxDrawdown = point.drawdown
            }
        }

        return maxDrawdown
    }

    /**
     * Calculate Sharpe Ratio from array of returns
     * @param {Array} returns - Array of daily returns
     * @returns {number} Sharpe Ratio
     */
    calculateSharpeRatio(returns) {
        if (!returns || returns.length === 0) return 0

        // Calculate average return
        const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length

        // Calculate standard deviation
        const variance =
            returns.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) / returns.length
        const stdDev = Math.sqrt(variance)

        // Annualized Sharpe Ratio (assuming daily returns)
        const annualizedReturn = avgReturn * 252 // 252 trading days in a year
        const annualizedStdDev = stdDev * Math.sqrt(252)

        return annualizedStdDev > 0 ? annualizedReturn / annualizedStdDev : 0
    }

    /**
     * Generate a summary report for all markets
     * @param {string} outputDir - Directory to save the report
     */
    generateSummaryReport(outputDir) {
        // Sort results by profit/loss
        const sortedResults = [...this.results].sort(
            (a, b) => b.metrics.totalProfitLoss - a.metrics.totalProfitLoss,
        )

        // Create rows for each market
        const marketRows = sortedResults
            .map((result, index) => {
                const metrics = result.metrics

                return `
            <tr>
                <td>${index + 1}</td>
                <td>${result.market}</td>
                <td class="${metrics.totalProfitLoss >= 0 ? "positive" : "negative"}">
                    $${metrics.totalProfitLoss.toFixed(2)}
                </td>
                <td>${metrics.totalTrades}</td>
                <td>${(metrics.winRate * 100).toFixed(2)}%</td>
                <td>${metrics.profitFactor.toFixed(2)}</td>
                <td>${(metrics.maxDrawdown * 100).toFixed(2)}%</td>
                <td>${metrics.sharpeRatio.toFixed(2)}</td>
                <td>
                    <a href="market_${result.market.replace("-", "_")}.html">Details</a>
                </td>
            </tr>
            `
            })
            .join("")

        // Create HTML report
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Multi-Symbol Backtest Results</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #4CAF50; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                tr:hover { background-color: #ddd; }
                .positive { color: green; }
                .negative { color: red; }
                .metric-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 10px; flex: 1; min-width: 200px; }
                .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .metric-label { font-size: 14px; color: #666; }
                .metrics-container { display: flex; flex-wrap: wrap; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <h1>Multi-Symbol Backtest Results</h1>
            
            <div class="metrics-container">
                <div class="metric-box">
                    <div class="metric-label">Markets Tested</div>
                    <div class="metric-value">${this.combinedMetrics.marketsCovered}/${this.markets.length}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Total Net Profit</div>
                    <div class="metric-value" style="color: ${this.combinedMetrics.totalProfitLoss >= 0 ? "green" : "red"}">
                        $${this.combinedMetrics.totalProfitLoss.toFixed(2)}
                    </div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Total Trades</div>
                    <div class="metric-value">${this.combinedMetrics.totalTrades}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Win Rate</div>
                    <div class="metric-value">${(this.combinedMetrics.winRate * 100).toFixed(2)}%</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Max Drawdown</div>
                    <div class="metric-value">${(this.combinedMetrics.maxDrawdown * 100).toFixed(2)}%</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Sharpe Ratio</div>
                    <div class="metric-value">${this.combinedMetrics.sharpeRatio.toFixed(2)}</div>
                </div>
            </div>
            
            <h2>Markets Performance</h2>
            <table>
                <tr>
                    <th>#</th>
                    <th>Market</th>
                    <th>Net Profit</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                    <th>Profit Factor</th>
                    <th>Max Drawdown</th>
                    <th>Sharpe Ratio</th>
                    <th>Details</th>
                </tr>
                ${marketRows}
            </table>
            
            <p>
                <a href="combined_equity_curve.json" target="_blank">Download Combined Equity Curve</a> | 
                <a href="combined_metrics.json" target="_blank">Download Combined Metrics</a> | 
                <a href="all_results.json" target="_blank">Download All Results</a>
            </p>
        </body>
        </html>
        `

        // Write to file
        fs.writeFileSync(path.join(outputDir, "multi_symbol_report.html"), html)
    }

    /**
     * Generate a report for a specific market
     * @param {string} market - Market symbol
     * @param {Object} result - Market result
     * @param {string} outputDir - Directory to save the report
     */
    generateMarketReport(market, result, outputDir) {
        const metrics = result.metrics
        const trades = result.trades

        // Format trade rows
        const tradeRows = trades
            .map((trade, index) => {
                const entryDate = new Date(trade.entryTime).toLocaleString()
                const exitDate = trade.exitTime ? new Date(trade.exitTime).toLocaleString() : "Open"

                return `
            <tr>
                <td>${index + 1}</td>
                <td>${trade.direction}</td>
                <td>${entryDate}</td>
                <td>${exitDate}</td>
                <td>${trade.entryPrice.toFixed(2)}</td>
                <td>${trade.exitPrice ? trade.exitPrice.toFixed(2) : "-"}</td>
                <td class="${trade.pnl >= 0 ? "positive" : "negative"}">
                    $${trade.pnl.toFixed(2)}
                </td>
                <td>${trade.exitReason || "-"}</td>
            </tr>
            `
            })
            .join("")

        // Create HTML report
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${market} Backtest Results</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #4CAF50; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                tr:hover { background-color: #ddd; }
                .positive { color: green; }
                .negative { color: red; }
                .metric-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 10px; flex: 1; min-width: 200px; }
                .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .metric-label { font-size: 14px; color: #666; }
                .metrics-container { display: flex; flex-wrap: wrap; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <h1>${market} Backtest Results</h1>
            
            <div class="metrics-container">
                <div class="metric-box">
                    <div class="metric-label">Net Profit</div>
                    <div class="metric-value" style="color: ${metrics.totalProfitLoss >= 0 ? "green" : "red"}">
                        $${metrics.totalProfitLoss.toFixed(2)}
                    </div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Total Trades</div>
                    <div class="metric-value">${metrics.totalTrades}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Win Rate</div>
                    <div class="metric-value">${(metrics.winRate * 100).toFixed(2)}%</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Profit Factor</div>
                    <div class="metric-value">${metrics.profitFactor.toFixed(2)}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Max Drawdown</div>
                    <div class="metric-value">${(metrics.maxDrawdown * 100).toFixed(2)}%</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Sharpe Ratio</div>
                    <div class="metric-value">${metrics.sharpeRatio.toFixed(2)}</div>
                </div>
            </div>
            
            <h2>Additional Metrics</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Average Win</td>
                    <td>$${metrics.averageWin.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Average Loss</td>
                    <td>$${Math.abs(metrics.averageLoss).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Largest Win</td>
                    <td>$${metrics.largestWin.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Largest Loss</td>
                    <td>$${Math.abs(metrics.largestLoss).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Winning Trades</td>
                    <td>${metrics.winningTrades}</td>
                </tr>
                <tr>
                    <td>Losing Trades</td>
                    <td>${metrics.losingTrades}</td>
                </tr>
            </table>
            
            <h2>Trades</h2>
            <table>
                <tr>
                    <th>#</th>
                    <th>Direction</th>
                    <th>Entry Time</th>
                    <th>Exit Time</th>
                    <th>Entry Price</th>
                    <th>Exit Price</th>
                    <th>PnL</th>
                    <th>Exit Reason</th>
                </tr>
                ${tradeRows}
            </table>
            
            <p>
                <a href="multi_symbol_report.html">Back to Summary</a>
            </p>
        </body>
        </html>
        `

        // Write to file
        fs.writeFileSync(path.join(outputDir, `market_${market.replace("-", "_")}.html`), html)
    }
}

// Run if called directly
if (require.main === module) {
    // Parse command line arguments
    const argv = yargs(hideBin(process.argv))
        .option("markets", {
            alias: "m",
            description: "Comma-separated list of markets to test",
            type: "string",
            demandOption: true,
        })
        .option("timeframe", {
            alias: "t",
            description: "Timeframe to use (e.g., 15m, 1h, 4h)",
            type: "string",
            default: "15m",
        })
        .option("leverage", {
            alias: "l",
            description: "Leverage to use",
            type: "number",
            default: 5,
        })
        .option("positionSize", {
            alias: "p",
            description: "Position size as a fraction of capital (0.1 = 10%)",
            type: "number",
            default: 0.1,
        })
        .option("profitTarget", {
            description: "Profit target multiplier",
            type: "number",
            default: 1.5,
        })
        .option("initialCapital", {
            description: "Initial capital for each market test",
            type: "number",
            default: 10000,
        })
        .option("startDate", {
            description: "Start date for backtest (YYYY-MM-DD)",
            type: "string",
        })
        .option("endDate", {
            description: "End date for backtest (YYYY-MM-DD)",
            type: "string",
        })
        .help()
        .alias("help", "h").argv

    // Parse markets
    const markets = argv.markets.split(",").map((m) => m.trim())

    // Parse dates if provided
    let startDate = null
    let endDate = null

    if (argv.startDate) {
        startDate = new Date(argv.startDate)
    }

    if (argv.endDate) {
        endDate = new Date(argv.endDate)
    }

    // Create multi-symbol tester
    const tester = new MultiSymbolTester({
        markets,
        timeframe: argv.timeframe,
        leverage: argv.leverage,
        positionSize: argv.positionSize,
        profitTarget: argv.profitTarget,
        initialCapital: argv.initialCapital,
        startDate,
        endDate,
    })

    // Run backtests
    tester
        .runAllBacktests()
        .then(() => {
            console.log("Multi-symbol backtest completed successfully")
        })
        .catch((error) => {
            console.error("Multi-symbol backtest failed:", error)
            process.exit(1)
        })
}

module.exports = MultiSymbolTester

// ASHDLADXZCZC
// 2019-07-13T03:23:40 – GxHXbaZownzJB8e8QVXL
// 2019-07-29T03:57:40 – xEmolHBdkouZ0blhbnY6
// 2019-08-04T19:21:01 – jnxSZohVKiNfDXRGh53j
// 2019-09-10T23:46:28 – pPFSHs1R3w3xvubK1YPA
// 2019-09-21T04:52:42 – VNs6J894ksrsKqFvCb2U
// 2019-09-24T11:06:36 – CWnoFEFTh8ql9lLeE9vX
// 2019-10-06T01:44:19 – APH0gpOzYPJdRGO7xiET
// 2019-10-09T07:45:02 – LScUDkBYwIl4amUPDhXk
// 2019-10-20T07:07:50 – 5mJ41YWHBBbEi0ZKzkcl
// 2019-11-04T20:24:04 – oOJwjtxc8k7wxdvmk9EQ
// 2019-11-10T05:46:53 – qwOZ6YVWjiyVfmDyWal4
// 2019-11-21T13:52:20 – hA5GmZnNBbs8WLhkxiQP
// 2019-11-29T13:04:58 – ojP3RYKgVWawVhyHvpmk
// 2019-12-17T15:06:03 – FIb7ay1yuGy9neGcFwFT
// 2019-12-20T12:13:39 – FRTV7X2msMjFkfFPXZP8
// 2019-12-22T05:01:47 – QK0S8tTgHia0AJxHKsgg
// 2019-12-26T12:34:29 – 7POKDtJTBF4MgTNt3EHp
// 2020-01-02T00:38:26 – xrZKKo4smkVbg4fzHrLJ
// 2020-01-15T04:04:20 – KILUo9GUCCZgMYJbRsoQ
// 2020-02-02T16:28:51 – yxkuvBD4KT6pj7CV3VT2
// 2020-02-27T22:49:26 – TUDCVcP7CpXHe8VHv3QV
// 2020-03-01T04:08:55 – CiO5WRTqfHX07377fJ9c
// 2020-03-22T16:48:01 – HP6WNd3oQYdrMprmePsi
// 2020-04-03T05:34:41 – Voo61kKbLzqDssJiVvP9
// 2020-04-16T06:41:04 – kJ6okikguKBgVaujjwDy
// 2020-05-09T03:30:32 – kIL85sq6u9tkburqbhUV
// 2020-05-12T13:29:32 – 2RbUAAj0Iv9kOkZiQkUE
// 2020-05-18T16:45:25 – 62ERh5Braq7qXYZbap34
// 2020-06-07T21:47:18 – okQ6HursJ5Ep4W6Xfwa7
// 2020-07-08T15:39:38 – 6rUegeeZT8qp13y7d0yf
// 2020-07-12T05:42:59 – 3NBMAiLIhbyuYfkpEb0s
// 2020-07-22T03:24:05 – nnL51y5xDsTTQh3bSOC8
// 2020-08-05T12:51:56 – BQUbX84DGBUDjGKOncwZ
// 2020-08-30T09:47:37 – J9qNRyQolRXofFwBV0UW
// 2020-09-04T23:58:05 – nlBcPooHrpdw4Whc7OuM
// 2020-09-06T15:40:59 – peEgb3FjlIc9FqBoWM1n
// 2020-10-07T08:46:06 – JwYXHcPlX488z9gXk8ca
// 2020-10-13T01:49:37 – 5rSEv4eztvP1WVp92N7U
// 2020-10-26T13:59:42 – eW5ulfTyIznjzoREm5Vm
// 2020-10-31T02:36:15 – 4pcIqPwwvaz4JrJAyYpP
// 2020-11-01T05:24:07 – kZzXP4Q2NfiWxr3WOtW5
// 2020-11-18T14:31:43 – wEYEHQsNlOEcHSQgbfdm
// 2020-11-22T23:16:11 – 0kHTXMmnytjDKNl8Uu2S
// 2020-12-15T20:57:37 – YaJPfc14VoXA9iGgErzx
// 2021-01-12T09:24:29 – 2WRkvXHntwW4TG7oUoZA
// 2021-01-13T17:48:33 – EnxgwaYVzHbYv5gK2Odi
// 2021-01-16T07:52:26 – y0R8sKqGywSUelDVMYyP
// 2021-02-14T00:40:09 – XO0g0F43pC7pqCGo70gs
// 2021-03-06T14:34:05 – LgwSsbTB1VLLOryjokTz
// 2021-03-21T20:04:39 – Eimha153iaLt39z3Saj7
// 2021-03-29T06:23:07 – E81yXB5qNVOHoM3WmUoq
// 2021-04-04T10:33:44 – kfdVS5zfh5T22ZZ6jbHt
// 2021-04-13T07:38:18 – w8uB371WDB82ovoPIK0G
// 2021-04-16T16:58:08 – lQGy8HB19oau15h4Cul9
// 2021-05-14T12:04:41 – DiYA88ngpByUocDDZTmn
// 2021-05-28T20:22:28 – vjCfTYmySEiIQuadR1Ye
// 2021-06-04T06:08:34 – SFfj4WY1PNmndr7mK4bY
// 2021-06-04T17:28:40 – zTFqoBdvXKG9BVLPrLvj
// 2021-06-11T00:58:33 – m4Mm9hIYsSHOrUcLaPbt
// 2021-06-15T14:10:10 – RKwAlF4npVEU0UlpOvsm
// 2021-06-27T22:08:33 – F5gYzdR3ti7nQrIV0Vwj
// 2021-07-02T21:39:49 – Ep2yuaM2F9qLjv4JCoXc
// 2021-07-21T05:46:24 – IGwFS8jTNgr4myIunLxH
// 2021-07-23T23:42:00 – CitbN67VAm8LiBg0YeQF
// 2021-08-27T17:49:39 – LvPdgnAfqkz0CRfPq8ZJ
// 2021-08-29T04:53:23 – 6NpsgN2SbpGLIuF9pDpt
// 2021-09-10T23:22:36 – HnVPvA2TjNmisqH47rBi
// 2021-09-24T01:29:26 – nNpNv2xi5iOOS53uRayI
// 2021-10-14T21:51:45 – EmKyr3FYMeyZmuukcy6t
// 2021-11-11T09:04:32 – QeO1dAUmBVWo8u7ARJVb
// 2021-11-24T23:04:42 – KehfPWOXH9YMTSpaL8gI
// 2021-12-01T10:19:45 – 3SsVr8sc4JzmiPS8j9FA
// 2021-12-05T08:58:56 – 3NSHHK38nlefhhH0sxy1
// 2021-12-10T21:39:48 – ICH1LEmPBQn4EQaJUed3
// 2021-12-12T01:51:34 – 0MZjnB4TWfMJktByswD7
// 2021-12-18T07:38:38 – WXEKfDjTMxWzft5x9TwB
// 2021-12-21T21:20:24 – XbDxJ4WrZM148Ey5k6fq
// 2022-01-07T12:56:54 – bD5mD1T1DDCLUsOUygfy
// 2022-01-26T08:10:27 – ZIKz8o9GkTWwsxjVcFyk
// 2022-02-23T02:23:09 – VE5s8JMLbbOthH96TTyA
// 2022-02-25T07:36:24 – mVe7LawPgd4p0RvWaQdZ
// 2022-03-13T11:45:53 – 9zWhcR26LlOPpBJ6uMUg
// 2022-03-14T05:17:42 – 5zhX1ICpzHII2mHtP9vz
// 2022-05-26T20:15:27 – hJ7wD9xQOxB4aqveRnbR
// 2022-06-05T18:04:33 – TvRVMVCFwJJm1L3A5we3
// 2022-06-05T23:27:32 – 37qDFpQh2RN92KIiQ6ix
// 2022-06-22T19:23:02 – Vsf3NHOy8AxONQbFjZvR
// 2022-07-29T01:31:11 – WpvE3oybVEVHuiUF4tod
// 2022-07-29T16:15:56 – OqPrgnIV6zzU6hd2aVEU
// 2022-08-13T10:04:47 – CuuhizJ3vBW0yaTgB2sj
// 2022-08-15T23:21:24 – KgdX7uIf7EGyTrihAH6o
// 2022-08-27T18:24:22 – piFbKK8Oqz294VTs1kSi
// 2022-08-30T04:10:04 – 8Boag8exVzRXXnPeK4gx
// 2022-09-10T16:34:50 – jsxpMKTbMe0KeCT48wpn
// 2022-10-05T21:21:25 – zbv8OcbSfWq9wB6b5TI3
// 2022-10-10T16:03:47 – kRAnsPLFkLq8dyQ69HXn
// 2022-10-11T22:15:22 – m2PDngtLHGZea5PtIXvI
// 2022-10-12T16:57:06 – SKAJ6LFSmi9y2SHugBQB
// 2022-10-28T07:54:05 – 6Vdtg6F4CGSJEAXeH2mv
// 2022-10-28T20:37:59 – s4zKzzdknjKIkEcR4x72
// 2022-11-18T21:17:26 – 3joYWhuautuIp1MhyK1p
// 2022-12-07T01:26:57 – MAhWlkwprLBx0yEK1i0m
// 2022-12-10T05:05:03 – IqWq72nOFHxM9toOsU4p
// 2022-12-17T19:18:11 – N3LeqHjTizTEQpvn1But
// 2022-12-23T19:47:36 – VxwUvvfnFOB0qTuojaLE
// 2023-01-10T23:46:18 – 1uW20ZaHCrdrWqBQOeN1
// 2023-02-03T12:25:51 – 0FDA3rZPIzz8PsbEj90J
// 2023-03-03T23:56:27 – tzB0trGobHOeomEsmwRu
// 2023-03-15T03:28:17 – snEpvxmrb8nLOkWRAaMl
// 2023-03-21T18:40:43 – zJ20XChizmiQ1InpleKC
// 2023-04-03T06:40:14 – pdMwNrtwESPus6CILS9s
// 2023-04-06T17:33:37 – IZE2TWmP0LL5DBuKjDQz
// 2023-04-18T05:48:44 – XgxhgpxeCWLGuAMiIR56
// 2023-04-27T12:35:08 – ThMEzJGmYaMFNSaL5tGy
// 2023-05-01T16:02:11 – Erb0u763KYRFWUiCK4oE
// 2023-05-04T10:29:52 – LQYWxB3hGzVadGbYsPQF
// 2023-06-13T21:31:32 – 6OUCzPFYFVVvKFKJL93n
// 2023-07-14T08:19:24 – jsEb9M0yWEzfZrLM0wuw
// 2023-08-11T08:06:54 – n7jsHwU6rMxHm5oYfeHN
// 2023-09-16T14:15:07 – TdaB1mQp4P5P2UkY6M7x
