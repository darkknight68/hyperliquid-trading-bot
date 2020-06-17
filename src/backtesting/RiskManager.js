/**
 * Risk Manager for the backtesting system
 * Handles position sizing, stop loss, and risk management rules
 */
class RiskManager {
    constructor(options = {}) {
        // Base options
        this.initialCapital = options.initialCapital || 10000
        this.currentEquity = this.initialCapital
        this.maxRiskPerTrade = options.maxRiskPerTrade || 0.02 // 2% risk per trade by default
        this.maxPositionSize = options.maxPositionSize || 0.5 // Max 50% of equity in one position
        this.maxOpenPositions = options.maxOpenPositions || 1 // Max number of positions
        this.maxDrawdown = options.maxDrawdown || 0.25 // 25% max drawdown allowed
        this.tradingFee = options.tradingFee || 0.001 // 0.1% trading fee

        // Advanced options
        this.useVolatilityAdjustment = options.useVolatilityAdjustment || false
        this.pyramiding = options.pyramiding || false
        this.pyramidingLevels = options.pyramidingLevels || 3
        this.useAntiMartingale = options.useAntiMartingale || false
        this.winMultiplier = options.winMultiplier || 1.5
        this.lossMultiplier = options.lossMultiplier || 0.7
        this.useKellyCriterion = options.useKellyCriterion || false
        this.kellyFraction = options.kellyFraction || 0.5 // Half-Kelly

        // State variables
        this.openPositions = []
        this.lastTrades = []
        this.consecutiveWins = 0
        this.consecutiveLosses = 0
        this.highWaterMark = this.initialCapital
        this.currentDrawdown = 0
        this.volatilityWindow = options.volatilityWindow || 20
        this.priceVolatility = 0
        this.winRate = 0.5 // Initial estimate for Kelly
        this.winLossRatio = 1.0 // Initial estimate for Kelly

        // History
        this.positionSizeHistory = []
        this.riskPerTradeHistory = []
        this.equityHistory = [
            {
                timestamp: new Date().getTime(),
                equity: this.initialCapital,
                drawdown: 0,
            },
        ]
    }

    /**
     * Update the risk manager with current equity
     * @param {number} equity - Current equity
     */
    updateEquity(equity) {
        const previousEquity = this.currentEquity
        this.currentEquity = equity

        // Update high water mark if we have a new peak
        if (equity > this.highWaterMark) {
            this.highWaterMark = equity
        }

        // Calculate current drawdown
        this.currentDrawdown = (this.highWaterMark - equity) / this.highWaterMark

        // Record equity history
        this.equityHistory.push({
            timestamp: new Date().getTime(),
            equity: this.currentEquity,
            drawdown: this.currentDrawdown,
        })

        return this.currentEquity
    }

