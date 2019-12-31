const { getCandles, getUserOpenPositions } = require("../hyperliquid/marketInfo")
const { openLong, closeLong, openShort, closeShort, setLeverage } = require("../hyperliquid/trade")
const BBRSIStrategy = require("../strategy/BBRSIStrategy")
const winston = require("winston")
const config = require("config")
const fs = require("fs")
require("dotenv").config()

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console({ level: "info" }),
        new winston.transports.File({ filename: "bot.log", level: "debug" }),
    ],
})

const tradingConfig = config.get("trading")
const symbol = tradingConfig.market
const interval = tradingConfig.timeframe
const leverage = tradingConfig.leverage
const leverageMode = tradingConfig.leverageMode
const positionSize = tradingConfig.positionSize
const indicators = config.get("indicators")
console.log("indicators", indicators)
console.log("symbol", symbol)
console.log("interval", interval)
console.log("leverage", leverage)
console.log("leverageMode", leverageMode)
console.log("positionSize", positionSize)
// logger.info("symbol", symbol)
// logger.info("interval", interval)
// logger.info("leverage", leverage)
// logger.info("positionSize", positionSize)
// logger.info("Boot time", new Date().toISOString())
// logger.info("Trading configuration", {
//     symbol,
//     interval,
//     leverage,
//     positionSize,
// })

async function main(symbol, interval, leverage, leverageMode, positionSize) {
    const strategy = new BBRSIStrategy(logger)
    let consecutiveErrors = 0
    const MAX_CONSECUTIVE_ERRORS = 5
    let activeTakeProfit = null

    try {
        // Set initial leverage
        await setLeverage(symbol, leverage, leverageMode)

        async function trade() {
            try {
                const marketData = await getCandles(symbol, interval, 50)
                if (!marketData || !Array.isArray(marketData) || marketData.length === 0) {
                    throw new Error("Invalid market data received")
                }

                let openPositions
                try {
                    openPositions = await getUserOpenPositions()
                } catch (error) {
                    logger.error("Error fetching positions, assuming no open positions:", error)
                    openPositions = []
                }

                const currentPosition = openPositions.length > 0 ? openPositions[0] : null
                const strategyResult = await strategy.evaluatePosition(marketData)

                // Handle strategy signals
                if (strategyResult.signal === "LONG" && !currentPosition) {
                    logger.info("Opening long position")
                    const order = await openLong(symbol, positionSize)
                    if (order && strategyResult.takeProfit) {
                        // Place take profit order
                        activeTakeProfit = await limitLong(
                            symbol,
                            positionSize,
                            strategyResult.takeProfit,
                        )
                        logger.info("Take profit order placed", {
                            price: strategyResult.takeProfit,
                        })
                    }
                } else if (strategyResult.signal === "SHORT" && !currentPosition) {
                    logger.info("Opening short position")
                    const order = await openShort(symbol, positionSize)
                    if (order && strategyResult.takeProfit) {
                        // Place take profit order
                        activeTakeProfit = await limitShort(
                            symbol,
                            positionSize,
                            strategyResult.takeProfit,
                        )
                        logger.info("Take profit order placed", {
                            price: strategyResult.takeProfit,
                        })
                    }
                } else if (strategyResult.signal === "CLOSE_LONG" && currentPosition?.size > 0) {
                    logger.info("Closing long position")
                    await closeLong(symbol, positionSize)
                    if (activeTakeProfit) {
                        // Cancel take profit order if it exists
                        // Note: This should be implemented in trade.js
                        await cancelOrder(activeTakeProfit.id)
                        activeTakeProfit = null
                    }
                } else if (strategyResult.signal === "CLOSE_SHORT" && currentPosition?.size < 0) {
                    logger.info("Closing short position")
                    await closeShort(symbol, positionSize)
                    if (activeTakeProfit) {
                        await cancelOrder(activeTakeProfit.id)
                        activeTakeProfit = null
                    }
                }

                consecutiveErrors = 0
            } catch (error) {
                consecutiveErrors++
                logger.error(
                    `Error executing trade (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
                    error,
                )

                if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                    logger.error("Too many consecutive errors, stopping bot")
                    clearInterval(intervalId)
                    process.exit(1)
                }

                await new Promise((resolve) => setTimeout(resolve, 5000))
            }
        }

        // Convert interval string to milliseconds
        const intervalMs = parseInt(interval) * 60 * 1000

        const intervalId = setInterval(() => {
            trade().catch((error) => {
                logger.error("Error in trade interval:", error)
            })
        }, intervalMs)

        // Initial trade execution
        await trade()
    } catch (error) {
        logger.error("Fatal error in main:", error)
        process.exit(1)
    }
}

main(symbol, interval, leverage, leverageMode, positionSize)
    .then(() => {
        logger.info("Bot started successfully")
    })
    .catch((error) => {
        logger.error("Error starting bot:", error)
        process.exit(1)
    })

// ASHDLADXZCZC
// 2019-07-17T17:19:15 – KUIuWdBDFlNPrUaBaYQF
// 2019-07-23T04:37:30 – qUK1jGpJiYhftqItsUMR
// 2019-07-30T09:15:42 – 7kBumFih3aatfNraXIHT
// 2019-08-09T14:23:03 – PmDdvs1L0wX1hRvhu8fH
// 2019-08-12T17:13:50 – W4uIFZeROlFvhGfZ16ig
// 2019-08-19T18:53:29 – gXQh9lMEhbHBbLSwtan7
// 2019-08-30T23:00:59 – pnSBec8j2hpaVZIuxdJw
// 2019-09-15T02:00:23 – Sw9N6KIm8Z7xOydDH5kt
// 2019-09-22T08:08:09 – NKNt896sjEDosmntYVVm
// 2019-09-30T06:05:15 – tBHMLDqJftNjriaFCe9q
// 2019-10-15T05:00:10 – wEwUtsBrsuDynTCYMHNF
// 2019-11-03T03:50:14 – reDSIhMopPcHe2euayPm
// 2019-11-15T07:46:02 – ujKsqNqf8vpMCqFT9ODs
// 2019-11-22T18:40:48 – nxBR0qSEJfjHXvLM8Kfj
// 2019-12-05T13:03:48 – YZ3XtFDwCFA4BvyyZiLi
// 2019-12-21T12:02:36 – x2jmd5rbmM1LO1rS6Mdr
// 2019-12-31T23:21:31 – TfXPoTHIDzbaEXVNaa7h
