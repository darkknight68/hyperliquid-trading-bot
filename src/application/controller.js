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
// 2020-01-10T18:32:47 – cDDJ4uhsVtdEegt5tctI
// 2020-02-08T09:11:11 – tZdPcPSyps4EgxzeHXNy
// 2020-02-08T19:09:28 – TA1ZFs9QRruviIzhendZ
// 2020-02-11T12:43:39 – MH3T1kKj3THfvfWCpJnQ
// 2020-02-11T13:50:13 – tj5YMzV0a7610JigYbT8
// 2020-02-14T07:00:31 – hYkpMqHRBlXQ0vTfOkzc
// 2020-02-17T02:57:44 – eBkz2gAFen1u7didIoVe
// 2020-02-17T05:32:23 – 5Ap4FIK13PtiSpi81xrF
// 2020-02-24T23:30:11 – 17RFMz1shEsl2tphDNXx
// 2020-02-29T10:59:11 – UJFuZJhbTLNMt6WTIRBT
// 2020-03-28T11:40:09 – sJuDWHouT9qmUn6ZR0OH
// 2020-04-05T20:03:23 – 1z3M1PJoJ5Xp4jEOKRdV
// 2020-04-12T05:30:48 – zGDn8IoL3PqSTtBbAXZp
// 2020-05-13T22:03:13 – J5Tk9Xr2HAVnDXt8sXgZ
// 2020-05-25T23:44:39 – Gp5UrmDSRwpR0hRwg48O
// 2020-05-30T10:39:43 – nIiIaAVJ7fvYDcqF0SIS
// 2020-05-31T14:40:02 – rA43d9IHZ5sApj0mUhHk
// 2020-06-26T08:31:37 – 84Us82XpmB9zdflLVk1I
// 2020-07-07T14:35:17 – yWXyXcvaz9raxeD5gYq7
// 2020-07-15T05:16:08 – qb9oP4yp06ny5SgJlTD6
// 2020-07-16T13:54:50 – 8j5XxW44pOnBNOpiDWxW
// 2020-07-30T22:52:45 – IfsrSm6At8wulB832pA4
// 2020-08-06T01:26:25 – QMamUERC4FccMDbLVqgE
// 2020-08-25T00:58:16 – DDACU9OKYcasEqScEv0g
// 2020-09-24T07:23:00 – 4CTJyj3HfFgwsDcDjh82
// 2020-10-23T08:23:16 – VzSKpl3gki6oFgQgJbor
// 2020-10-30T09:57:54 – iPzOw7NFiDGxZ1CvTI2p
// 2020-11-05T20:58:31 – 7nFNtieSVBdvwMeGn8H2
// 2020-11-13T03:18:33 – hcelpt5X50jEc75iw2JR
// 2020-12-02T15:30:09 – rkzvZflZB0YgGlDWYFjO
// 2021-01-07T07:01:07 – HNVcuHba8dTtrMvyNAWY
// 2021-01-25T21:17:38 – KRHYRmt0xFgrSNSI3HYk
// 2021-02-02T11:28:49 – rJdImkWcWTjiYKxpj4ii
// 2021-02-03T05:35:02 – rtg8R7aZ3NrZ1U20cHcD
// 2021-02-06T13:09:21 – 10hYkv0fqUFxmhyS9W7k
// 2021-02-09T18:21:10 – b6bD6a2yqvbxGilflfjv
// 2021-03-20T18:41:00 – FUSrg5WC6DO94URiDkQZ
// 2021-03-25T22:54:16 – wsbvdzwIraVaYx3AcmAO
// 2021-04-06T07:03:28 – lD2GieNeeJXaINObmGyE
// 2021-05-20T11:27:26 – cbNs7hAfIkjxo93qcffi
// 2021-07-04T01:33:40 – 0TKyOjppRslx5Hy2JG3X
// 2021-07-07T11:16:19 – W8QHXuKpdkNBFIs0UY8O
// 2021-07-09T13:15:43 – fDqpHpPdcqx7qflRtcyd
// 2021-08-15T00:28:48 – aI5ypsGzfW9RXKqvWROY
// 2021-08-16T11:32:39 – vbwRLAVF1upXOx4vt3yl
// 2021-08-31T08:57:41 – M1VZPuOehCYNxf9FvGOa
// 2021-09-06T14:10:14 – 66VT7wJ64x58ibNw2x1x
// 2021-09-22T03:24:12 – gqnpnY6l4MORvKsiSzZL
// 2021-09-25T22:03:31 – 9B9hMKIJ7W1KrVjK7I7e
// 2021-10-15T03:53:40 – SIBrxqxXTd4YkOQ8Y1ob
// 2021-10-19T01:54:57 – Z9BXiQguBxs4sPgRJSLA
// 2021-11-04T00:56:48 – GK0uYn4kYl1bvbSGfqhH
// 2021-11-10T03:08:00 – pCIMnoCcxneQbLPTg2R9
// 2021-11-25T09:59:21 – FGg5b3PIK6h5nDDctB7d
// 2021-12-02T06:37:31 – YUw4eXDslKplBgYypI0m
// 2021-12-07T19:02:27 – ykq8sYv528i7QykeQPkr
// 2021-12-09T11:22:12 – zlin59abvPRfoZ8dYURe
// 2021-12-12T01:30:16 – zejTv8u77UBTIYOvoOqq
// 2021-12-12T12:41:02 – 0ExTbw2K00Ef9jq4FEDO
// 2021-12-30T13:48:57 – lbCzS3zomMjVRcRI5Kt4
// 2022-01-19T16:13:58 – 34QvjEahgcMC9jm9oWIp
// 2022-01-27T23:15:20 – obNagNt42xW6390UfEqa
// 2022-01-31T08:43:10 – ywY6wO4Fac8Pi8Hz0jPo
// 2022-02-08T16:26:55 – naeCKZBtCwzh46ApsiHX
// 2022-02-09T03:32:54 – aJyLnNusbnLDft8G535q
// 2022-02-25T18:02:59 – RLj8aBdpqCQ390qseGtG
// 2022-03-04T14:16:33 – TWCr9nGCSaqy53j01PNL
// 2022-03-08T16:50:40 – iSUqCRnQIbK9hchgalL1
// 2022-04-13T07:33:12 – mhpT2u8wbP9tt85GWH1K
// 2022-04-27T12:12:54 – E5eEkqzmgNG8VwxMqH2E
// 2022-05-05T06:44:33 – v2HRqkuGGmpOyQa8U7oV
// 2022-05-11T11:01:42 – nOzSChxtEFUs0qNfgo0M
// 2022-05-14T13:54:49 – sggifi77nmZZteKbtnsX
// 2022-05-26T01:43:08 – YMrD5CaxLpMD1fJ0rSXk
// 2022-06-08T06:28:10 – JBjq9434nQvxnR5PRXTT
// 2022-06-25T10:50:50 – L9bl7pY7gpOkQEw1PrUG
// 2022-07-05T17:40:21 – 7jkxcdn1otv7nPEZDJgM
// 2022-07-08T16:27:29 – rl3LQ1Z20NCkXtLOmX9O
// 2022-07-10T08:55:36 – 0f4NdOPKtThMRFv2zN0K
// 2022-07-17T15:30:16 – hcUr8Ycae1oVTUKxwVCa
// 2022-08-02T21:26:30 – B3q6DTSXNGQMeP7ZpqfF
// 2022-08-08T19:30:19 – xJoemZOjnLWAfESHklNW
// 2022-08-16T18:55:26 – 87gmA7rYq9TJ9AakaIO2
// 2022-09-10T06:07:49 – 5Z9rQz0Qjr2HgZCzR1vM
// 2022-10-02T04:46:42 – qImydEFudCtdwRJZuuYJ
// 2022-10-28T13:40:59 – YKp5gAXrL3bLi7TBtEHI
// 2022-11-08T06:28:14 – aVCmcCvHnItR1CdExhS4
// 2022-11-11T04:23:09 – 0DcY6eI3cLIJaBtluZD3
// 2022-12-12T23:15:31 – SVcxzqNpUFpakn5XsIms
// 2022-12-16T15:15:07 – AP6B7XMi9eRAsMrFdDEu
// 2023-01-08T06:47:07 – NJjrQ3czbVtFf91D6HvJ
// 2023-01-28T20:53:29 – AEfsPv7Hn8BZZ1X948wf
// 2023-02-10T08:06:43 – Q4CBZYrYS3pJHrXkQOjS
// 2023-03-26T15:38:57 – pLIcjD9afpYGwEIo1P4F
// 2023-04-19T02:10:48 – S4LhxpagJzwgHjLSOnC5
// 2023-04-22T20:09:30 – 3rpmkM2vxRPGHmyGLOrf
// 2023-04-26T22:16:41 – 5mRghvtOt9bwB5PWSXJA
// 2023-05-13T07:28:47 – oEF5P0t1BFasCtAHSbmG
// 2023-05-22T22:08:49 – tmtEYOMsA6aSCp3U3jO1
// 2023-05-28T02:46:17 – FugHlDWXBz22Wax6fh7g
// 2023-05-31T00:58:45 – TETCUK41hInY3DjNBudP
// 2023-06-15T19:23:34 – 10S3eC1TTpIhHgU5rLSl
// 2023-06-24T20:28:38 – 53dBO34Tok72xRFVGTBf
// 2023-07-22T00:45:17 – 91KqSfNl1WMMHArrSv1U
// 2023-08-02T17:33:10 – JJ24WsdeaG1dg8laq9SE
// 2023-08-06T09:53:11 – IMlJxc0SzB42KbUXbW5O
// 2023-08-11T20:45:20 – uADLyjqsMgazILkHept3
// 2023-08-14T07:14:15 – JL1iohPNLQQm5JBSWQD0
// 2023-08-17T23:00:45 – iHc8KdxGu57A3ChftJrw
// 2023-09-01T23:15:25 – FFxWQsZzaIUn3XNPIekn
// 2023-09-10T03:19:45 – g7bD4z2deh71xvjfJCPY
// 2023-09-25T00:53:27 – UN4qNc5AeCoFQLR5spiP
// 2023-10-21T11:00:46 – GtQoIyWKaIdzvnggYG3X
// 2023-11-05T08:58:04 – 4mB3q1cSn8wepN6zDPfk
// 2023-11-10T14:23:44 – ZnqgFB3VaN6vAy2Nz5q4
// 2023-11-28T12:47:42 – W1WtsuHHWhQ7oSdODgsI
// 2023-11-28T17:50:29 – 7usIXO9VKElLQyVVHZWX
// 2023-12-12T17:47:46 – VuuERQcq1v9jfYDqDSsR
// 2023-12-21T08:11:51 – 6qTwQ67737IMQnUQ739S
// 2024-01-23T12:28:32 – mcNidnJgoogI9CyMRqJM
// 2024-02-19T14:39:21 – ZIBE9dVkPfr8J1cF9G3h
// 2024-02-25T14:06:45 – w8ODPwgNHvDoCg4v4s14
// 2024-02-26T22:06:01 – CZ6H2kK9lfd996lkeQix
// 2024-03-23T01:47:10 – PbHTmZR5gikZyXjhQvdC
// 2024-04-15T19:42:19 – FFjWzpLb15WyjlM3zBOp
// 2024-05-15T04:02:20 – sqC24zCSmvy44Y9Xq1Mq
// 2024-05-16T11:42:22 – vDzDvJylgFsReeNEpOg7
// 2024-05-23T20:06:20 – FuVthRa7seMleYDj1DyI
