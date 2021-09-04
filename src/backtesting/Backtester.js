const fs = require("fs")
const path = require("path")
const config = require("config")
const BBRSIStrategy = require("../strategy/BBRSIStrategy")
const winston = require("winston")

class Backtester {
    constructor() {
        this.logger = winston.createLogger({
            level: "info",
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            transports: [
                new winston.transports.Console({ level: "info" }),
                new winston.transports.File({
                    filename: "backtest_results.log",
                    level: "debug",
                }),
            ],
        })

        // Trading configuration from config file
        const tradingConfig = config.get("trading")
        this.symbol = tradingConfig.market // BTC-PERP
        this.leverage = tradingConfig.leverage // 20
        this.positionSize = tradingConfig.positionSize // 0.001
        this.timeframe = tradingConfig.timeframe // 15m
        this.profitTarget = tradingConfig.profitTarget // 1.5
        this.leverageMode = tradingConfig.leverageMode // isolated
        this.initialCapital = 1000 // Starting with $1000

        // Trading state
        this.equity = this.initialCapital
        this.position = null
        this.trades = []
        this.equity_curve = []
        this.takeProfitPrice = null

        // Performance metrics
        this.metrics = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalProfitLoss: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            longTrades: 0,
            shortTrades: 0,
            marginCalls: 0,
        }

        // Trading fees (0.1% per trade)
        this.tradingFee = 0.001

        // Replace direct strategy instantiation with createStrategy method call
        this.strategy = this.createStrategy()