    /**
     * Update the risk manager with market data
     * @param {Array} priceData - Historical price data for volatility calculation
     */
    updateMarketData(priceData) {
        if (this.useVolatilityAdjustment && priceData && priceData.length > this.volatilityWindow) {
            // Calculate price volatility based on recent data
            const recentPrices = priceData.slice(-this.volatilityWindow)

            // Calculate daily returns
            const returns = []
            for (let i = 1; i < recentPrices.length; i++) {
                returns.push(
                    (recentPrices[i].close - recentPrices[i - 1].close) / recentPrices[i - 1].close,
                )
            }

            // Calculate standard deviation of returns
            const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length
            const variance =
                returns.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) / returns.length
            this.priceVolatility = Math.sqrt(variance)
        }
    }

    /**
     * Record a trade result to update risk management parameters
     * @param {Object} trade - Trade object
     */
    recordTrade(trade) {
        // Add to trade history (keep last 50 trades)
        this.lastTrades.unshift(trade)
        if (this.lastTrades.length > 50) {
            this.lastTrades.pop()
        }

        // Update consecutive wins/losses
        if (trade.pnl > 0) {
            this.consecutiveWins++
            this.consecutiveLosses = 0
        } else if (trade.pnl < 0) {
            this.consecutiveLosses++
            this.consecutiveWins = 0
        }

        // Update win rate and win/loss ratio for Kelly criterion
        const totalTrades = this.lastTrades.length
        const winningTrades = this.lastTrades.filter((t) => t.pnl > 0).length

        if (totalTrades > 0) {
            this.winRate = winningTrades / totalTrades

            // Calculate average win and loss
            const wins = this.lastTrades.filter((t) => t.pnl > 0)
            const losses = this.lastTrades.filter((t) => t.pnl < 0)

            const avgWin =
                wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0

            const avgLoss =
                losses.length > 0
                    ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length)
                    : 0

            this.winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 1.0
        }

        // Remove this trade from open positions if it exists
        this.openPositions = this.openPositions.filter(
            (p) => p.entryTime !== trade.entryTime || p.entryPrice !== trade.entryPrice,
        )
    }

    /**
     * Calculate the position size for a new trade
     * @param {Object} trade - Trade object with entryPrice and direction
     * @param {number} leverage - Current leverage
     * @returns {Object} Position sizing information
     */
    calculatePositionSize(trade, leverage = 1) {
        // Check if we've reached maximum drawdown
        if (this.currentDrawdown >= this.maxDrawdown) {
            return {
                size: 0,
                capital: 0,
                riskAmount: 0,
                reason: "Max drawdown reached",
            }
        }

        // Check if we've reached maximum open positions
        if (this.openPositions.length >= this.maxOpenPositions && !this.pyramiding) {
            return {
                size: 0,
                capital: 0,
                riskAmount: 0,
                reason: "Max open positions reached",
            }
        }

        // Calculate available capital for this trade
        let availableCapital = this.currentEquity

        // Reduce available capital if we have open positions
        if (this.openPositions.length > 0 && !this.pyramiding) {
            const usedCapital = this.openPositions.reduce((sum, pos) => sum + pos.capital, 0)
            availableCapital -= usedCapital
        }

        // Base risk percentage
        let riskPercentage = this.maxRiskPerTrade

        // Adjust risk based on volatility if enabled
        if (this.useVolatilityAdjustment && this.priceVolatility > 0) {
            // Lower risk percentage as volatility increases
            const normalizedVolatility = Math.min(this.priceVolatility / 0.02, 2) // Cap at 2x adjustment
            riskPercentage = riskPercentage / normalizedVolatility
        }

        // Adjust risk based on consecutive wins/losses if using Anti-Martingale
        if (this.useAntiMartingale) {
            if (this.consecutiveWins > 0) {
                // Increase position size after wins
                riskPercentage =
                    riskPercentage * Math.pow(this.winMultiplier, Math.min(this.consecutiveWins, 3))
            } else if (this.consecutiveLosses > 0) {
                // Decrease position size after losses
                riskPercentage =
                    riskPercentage *
                    Math.pow(this.lossMultiplier, Math.min(this.consecutiveLosses, 3))
            }
        }

        // Apply Kelly Criterion if enabled
        if (this.useKellyCriterion && this.lastTrades.length >= 10) {
            // Kelly formula: f* = (p*b - q) / b
            // where p = probability of win, q = probability of loss (1-p), b = win/loss ratio
            const kellyPercentage =
                (this.winRate * this.winLossRatio - (1 - this.winRate)) / this.winLossRatio

            // Apply Kelly fraction and cap it
            const adjustedKelly = Math.max(0, kellyPercentage * this.kellyFraction)

            // Use the lower of Kelly or max risk
            riskPercentage = Math.min(riskPercentage, adjustedKelly)
        }

        // Cap risk percentage at max position size
        riskPercentage = Math.min(riskPercentage, this.maxPositionSize)

        // Calculate risk amount
        const riskAmount = availableCapital * riskPercentage

        // Position size is the risk amount multiplied by leverage
        const positionCapital = riskAmount
        const positionSize = positionCapital * leverage

        // Check for pyramiding
        if (this.pyramiding) {
            // Count how many positions we have in the same direction
            const positionsInDirection = this.openPositions.filter(
                (p) => p.direction === trade.direction,
            ).length

            // If we've reached maximum pyramiding levels, return zero size
            if (positionsInDirection >= this.pyramidingLevels) {
                return {
                    size: 0,
                    capital: 0,
                    riskAmount: 0,
                    reason: "Max pyramiding levels reached",
                }
            }

            // Reduce size for each level of pyramiding
            const pyramidingLevel = positionsInDirection + 1
            const pyramidingFactor = 1 / pyramidingLevel

            // Adjust position size based on pyramiding level
            const adjustedSize = positionSize * pyramidingFactor
            const adjustedCapital = positionCapital * pyramidingFactor

            // Record this position
            this.openPositions.push({
                entryTime: trade.entryTime,
                entryPrice: trade.entryPrice,
                direction: trade.direction,
                size: adjustedSize,
                capital: adjustedCapital,
                level: pyramidingLevel,
            })

            // Record position sizing history
            this.positionSizeHistory.push({
                timestamp: new Date().getTime(),
                equity: this.currentEquity,
                size: adjustedSize,
                capital: adjustedCapital,
                riskPercentage: riskPercentage * pyramidingFactor,
                reason: `Pyramiding level ${pyramidingLevel}`,
            })

            return {
                size: adjustedSize,
                capital: adjustedCapital,
                riskAmount: adjustedCapital * riskPercentage,
                riskPercentage: riskPercentage * pyramidingFactor,
                reason: `Pyramiding level ${pyramidingLevel}`,
            }
        } else {
            // No pyramiding, just use calculated size

            // Record this position
            this.openPositions.push({
                entryTime: trade.entryTime,
                entryPrice: trade.entryPrice,
                direction: trade.direction,
                size: positionSize,
                capital: positionCapital,
                level: 1,
            })

            // Record position sizing history
            this.positionSizeHistory.push({
                timestamp: new Date().getTime(),
                equity: this.currentEquity,
                size: positionSize,
                capital: positionCapital,
                riskPercentage: riskPercentage,
                reason: "Standard position",
            })

            return {
                size: positionSize,
                capital: positionCapital,
                riskAmount: riskAmount,
                riskPercentage: riskPercentage,
                reason: "Standard position",
            }
        }
    }

    /**
     * Calculate an appropriate stop loss price based on risk parameters
     * @param {Object} trade - Trade object with entryPrice and direction
     * @param {Object} positionInfo - Position sizing information
     * @param {number} atr - Average True Range value (optional)
     * @returns {number} Stop loss price
     */
    calculateStopLoss(trade, positionInfo, atr = null) {
        // Default stop is based on maximum risk
        const maxLossPercentage = this.maxRiskPerTrade
        let stopDistance

        if (atr !== null) {
            // Use ATR for stop loss distance if provided
            stopDistance = atr * 2 // 2 ATR units by default
        } else {
            // Without ATR, use a percentage of entry price
            stopDistance = trade.entryPrice * 0.025 // 2.5% by default
        }

        // Calculate stop price based on direction
        const stopPrice =
            trade.direction === "long"
                ? trade.entryPrice - stopDistance
                : trade.entryPrice + stopDistance

        return stopPrice
    }

    /**
     * Get risk statistics summary
     * @returns {Object} Risk statistics
     */
    getRiskStats() {
        return {
            currentEquity: this.currentEquity,
            initialCapital: this.initialCapital,
            highWaterMark: this.highWaterMark,
            currentDrawdown: this.currentDrawdown,
            maxRiskPerTrade: this.maxRiskPerTrade,
            openPositions: this.openPositions.length,
            consecutiveWins: this.consecutiveWins,
            consecutiveLosses: this.consecutiveLosses,
            winRate: this.winRate,
            winLossRatio: this.winLossRatio,
            priceVolatility: this.priceVolatility,
        }
    }

    /**
     * Get a recommended trade adjustment based on risk rules
     * @param {string} tradeType - Type of adjustment ('size', 'skip', 'closeAll')
     * @returns {Object} Recommendation
     */
    getTradeRecommendation(tradeType = "size") {
        // Check for severe drawdown - should stop trading
        if (this.currentDrawdown >= this.maxDrawdown) {
            return {
                action: "stop",
                reason: `Max drawdown reached (${(this.currentDrawdown * 100).toFixed(2)}%)`,
                severity: "high",
            }
        }

        // Check for high drawdown - should reduce position size
        if (this.currentDrawdown >= this.maxDrawdown * 0.7) {
            return {
                action: "reduce",
                reason: `High drawdown (${(this.currentDrawdown * 100).toFixed(2)}%)`,
                adjustment: 0.5, // Reduce by 50%
                severity: "medium",
            }
        }

        // Check for consecutive losses - should reduce size
        if (this.consecutiveLosses >= 3) {
            return {
                action: "reduce",
                reason: `${this.consecutiveLosses} consecutive losses`,
                adjustment: Math.pow(0.8, this.consecutiveLosses), // Reduce by 20% per loss
                severity: "medium",
            }
        }

        // Check for high volatility - should reduce size
        if (this.useVolatilityAdjustment && this.priceVolatility > 0.04) {
            return {
                action: "reduce",
                reason: `High volatility (${(this.priceVolatility * 100).toFixed(2)}%)`,
                adjustment: 0.7, // Reduce by 30%
                severity: "medium",
            }
        }

        // Check for good conditions - can increase size
        if (this.consecutiveWins >= 3 && this.currentDrawdown < 0.1) {
            return {
                action: "increase",
                reason: `${this.consecutiveWins} consecutive wins with low drawdown`,
                adjustment: Math.min(1.5, 1 + this.consecutiveWins * 0.1), // Increase by 10% per win, max 50%
                severity: "low",
            }
        }

        // Default recommendation
        return {
            action: "normal",
            reason: "Regular trading conditions",
            adjustment: 1.0,
            severity: "low",
        }
    }
}

