const { Hyperliquid } = require("hyperliquid")
const fs = require("fs")
require("dotenv").config()
const axios = require("axios")

const privateKey = process.env.AGENT_PRIVATE_KEY_TEST
const address = process.env.PUBLIC_ADDRESS
const agentAddress = process.env.AGENT_ADDRESS
const networkType = process.env.NETWORK_TYPE

async function getCandles(symbol, interval, count) {
    const sdk = new Hyperliquid({
        enableWs: false,
        testnet: false,
    })

    try {
        await sdk.connect()

        // Convert interval string to milliseconds
        const intervalToMs = {
            "1m": 60 * 1000,
            "3m": 3 * 60 * 1000,
            "5m": 5 * 60 * 1000,
            "10m": 10 * 60 * 1000,
            "15m": 15 * 60 * 1000,
            "30m": 30 * 60 * 1000,
            "1h": 60 * 60 * 1000,
            "4h": 4 * 60 * 60 * 1000,
            "1d": 24 * 60 * 60 * 1000,
        }

        const intervalMs = intervalToMs[interval]
        if (!intervalMs) {
            throw new Error(`Unsupported interval: ${interval}`)
        }

        // Calculate start and end times
        const endTime = Date.now()
        const startTime = endTime - count * intervalMs

        // Get candles
        const candles = await sdk.info.getCandleSnapshot(symbol, interval, startTime, endTime, true)

        console.log(`Retrieved ${candles.length} candles for ${symbol}`)
        console.log(
            "last candle close:",
            candles[candles.length - 1].c,
            "at",
            new Date(candles[candles.length - 1].T).toISOString(),
        )

        return candles
    } catch (error) {
        console.error("Error fetching candles:", error)
        throw error
    } finally {
        sdk.disconnect()
    }
}

async function getCurrentPrice(symbol) {
    const sdk = new Hyperliquid({
        enableWs: false,
        testnet: false,
    })

    try {
        await sdk.connect()
        const currentTime = new Date().getTime()
        const response = await sdk.info.getCandleSnapshot(
            symbol,
            "1m",
            currentTime,
            currentTime,
            true,
        )

        if (!response || !response[0] || !response[0].c) {
            throw new Error("Invalid price data received")
        }

        // Ensure we're working with a number
        const price = parseFloat(response[0].c)
        if (isNaN(price)) {
            throw new Error("Invalid price format received")
        }

        console.log(`Current ${symbol} price:`, price)
        return price
    } catch (error) {
        console.error("Error fetching current price:", error)
        throw error
    } finally {
        sdk.disconnect()
    }
}

async function getUserOpenPositions() {
    const sdk = new Hyperliquid({
        enableWs: false,
        privateKey: privateKey,
        testnet: true,
    })

    let retries = 3
    let delay = 1000 // 1 second initial delay

    while (retries > 0) {
        try {
            await sdk.connect()

            const userState = await sdk.info.perpetuals.getClearinghouseState(address)

            // Add null check for userState
            if (!userState) {
                throw new Error("Received null userState from API")
            }

            const activePositions = userState.assetPositions || []

            if (activePositions.length > 0) {
                console.log("Active position Open")
                return activePositions
            } else {
                console.log("No active positions")
                return []
            }
        } catch (error) {
            console.error(`Error fetching positions (${retries} retries left):`, error)
            retries--

            if (retries === 0) {
                throw new Error(
                    `Failed to fetch positions after multiple attempts: ${error.message}`,
                )
            }

            // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2 // Double the delay for next retry
        } finally {
            try {
                sdk.disconnect()
            } catch (error) {
                console.error("Error disconnecting SDK:", error)
            }
        }
    }
}

