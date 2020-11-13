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