        this.logger.info("Backtester initialized with parameters:", {
            symbol: this.symbol,
            leverage: this.leverage,
            positionSize: this.positionSize,
            timeframe: this.timeframe,
            profitTarget: this.profitTarget,
            leverageMode: this.leverageMode,
            initialCapital: this.initialCapital,
        })
    }

    // Add createStrategy method that can be overridden
    createStrategy() {
        return new BBRSIStrategy(this.logger)
    }

    async loadData() {
        const filePath = path.join(
            __dirname,
            "data",
            this.symbol,
            `${this.symbol}-${this.timeframe}.json`,
        )
        this.logger.info(`Loading data from ${filePath}`)

        try {
            const rawData = fs.readFileSync(filePath)
            this.data = JSON.parse(rawData)
            this.logger.info(`Loaded ${this.data.length} candles for ${this.symbol}`)
        } catch (error) {
            this.logger.error(`Failed to load data: ${error.message}`)
            throw error
        }
    }

    calculatePnL(entryPrice, exitPrice, isLong, size) {
        const direction = isLong ? 1 : -1
        const percentageChange = ((exitPrice - entryPrice) / entryPrice) * direction
        const grossPnL = this.equity * size * percentageChange * this.leverage
        const fees = this.equity * size * this.tradingFee * 2 // Entry and exit fees
        return grossPnL - fees
    }

    isLiquidated(currentPrice) {
        if (!this.position) return false

        // Using a more realistic approach to liquidation calculation
        // based on the percent change needed to liquidate at given leverage

        const entryPrice = this.position.entryPrice
        const isLong = this.position.type === "LONG"

        // Maintenance margin ratio for crypto typically 0.5%-1%
        const maintenanceMarginRatio = 0.005

        // Calculate liquidation price
        // For longs: liqPrice = entry * (1 - (1 / leverage) + maintenanceMarginRatio)
        // For shorts: liqPrice = entry * (1 + (1 / leverage) - maintenanceMarginRatio)

        let liquidationPrice
        if (isLong) {
            liquidationPrice = entryPrice * (1 - 1 / this.leverage + maintenanceMarginRatio)
            return currentPrice <= liquidationPrice
        } else {
            liquidationPrice = entryPrice * (1 + 1 / this.leverage - maintenanceMarginRatio)
            return currentPrice >= liquidationPrice
        }
    }

    checkTakeProfit(currentPrice) {
        if (!this.position || !this.takeProfitPrice) return false

        if (this.position.type === "LONG") {
            return currentPrice >= this.takeProfitPrice
        } else {
            return currentPrice <= this.takeProfitPrice
        }
    }

    async runBacktest() {
        await this.loadData()
        // Ensure enough lookback for indicators (especially Bollinger Bands which need 20 periods)
        let lookback = Math.max(50, config.get("indicators.bollinger.period") + 10)

        this.logger.info(`Starting backtest on ${this.symbol} with ${this.data.length} candles`)
        this.logger.info(`Using leverage: ${this.leverage}x, position size: ${this.positionSize}`)

        for (let i = lookback; i < this.data.length; i++) {
            const currentCandle = this.data[i]
            const currentPrice = parseFloat(currentCandle.c)

            // Check for take profit first
            if (this.position && this.checkTakeProfit(currentPrice)) {
                // Execute take profit
                const pnl = this.calculatePnL(
                    this.position.entryPrice,
                    this.takeProfitPrice, // Use take profit price, not current price
                    this.position.type === "LONG",
                    this.position.size,
                )

                this.equity += pnl
                this.metrics.totalProfitLoss += pnl
                this.metrics.totalTrades++

                if (pnl > 0) this.metrics.winningTrades++
                else this.metrics.losingTrades++

                this.trades.push({
                    type: this.position.type,
                    entry: this.position.entryPrice,
                    exit: this.takeProfitPrice,
                    pnl: pnl,
                    entryTime: this.position.entryTime,
                    exitTime: currentCandle.t,
                    exitReason: "TAKE_PROFIT",
                })

                this.logger.info(`Take profit executed for ${this.position.type}`, {
                    entry: this.position.entryPrice,
                    exit: this.takeProfitPrice,
                    pnl: pnl,
                })

                this.position = null
                this.takeProfitPrice = null
            }

            // Check for liquidation
            if (this.position && this.isLiquidated(currentPrice)) {
                // In a real liquidation, you lose your entire margin amount
                const marginAmount = (this.position.size * this.equity) / this.leverage
                const pnl = -1 * marginAmount // Complete loss of margin

                this.equity += pnl

                this.metrics.marginCalls++
                this.metrics.totalTrades++
                this.metrics.losingTrades++
                this.metrics.totalProfitLoss += pnl

                this.trades.push({
                    type: this.position.type,
                    entry: this.position.entryPrice,
                    exit: currentPrice,
                    pnl: pnl,
                    entryTime: this.position.entryTime,
                    exitTime: currentCandle.t,
                    exitReason: "LIQUIDATION",
                })

                this.logger.info("Position Liquidated", {
                    price: currentPrice,
                    entry: this.position.entryPrice,
                    type: this.position.type,
                    equity: this.equity,
                })

                this.position = null
                this.takeProfitPrice = null

                // Don't break from the loop, allow backtesting to continue with remaining equity
            }

            // Get strategy signal
            const lookbackData = this.data.slice(i - lookback, i + 1)
            const signalResult = await this.strategy.evaluatePosition(lookbackData)

            // Log indicator details for debugging - only if there's a signal
            if (signalResult.signal !== "NONE") {
                this.logger.debug("Signal generated:", {
                    time: new Date(currentCandle.t).toISOString(),
                    price: currentPrice,
                    signal: signalResult.signal,
                    rsi: signalResult.indicators.rsi,
                    adx: signalResult.indicators.adx,
                    bb: signalResult.indicators.bb,
                })
            }

            // Handle position entry/exit
            if (signalResult.signal === "LONG" && !this.position) {
                this.position = {
                    type: "LONG",
                    entryPrice: currentPrice,
                    size: this.positionSize,
                    entryTime: currentCandle.t,
                }
                this.takeProfitPrice = signalResult.takeProfit
                this.metrics.longTrades++
                this.logger.info("Entered Long Position", {
                    price: currentPrice,
                    takeProfitPrice: this.takeProfitPrice,
                    equity: this.equity,
                })
            } else if (signalResult.signal === "SHORT" && !this.position) {
                this.position = {
                    type: "SHORT",
                    entryPrice: currentPrice,
                    size: this.positionSize,
                    entryTime: currentCandle.t,
                }
                this.takeProfitPrice = signalResult.takeProfit
                this.metrics.shortTrades++
                this.logger.info("Entered Short Position", {
                    price: currentPrice,
                    takeProfitPrice: this.takeProfitPrice,
                    equity: this.equity,
                })
            } else if (
                (signalResult.signal === "CLOSE_LONG" && this.position?.type === "LONG") ||
                (signalResult.signal === "CLOSE_SHORT" && this.position?.type === "SHORT")
            ) {
                if (this.position) {
                    const pnl = this.calculatePnL(
                        this.position.entryPrice,
                        currentPrice,
                        this.position.type === "LONG",
                        this.position.size,
                    )

                    this.equity += pnl
                    this.metrics.totalProfitLoss += pnl
                    this.metrics.totalTrades++

                    if (pnl > 0) this.metrics.winningTrades++
                    else this.metrics.losingTrades++

                    this.trades.push({
                        type: this.position.type,
                        entry: this.position.entryPrice,
                        exit: currentPrice,
                        pnl: pnl,
                        entryTime: this.position.entryTime,
                        exitTime: currentCandle.t,
                        exitReason: "SIGNAL",
                    })

                    this.logger.info(`Closed ${this.position.type} position on signal`, {
                        entry: this.position.entryPrice,
                        exit: currentPrice,
                        pnl: pnl,
                    })

                    this.position = null
                    this.takeProfitPrice = null
                }
            }

            // Record equity curve
            this.equity_curve.push({
                time: currentCandle.t,
                equity: this.equity,
                hasPosition: this.position !== null,
                positionType: this.position?.type || null,
                price: currentPrice,
            })
        }

        this.calculateMetrics()
        this.generateReport()
    }

    calculateMetrics() {
        // Calculate Sharpe Ratio
        if (this.trades.length > 0) {
            const returns = this.trades.map((t) => t.pnl / this.initialCapital)
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
            const stdDev = Math.sqrt(
                returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length,
            )
            // Prevent division by zero
            this.metrics.sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0 // Annualized
        }

        // Calculate Max Drawdown
        let peak = this.initialCapital
        let maxDrawdown = 0

        this.equity_curve.forEach((point) => {
            if (point.equity > peak) peak = point.equity
            const drawdown = (peak - point.equity) / peak
            if (drawdown > maxDrawdown) maxDrawdown = drawdown
        })

        this.metrics.maxDrawdown = maxDrawdown
    }

    generateReport() {
        // Prevent division by zero
        const winRate =
            this.metrics.totalTrades > 0
                ? (this.metrics.winningTrades / this.metrics.totalTrades) * 100
                : 0

        const profitFactor =
            this.metrics.losingTrades > 0
                ? this.metrics.winningTrades / this.metrics.losingTrades
                : 0

        const report = {
            "--- TRADE ANALYSIS ---": {
                "Net Profit": `$${this.metrics.totalProfitLoss.toFixed(2)}`,
                "Max Drawdown": `${(this.metrics.maxDrawdown * 100).toFixed(2)}%`,
                "Total Trades": this.metrics.totalTrades,
                "Win Rate": `${winRate.toFixed(2)}%`,
                "Profit Factor": profitFactor.toFixed(2),
                "Final Equity": `$${this.equity.toFixed(2)}`,
            },
            "--- RISK/PERFORMANCE RATIOS ---": {
                "Long/Short Ratio": `${this.metrics.longTrades}/${this.metrics.shortTrades}`,
                "Sharpe Ratio": this.metrics.sharpeRatio.toFixed(2),
                "Margin Calls": this.metrics.marginCalls,
            },
        }

        // Log to console and file
        this.logger.info("Backtest Results:", report)

        // Save detailed trade history
        fs.writeFileSync("backtest_trades.json", JSON.stringify(this.trades, null, 2))

        // Save equity curve
        fs.writeFileSync("equity_curve.json", JSON.stringify(this.equity_curve, null, 2))

        // Create more detailed trade statistics
        const tradeStats = this.analyzeTradeStatistics()
        fs.writeFileSync("trade_statistics.json", JSON.stringify(tradeStats, null, 2))

        this.logger.info("Trade Statistics:", tradeStats)
    }

    analyzeTradeStatistics() {
        const stats = {
            totalTrades: this.metrics.totalTrades,
            profitableTrades: this.metrics.winningTrades,
            losingTrades: this.metrics.losingTrades,
            winRate:
                this.metrics.totalTrades > 0
                    ? this.metrics.winningTrades / this.metrics.totalTrades
                    : 0,
            averageProfitPerTrade: 0,
            averageWin: 0,
            averageLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            profitByExitReason: {
                SIGNAL: 0,
                TAKE_PROFIT: 0,
                LIQUIDATION: 0,
            },
            tradesByExitReason: {
                SIGNAL: 0,
                TAKE_PROFIT: 0,
                LIQUIDATION: 0,
            },
        }

        if (this.trades.length === 0) return stats

        // Calculate average profit/loss and other metrics
        let totalProfit = 0
        let totalWinProfit = 0
        let totalLossProfit = 0
        let winCount = 0
        let lossCount = 0

        this.trades.forEach((trade) => {
            totalProfit += trade.pnl

            // Count by exit reason
            if (trade.exitReason) {
                stats.tradesByExitReason[trade.exitReason] =
                    (stats.tradesByExitReason[trade.exitReason] || 0) + 1
                stats.profitByExitReason[trade.exitReason] =
                    (stats.profitByExitReason[trade.exitReason] || 0) + trade.pnl
            }

            if (trade.pnl > 0) {
                winCount++
                totalWinProfit += trade.pnl
                if (trade.pnl > stats.largestWin) stats.largestWin = trade.pnl
            } else {
                lossCount++
                totalLossProfit += trade.pnl
                if (trade.pnl < stats.largestLoss) stats.largestLoss = trade.pnl
            }
        })

        stats.averageProfitPerTrade = totalProfit / this.trades.length
        stats.averageWin = winCount > 0 ? totalWinProfit / winCount : 0
        stats.averageLoss = lossCount > 0 ? totalLossProfit / lossCount : 0

        return stats
    }
}

