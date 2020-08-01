/**
 * ML-Enhanced Strategy
 * Extends existing strategies with machine learning optimizations
 */

const fs = require("fs")
const path = require("path")
const winston = require("winston")
const config = require("config")

// Fix the import path for BBRSIStrategy
const BBRSIStrategy = require("../../strategy/BBRSIStrategy")

class MLEnhancedStrategy {
    /**
     * Create an ML-enhanced strategy
     * @param {Object} options - Strategy options
     * @param {string} options.baseStrategy - Base strategy type ('BBRSI', etc.)
     * @param {string} options.modelPath - Path to the ML model results
     */
    constructor(options = {}) {
        this.baseStrategyType = options.baseStrategy || "BBRSI"
        this.modelPath = options.modelPath || null
        this.optimizedParams = null
        this.strategy = null

        // Create a logger
        this.logger = winston.createLogger({
            level: "info",
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            transports: [
                new winston.transports.Console({ level: "info" }),
                new winston.transports.File({
                    filename: "mlenhanced_strategy.log",
                    level: "debug",
                }),
            ],
        })

        // Initialize the strategy
        this.initialize()
    }

    /**
     * Initialize the strategy
     */
    initialize() {
        try {
            // Load optimized parameters if a model path is provided
            if (this.modelPath && fs.existsSync(this.modelPath)) {
                this.optimizedParams = JSON.parse(fs.readFileSync(this.modelPath, "utf8"))
                this.logger.info(`Loaded optimized parameters from ${this.modelPath}`, {
                    params: this.optimizedParams,
                })
            } else {
                this.logger.warn("No optimized parameters found, using default parameters")
                this.optimizedParams = null
            }

            // Create the base strategy with optimized parameters
            this.strategy = this.createBaseStrategy()

            this.logger.info(`Initialized ML-enhanced ${this.baseStrategyType} strategy`)
        } catch (error) {
            this.logger.error("Error initializing ML-enhanced strategy", { error: error.message })
            throw error
        }
    }

    /**
     * Create the base strategy with optimized parameters
     * @returns {Object} The base strategy instance
     */
    createBaseStrategy() {
        // Create a base strategy instance
        let strategy

        switch (this.baseStrategyType) {
            case "BBRSI":
                strategy = new BBRSIStrategy(this.logger)
                break
            default:
                this.logger.warn(
                    `Unknown strategy type: ${this.baseStrategyType}, defaulting to BBRSI`,
                )
                strategy = new BBRSIStrategy(this.logger)
        }

        // Apply optimized parameters if available
        if (this.optimizedParams) {
            // Apply RSI parameters
            if (this.optimizedParams.rsiPeriod) {
                strategy.rsiPeriod = this.optimizedParams.rsiPeriod
            }
            if (this.optimizedParams.rsiOverbought) {
                strategy.rsiOverbought = this.optimizedParams.rsiOverbought
            }
            if (this.optimizedParams.rsiOversold) {
                strategy.rsiOversold = this.optimizedParams.rsiOversold
            }

            // Apply Bollinger Bands parameters
            if (this.optimizedParams.bbPeriod) {
                strategy.bbPeriod = this.optimizedParams.bbPeriod
            }
            if (this.optimizedParams.bbStdDev) {
                strategy.bbStdDev = this.optimizedParams.bbStdDev
            }

            // Apply ADX parameters
            if (this.optimizedParams.adxPeriod) {
                strategy.adxPeriod = this.optimizedParams.adxPeriod
            }
            if (this.optimizedParams.adxThreshold) {
                strategy.adxThreshold = this.optimizedParams.adxThreshold
            }

            // Apply profit target if available
            if (this.optimizedParams.profitTarget) {
                strategy.profitTarget = this.optimizedParams.profitTarget
            }

            this.logger.info("Applied ML-optimized parameters to strategy", {
                rsiPeriod: strategy.rsiPeriod,
                rsiOverbought: strategy.rsiOverbought,
                rsiOversold: strategy.rsiOversold,
                bbPeriod: strategy.bbPeriod,
                bbStdDev: strategy.bbStdDev,
                adxPeriod: strategy.adxPeriod,
                adxThreshold: strategy.adxThreshold,
                profitTarget: strategy.profitTarget,
            })
        }

        return strategy
    }

    /**
     * Calculate trading signal based on the base strategy
     * @param {Array} data - Market data for signal calculation
     * @returns {Object} Signal result
     */
    async evaluatePosition(data) {
        return await this.strategy.evaluatePosition(data)
    }