module.exports = RiskManager

// ASHDLADXZCZC
// 2019-07-25T18:00:44 – CCY3OSIi7SRMYZoEUAYV
// 2019-08-05T21:17:40 – oPnX5pI4wewOEp6awMKA
// 2019-08-06T21:00:28 – UfZnmjkbuElmTnteLWYP
// 2019-09-01T13:47:55 – 9mBw1yLt81iIzzFlLkeY
// 2019-09-17T00:31:14 – 7dsUD9U3JvrEPyPR9pY4
// 2019-09-21T20:45:25 – lxRulZLS05zUyVmfDMcr
// 2019-09-27T13:58:44 – EirX14gpi2JOsnMArEUh
// 2019-10-01T16:02:47 – ZTRdte23Yy47PIPMaWaq
// 2019-10-24T14:37:25 – QtETvplo9JBL0qMyEyP6
// 2019-11-01T02:49:41 – EnOMOlbqwEzz99jNpGdV
// 2019-11-26T11:26:34 – rm74fAlG4NIXpuQhi6vh
// 2020-01-04T11:52:24 – T3Acsyc81owyxnxa5vjC
// 2020-01-04T12:23:36 – 02m9Y9N2AFS045e9jKoi
// 2020-01-08T18:44:30 – C6c7npvmFz0USHfKqxDF
// 2020-01-12T12:52:33 – O09nz4nfUdPkXaShn19K
// 2020-01-23T18:38:24 – HtqNxzT4KVUQW7JCrHNY
// 2020-03-11T18:12:28 – NJk3z03HJuZ7EbXK7JtK
// 2020-03-22T14:47:22 – mG7jtk4NXVQfb0vMAa6I
// 2020-03-23T20:24:51 – MU94paetFEdIYiCr3wK1
// 2020-04-10T23:47:22 – wiJM1UHreBNomwsUR7mI
// 2020-04-14T19:28:36 – UueLipCayOmm6n9NZupe
// 2020-04-23T23:40:09 – 1JAta8tbYmVtcppTF7Pq
// 2020-04-27T08:53:06 – rzM1CiY3v7I5GnWd5PCU
// 2020-05-15T11:27:41 – bxFfol8SnaYr11Nrw0r4
// 2020-06-07T23:47:24 – 5Dsh5vK4YVI5hKwkgt1F
// 2020-06-08T15:14:05 – 6xIxM2fD7DaIwI8wOliV
// 2020-06-16T21:01:20 – qnxK2syz23JkgX2oNvaw
// 2020-06-17T15:35:15 – MjWs4W27Jgon02UCnOo1