module.exports = Backtester

// ASHDLADXZCZC
// 2019-07-16T19:22:41 – EcVw8hDGDxZFe5wl7IHN
// 2019-08-03T10:12:55 – Ya55ceOafZOSE9SsGrQs
// 2019-08-24T15:14:21 – AxwYKWeN4hMHdcq58EHO
// 2019-08-26T17:20:54 – qfU6bvlcNMmVg8GDPGDS
// 2019-08-30T06:59:11 – tkai8Kdq1uI6lL43V4Uv
// 2019-08-30T18:15:30 – 6oXeLIG9fDH1hHsZ5mDl
// 2019-09-08T20:01:29 – Zz8edzMshbhRR6LuxSh3
// 2019-09-23T06:03:16 – 6EsIY911sQmevC2kYlUI
// 2019-09-26T00:14:15 – 1YSW950FELD3T1euXrvc
// 2019-10-03T15:29:45 – sCjTVQbI4ivRntHnQz53
// 2019-10-10T00:16:13 – xTHFuxdVqtJOwWyZmSbp
// 2019-10-11T00:16:27 – 8pLigM1VL2RpfKmlNw5x
// 2019-11-16T23:01:20 – H5lSzM4fA270N1Nel9NU
// 2019-11-17T08:01:21 – HNKNcTqbBJAdyVE9S1y2
// 2019-12-05T21:57:18 – MR4CRiIDEleBdNdYgUKq
// 2019-12-16T04:46:52 – 1NtNLd6aFyStGfISa6Zn
// 2019-12-25T04:35:02 – dDi2D8xsFe2AzYm6fRjk
// 2019-12-28T08:06:47 – jAIQX5eluc4dkb2ZwrJp
// 2019-12-28T12:03:04 – ujczV4aKRkULEYHNpk3a
// 2020-01-18T05:10:08 – mA2ivGp7lQ3wFrz1LmwA
// 2020-01-19T05:45:41 – jrZxxwHFzP9FhYG5AXmp
// 2020-02-13T06:07:50 – 65gigczKHwpcsVcK5Sc0
// 2020-02-16T11:46:35 – xbnO5klgFwEq30J6zXgD
// 2020-02-16T23:12:15 – fLrl5JdtQJ4yUcRHJ6vm
// 2020-03-05T06:37:02 – XAEqX8mhrSzk9a8N0R1v
// 2020-03-13T15:33:54 – 159MEoDhkHw3d01sOhte
// 2020-04-09T03:20:44 – v8se4c2kUETMT1eFQDfU
// 2020-05-24T19:16:44 – rTboUDe2UupTfRpWL8hB
// 2020-06-05T23:53:30 – ZSHHpumvHytusbxsYVcz
// 2020-06-15T03:15:58 – uMDhzazZ9g5BTxTcvHfi
// 2020-06-15T20:11:49 – 3taJJuE7SI4hccAKsjOI
// 2020-07-03T17:45:17 – z3GVGReZPA36PM6trrQY
// 2020-07-06T00:01:52 – qgUD6CSwEKuwW1j6f6BX
// 2020-07-09T15:44:35 – Qt44moap3FwnoCTBzvYU
// 2020-07-13T12:50:36 – tFI1omKrFlvHlNR59qBh
// 2020-07-24T09:58:12 – 7bp9pWhT1arStvaIWlBA
// 2020-07-25T12:16:30 – CJ5aKR7k5N7Gh07t1GPY
// 2020-07-26T03:38:12 – eiD1XVell0UIMWyepDUE
// 2020-07-28T21:30:41 – jCn2Bq1NerjMY833NkaS
// 2020-08-06T10:49:00 – loXRgcoL2pmFyfD2hSf6
// 2020-08-23T19:17:31 – pSaNRdFqEPYt9JvD0nn8
// 2020-09-04T05:38:19 – vkxAiV97twMxgxHseAht
// 2020-09-05T19:16:10 – W4GRtY2fVbLRfPLLEjnK
// 2020-10-06T12:01:49 – ebJGjBs7dZY0ATQzkJDS
// 2020-10-20T00:13:17 – 4ViiH26hGGIrWBTxgNue
// 2020-11-02T12:41:39 – mvVud38UIuHLb5rmfKku
// 2020-11-19T22:32:20 – VWYRFJIfjmRDX4v8sxuQ
// 2020-12-05T13:17:50 – 3Q6CTF8PwForjNUnT59Z
// 2020-12-09T20:57:39 – CX2BcaSNYaPfUvEpQ2Ra
// 2020-12-25T06:09:48 – 6mlJSVntAhBVb3YaT9wg
// 2021-01-13T01:27:29 – tNJxOkV1gaovgJACS2x6
// 2021-01-13T19:44:30 – ddEnB7KunAlp8r2aJKhm
// 2021-01-16T17:00:01 – U9URDVDaoanSCpazl2W6
// 2021-01-31T14:14:35 – a6qQ4UOkCxUdvLaIpAxt
// 2021-02-18T18:06:48 – laVsi5ob0U7dwqFq7QPE
// 2021-03-13T10:37:11 – fqG5R46h8IyGEwAyQdzf
// 2021-03-13T14:07:36 – NDwpgKaKuNx8LB4jg4wM
// 2021-04-05T01:17:18 – 0CJaBEBGdme82UuTy5xc
// 2021-04-05T04:14:27 – b42hlmO9BY0WmuqtGYCq
// 2021-05-17T18:34:17 – uYICRG3EkJlzJlnz8pBU
// 2021-05-22T12:47:50 – ua2jSN7qTUh5cHht7IkF
// 2021-05-27T23:51:15 – UBjac1IbuHLdMfmGgWC1
// 2021-06-01T12:12:39 – WRAWgnaVoc99YJ9UqnQu
// 2021-06-03T00:46:50 – 4sd9O11sgEkzYskWHZfg
// 2021-06-09T19:50:06 – ZRL6sPOLkZnfsax7H9kv
// 2021-06-24T21:33:11 – ZKxcD9EvJL9RFHhNZuW8
// 2021-07-14T03:54:09 – mBtpvGHMaXJrUR7McWay
// 2021-07-28T23:11:40 – EEgy4a2Dsnv0424WQTVZ
// 2021-07-29T05:06:43 – fLtSKFo68G01Rx6PeUyQ
// 2021-08-10T22:53:39 – yS6cd6q55QK0usmi5NXG
// 2021-08-11T13:07:53 – ShEZF3R9jq0UkFMercUG
// 2021-09-03T03:54:52 – ZgrSm2Iomqe5cWX0v3h1
// 2021-09-04T16:29:45 – 13mS1K47wDeaEoQMtC4O