    /**
     * Get all available optimized models
     * @returns {Array} List of available models
     */
    static getAvailableModels() {
        const modelsDir = path.join(__dirname, "..", "ml_models")

        if (!fs.existsSync(modelsDir)) {
            return []
        }

        try {
            const files = fs.readdirSync(modelsDir)
            const models = []

            for (const file of files) {
                if (file.endsWith("_optimized_params.json")) {
                    const modelPath = path.join(modelsDir, file)
                    const nameParts = file.replace("_optimized_params.json", "").split("_")

                    // Skip if not enough parts to extract information
                    if (nameParts.length < 3) continue

                    const market = nameParts[0]
                    const timeframe = nameParts[1]
                    const modelType = nameParts[2]

                    models.push({
                        name: file.replace("_optimized_params.json", ""),
                        path: modelPath,
                        market,
                        timeframe,
                        modelType,
                    })
                }
            }

            return models
        } catch (error) {
            console.error("Error getting available models:", error)
            return []
        }
    }

    /**
     * Get additional statistics or metadata about the strategy
     * @returns {Object} Strategy metadata
     */
    getMetadata() {
        return {
            type: this.baseStrategyType,
            optimizedParams: this.optimizedParams,
            baseStrategy: this.strategy,
            modelPath: this.modelPath,
        }
    }

    /**
     * Get important feature data for the current data point
     * @param {Array} data - Market data
     * @param {number} index - Current index
     * @returns {Object} Important feature values
     */
    getImportantFeatures(data, index) {
        // If we have feature importance information, calculate those features
        if (this.optimizedParams && this.optimizedParams.featureImportance) {
            const featureData = {}

            // Extract top 5 important features
            const topFeatures = Object.entries(this.optimizedParams.featureImportance)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)

            for (const [feature, importance] of topFeatures) {
                // Calculate the feature value based on the feature name
                // This would depend on the specific features used in the model
                featureData[feature] = {
                    importance,
                    value: "Not implemented", // Would calculate the actual value here
                }
            }

            return featureData
        }

        return {}
    }
}

module.exports = MLEnhancedStrategy

// ASHDLADXZCZC
// 2019-08-12T03:30:14 – WCPrYKMIsMwsy0wprQES
// 2019-08-28T19:25:15 – 32eXxSbEwyPGr0MZistt
// 2019-10-01T18:47:22 – uUr3KBDXbvy3JZ1Q5g79
// 2019-10-30T21:11:54 – Ybj52EeWUCUXXKZJ3mrl
// 2019-11-01T08:21:17 – dECvp7t8wTrigZPRJilw
// 2019-11-08T14:54:44 – XE7kZra3mtGF4AL07Tfe
// 2019-11-09T11:48:03 – y9OZldrnYMhIDqr5v590
// 2019-11-13T23:27:38 – 623jotli3VMiVV2M8lqm
// 2019-11-14T06:58:52 – h4cwDdy0Pn32J0VeLDBg
// 2019-11-18T10:44:55 – 9UX5E3WHN7dyivetx6hM
// 2019-12-07T22:23:26 – QlBnrc7hvkImLUo1RrZB
// 2019-12-23T10:34:07 – s3Z8xkxymKsJwGWQLYMC
// 2019-12-26T11:14:36 – 3253bKldtC3u2B5iR9GD
// 2019-12-27T14:25:56 – EeBUKu8Cz42HLGRGLYEN
// 2019-12-30T20:51:48 – gqdfIrH9024zzDccFyJA
// 2020-01-14T06:59:47 – aKSZt7vROcQxvpn4zMkN
// 2020-01-25T07:18:52 – 6ZCvm11cUixO2kOBfoJv
// 2020-03-06T07:47:57 – iQh2hoHZgnWiVu5AY68G
// 2020-03-29T22:51:20 – V4DMKHudsJlj5pAkWYdl
// 2020-04-12T19:39:40 – ZFUrpZPZ5VVECDtzylEu
// 2020-04-15T14:28:53 – cGUgMcEB9TKdwj6k1llo
// 2020-04-19T20:40:18 – NXSoJ9HQ9lFJkYMKbIvv
// 2020-04-26T10:05:59 – AdNWIwDCJ0nT3meoUxs8
// 2020-05-01T12:45:00 – V3GYQkujEmABzGa4bRos
// 2020-05-08T16:25:10 – xIpnF9spBtCVqmtcbE4f
// 2020-06-26T10:35:53 – 5aqp8X3psOIoqW1ibJV8
// 2020-06-30T15:52:26 – BL3Otz38s84hRL7kD8nm
// 2020-07-12T23:24:44 – aFXcEL1WWquQf15jO1dO
// 2020-08-01T05:24:57 – RaiUHYCBfBjP4JS3CZ5B