async function getUserOpenOrders() {
    try {
        const sdk = new Hyperliquid({
            enableWs: false,
            privateKey: privateKey,
            testnet: true,
        })

        await sdk.connect()

        const orders = await sdk.info.getUserOpenOrders(address)

        return orders
    } catch (error) {
        console.error("API Connection Error:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        })
    }
    throw new Error(`Failed to fetch orders: ${error.message}`)
}

// Add this helper function to test the connection separately
async function testConnection() {
    try {
        // const orders = await getUserOpenOrders()
        // console.log("Open orders:", orders)
        // console.log("-----------------------------------------------")
        const openpositions = await getUserOpenPositions()
        console.log("Open positions:", openpositions)
        console.log("-----------------------------------------------")

        // return orders
    } catch (error) {
        console.error("API Connection Test Failed:", {
            error: error.message,
        })
    }
}
// testConnection()
//     .then(() => {
//         console.log("Connection test complete")
//     })
//     .catch((error) => {
//         console.error("API Connection Test Failed:", {
//             error: error.message,
//         })
//     })

module.exports = {
    getCandles,
    getCurrentPrice,
    getUserOpenOrders,
    getUserOpenPositions,
}

// interface Candle {
//     t: number; // open millis
//     T: number; // close millis
//     s: string; // coin
//     i: string; // interval
//     o: number; // open price
//     c: number; // close price
//     h: number; // high price
//     l: number; // low price
//     v: number; // volume (base unit)
//     n: number; // number of trades
//   }

// // // You can test it like this:
// testConnection()
//     .then(() => {
//         console.log("Connection test complete")
//     })
//     .catch(console.error)

// ASHDLADXZCZC
// 2019-07-15T09:10:02 – dtoXIeHFyalzDdfjW7yn
// 2019-07-27T19:16:16 – COHrXbs7ZB2LtSGQ0udt
// 2019-08-06T19:30:27 – iKnEqgqRG3fXe5ycC4Xv
// 2019-08-07T02:09:55 – KVdqMI269CBCKVYdHyuQ
// 2019-08-14T20:34:00 – uYcyZmZ0jPNWEYuwHyP7
// 2019-08-27T03:26:01 – fJxmiY43CArLioEubPuX
// 2019-08-28T05:59:03 – meP8XKxhh5yTLTJlnvB0
// 2019-09-11T10:58:30 – XF32gDbdqVkzwSfboi32
// 2019-09-12T10:30:22 – DSonzs3NdScmzU8HSH4D
// 2019-09-14T07:00:37 – ZW8BsmHHlkXJLbH4XtLk
// 2019-09-18T05:35:07 – 9ycdybswffPYqxjBB5yP
// 2019-09-19T07:15:07 – k1kbjYOkTBMb7dmnvjgP
// 2019-10-18T17:20:15 – DUzvADo7VYtsksc3Pm28
// 2019-11-28T08:21:04 – jzg7rizRE2JTi38vatQK
// 2019-12-05T10:08:43 – E0CRGJAgeJjAQ0YTARfH
// 2019-12-16T20:01:15 – J7j5R3711LN0gznTG0pH
// 2019-12-21T12:12:20 – 7pCOrpMKoUyIKQuRnlzo
// 2019-12-23T15:30:51 – jrTlEI6yLFVI4dpfCnKU
// 2020-01-12T06:30:47 – YQAk0uvrZIRswiOH0zX4
// 2020-02-15T09:26:08 – 28ZMGAoyStXM3eNKbQ3d
// 2020-02-18T00:05:48 – wFp3iin8698jmwNximKE
// 2020-03-05T05:37:52 – P2TgiktIRM50c8Ns6wTC
// 2020-03-08T17:16:39 – 9nO35GO89YWS1rxbh22o
// 2020-03-23T20:49:20 – rKMPaisGo3YDDV263tiW
// 2020-04-22T07:10:26 – FvMkOx1TYmght2JsA5nh
// 2020-05-18T18:48:41 – eTUR8wRMZhAqvincSOWl
// 2020-06-03T01:26:05 – ovRt1Bm3laYEwTyMijh3
// 2020-06-03T03:16:36 – HQ61T1evzOQxfJ26CelF
// 2020-06-07T03:07:27 – HsBTiRfpd5QBkABIanC7
// 2020-07-26T01:02:42 – sq2SKPBYWJ1ess6uSai2
// 2020-08-12T15:01:25 – hDaWtnLeVmdqm0tNSARa
// 2020-08-14T02:15:20 – DDZR4aMqiZC6g2dRa1Vm
// 2020-09-11T03:59:57 – CcIwvVdSpMaHvegxspDI
// 2020-11-13T17:21:24 – qfkhkEcQZErtcihkqY3I
// 2020-11-14T04:04:26 – Zp1Orbh33e800A0GlJjl
// 2020-11-14T04:34:19 – WXQLvlxt2nFKIEzjRRII
// 2020-11-17T20:02:17 – 3oelrZQDfM548OxvtQMA
// 2020-12-05T11:45:49 – Fze7KywcGFYnF8n8x7Kg
// 2020-12-14T08:51:18 – T3LHMtvOeKmlqo9eJh3I
// 2020-12-14T12:02:41 – Lbm96EdzcQkm34gZ2kg5
// 2020-12-20T20:55:32 – 2IjtHkjvmyxOi9104Y9P
// 2020-12-24T08:07:56 – fuDadDdsAza0Zbt7i2DQ
// 2021-02-03T12:54:59 – ORJvOuJ6JWDjClLipMhm
// 2021-03-24T18:36:43 – v08KOkWN8BueRwE61d0m
// 2021-03-28T12:43:56 – MsTTCdeu0FtqQnl5rMOs
// 2021-03-30T02:48:01 – lmSqcJoE0trflRVWZzLb
// 2021-04-20T06:29:39 – 08vcGHVYMceZFqKXnSCP
// 2021-04-21T15:51:45 – xH5ZhTsBuB5bVRp7S2yw
// 2021-06-20T08:05:46 – 7FTiGXs9AhHTRLlt4uwV
// 2021-06-27T13:33:09 – PkNG4HPeEdhaDB8h6oYP
// 2021-07-01T20:32:09 – EI47BeU1xMagACsUeLKO
// 2021-07-08T13:29:37 – CmeI6DOiZQTRYKK0g2rv
// 2021-07-27T18:33:17 – OaC3xNf1QkmK6qfp6mMZ
// 2021-08-10T21:02:08 – 43Hdop4Lz4i7CiHNY1Bp
// 2021-08-24T05:16:34 – GS2xes78blt3GKFJHOgS
// 2021-08-25T05:32:56 – J44VMrrtyKN2cT3aJNu3
// 2021-09-03T08:00:27 – KtwXbGZ2Uzip4r1sKlux
// 2021-09-10T12:25:45 – WbQphAfutE328gib3j0O
// 2021-09-25T03:56:21 – O5gNQz3UZoDhMn6yNLqG
// 2021-10-09T20:11:14 – dnAkR6g5vzhGPGtxsquS
// 2021-10-15T02:16:22 – 0iU0qBwB1imJiZulX9CN
// 2021-10-18T10:43:16 – y8A2lbKjbkcK2r8lU8nY
// 2021-10-21T05:57:34 – W3QZOPnqvT72cdwUMq1j
// 2021-10-28T23:20:48 – Ok4K2b8FZo1wWWHSJtzD
// 2021-11-04T18:49:32 – sHXbv5D7SJO5eOvdbz2e
// 2021-12-12T22:12:17 – iwWBFdf0Q5TQ243HCg7i
// 2022-01-08T11:41:10 – rPooVyeYQQtR5anlfHOQ
// 2022-02-03T09:16:20 – LZtT17VSk5LJk7DSwn44
// 2022-02-04T07:15:54 – iijGJFqQqdT3zFqfBhdo
// 2022-02-09T01:36:25 – v92nI42x2tyZeQ6G7YKP
// 2022-02-13T09:47:54 – 3ANfWXtHehUlVRVTYn4i
// 2022-02-15T00:24:37 – Hfg7YOSSGptsBzkG8Kjl
// 2022-03-12T13:04:36 – cpZB47sjqsZJIXlDFMaf
// 2022-04-01T20:43:09 – GEr0hcle7MqFxXBcAPHY
// 2022-04-13T02:41:35 – BBbQC2iwEYYyOA48ChxR
// 2022-05-10T00:47:28 – fifU7pmwrJlIFVryEKHN
// 2022-05-14T02:18:19 – GvW0K5Xqjfe1a8ZXNyRj
// 2022-05-15T00:00:20 – PwNP7WC0Lecs0r1UvZI7
// 2022-05-17T12:09:26 – fRtlP0ZiD4P93hGOeuvf
// 2022-05-19T03:02:24 – oLmbbQouAYIRQCeK66d7
// 2022-05-23T14:34:15 – zlmQyQddAGstfUsSGaxW
// 2022-05-26T01:00:42 – aHmwZhtZ6L0vFyrcqlyH
// 2022-06-03T03:06:12 – uY2O17wJQSgKJcyTSlh7
// 2022-06-07T00:53:20 – FQqveiZ81d6VVGU16NyE
// 2022-06-12T01:26:35 – pSlR53YXKGrilG2ibQk8
// 2022-06-28T19:33:48 – B9cNNQMU3MAqblhJybC9
// 2022-07-10T23:52:44 – rn8bCwTE0IeBszDxDubt
// 2022-07-12T15:43:07 – O1AxP2516UeDkIIfzkeV
// 2022-07-22T19:33:32 – VFsbTAUQwjGmuT1ix9eD
// 2022-09-11T23:46:31 – cQvtAYq9sT7RWcxv6Wob
// 2022-09-28T03:39:52 – aPbZ29l9HQlpgOWxfRBd
// 2022-10-10T14:34:49 – SeTBpiTNDRwo4gUzYcFQ
// 2022-10-17T03:04:59 – LbzHQfW92PUvl72q9CaJ
// 2022-10-17T22:51:58 – etBRSAk2A7h2LTXeaBhS
// 2022-10-18T01:51:53 – DyvcWWK75WMHvEniUDA6
// 2022-10-22T23:20:34 – n5C36kFrs5j2jyR5FhT6
// 2022-10-28T14:08:02 – AH6tIuwrL8KarCAEpwL4
// 2022-10-29T11:01:02 – 3qJWYGXEmqyzRTFmCWq4
// 2022-11-06T23:46:46 – 2u0PfCzryYM0BY3D6puc
// 2022-11-25T18:25:14 – GHp09CP5O8N4MXuZORzD
// 2022-11-28T02:30:23 – LnymydrJPxdaVzF5rXAI
// 2022-12-02T20:53:49 – D0QNk5n1r1zp60jcO8qC
// 2022-12-12T01:18:08 – ZQ6TA6kAJQ2uRnweYDjk
// 2022-12-29T12:59:46 – rXnVYv8dpFD9ax3c5QFU
// 2023-01-03T04:54:38 – jo407cTcIOZKbLpPnPyW
// 2023-01-03T17:10:59 – ZsaTHTv8U1XRSgIUdBzM
// 2023-01-21T04:41:59 – Ys1kQ7osvdYDrknsCDaV
// 2023-03-18T01:08:54 – lu2lafH2HZ5Zi0Yt43s8
// 2023-03-25T13:50:23 – lwxzyzXzdYSytCoraDjf
// 2023-03-27T00:18:21 – LMmZmt1w5pP6qUZs0g2D
// 2023-03-29T19:59:37 – EGeMT47JbxKG5vnbcMC7
// 2023-04-08T22:51:02 – gw88csyvQTVMIpvKnlPY
// 2023-05-11T15:35:41 – tj12ovJ1v6kvltGLCCBP
// 2023-05-21T08:01:38 – vs6CG9K7na0z5ggZ0Fza
// 2023-05-24T00:59:00 – IE8rbYM2sNIrkIQNLjsp
// 2023-06-06T01:00:42 – RlujhT2h0ZAEM2Z1DSeh
// 2023-06-10T00:37:55 – a2X64SucCrI5wHo6n8fQ
// 2023-06-23T14:45:51 – BraLTsH0bw4mu4DPqgGT
// 2023-06-24T17:10:46 – twCZ6eHWLmThTHQsmwSF
// 2023-07-09T14:31:15 – sW8eFG99Siy3aYff4yYe
// 2023-07-13T10:28:41 – bzLoBRTfD5z6f7gDzPaB
