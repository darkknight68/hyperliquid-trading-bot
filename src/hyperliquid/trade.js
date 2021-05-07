const { Hyperliquid } = require("hyperliquid")
const { getCurrentPrice, getUserOpenPositions } = require("./marketInfo")
require("dotenv").config()

const privateKey = process.env.AGENT_PRIVATE_KEY_TEST
const address = process.env.AGENT_ADDRESS
const networkType = process.env.NETWORK_TYPE

let testnet = false
if (networkType === "testnet") {
    testnet = true
}

class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests
        this.timeWindow = timeWindow
        this.requests = []
        this.blocked = false
    }

    async waitIfNeeded() {
        const now = Date.now()
        // Remove old requests
        this.requests = this.requests.filter((time) => now - time < this.timeWindow)

        if (this.requests.length >= this.maxRequests) {
            // Calculate required wait time
            const oldestRequest = this.requests[0]
            const waitTime = this.timeWindow - (now - oldestRequest)
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            return this.waitIfNeeded() // Recursively check again
        }

        this.requests.push(now)
    }
}

class SDKPool {
    constructor() {
        this.sdk = null
        this.lastUsed = null
        this.connectionTimeout = 30000 // 30 seconds
        this.rateLimiter = new RateLimiter(1, 10000) // 1 request every 10 seconds
    }

    async getSDK() {
        await this.rateLimiter.waitIfNeeded()

        const now = Date.now()
        if (!this.sdk || !this.lastUsed || now - this.lastUsed > this.connectionTimeout) {
            if (this.sdk) {
                try {
                    await this.sdk.disconnect()
                } catch (error) {
                    console.error("Error disconnecting old SDK:", error)
                }
            }

            this.sdk = new Hyperliquid({
                privateKey: privateKey,
                address: address,
                testnet: testnet,
                enableWs: false,
            })

            await this.sdk.connect()
        }

        this.lastUsed = now
        return this.sdk
    }

    async releaseSDK() {
        // Don't disconnect immediately, let the timeout handle it
        this.lastUsed = Date.now()
    }
}

const sdkPool = new SDKPool()

async function limitLong(symbol, quantity, limitPrice) {
    let sdk
    try {
        sdk = await sdkPool.getSDK()

        const parsedQuantity = parseFloat(quantity)
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error("Invalid quantity. Must be a positive number")
        }

        const orderRequest = {
            coin: symbol,
            is_buy: false, // Selling to take profit on long
            sz: parsedQuantity,
            limit_px: limitPrice,
            order_type: {
                limit: {
                    tif: "Gtc", // Good-till-cancelled for take profit orders
                },
            },
            reduce_only: true, // This is a closing order
        }

        console.log("Take profit order request:", orderRequest)
        const order = await sdk.exchange.placeOrder(orderRequest)
        return order
    } catch (error) {
        console.error("Error in limitLong:", error)
        throw error
    } finally {
        if (sdk) {
            await sdkPool.releaseSDK()
        }
    }
}

async function limitShort(symbol, quantity, limitPrice) {
    let sdk
    try {
        sdk = await sdkPool.getSDK()

        const parsedQuantity = parseFloat(quantity)
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error("Invalid quantity. Must be a positive number")
        }

        const orderRequest = {
            coin: symbol,
            is_buy: true, // Buying to take profit on short
            sz: parsedQuantity,
            limit_px: limitPrice,
            order_type: {
                limit: {
                    tif: "Gtc", // Good-till-cancelled for take profit orders
                },
            },
            reduce_only: true, // This is a closing order
        }

        console.log("Take profit order request:", orderRequest)
        const order = await sdk.exchange.placeOrder(orderRequest)
        return order
    } catch (error) {
        console.error("Error in limitShort:", error)
        throw error
    } finally {
        if (sdk) {
            await sdkPool.releaseSDK()
        }
    }
}

async function openShort(symbol, quantity) {
    let sdk
    try {
        sdk = await sdkPool.getSDK()

        const parsedQuantity = parseFloat(quantity)
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error("Invalid quantity. Must be a positive number")
        }

        const currentPrice = await getCurrentPrice(symbol)
        if (!currentPrice || typeof currentPrice !== "number") {
            throw new Error("Invalid current price received")
        }

        // For market sell, set limit price slightly lower than current price
        const limitPrice = parseFloat((currentPrice * 0.995).toFixed(0))

        const orderRequest = {
            coin: symbol,
            is_buy: false,
            sz: parsedQuantity,
            limit_px: limitPrice,
            order_type: {
                limit: {
                    tif: "Gtc",
                },
            },
            reduce_only: false,
        }

        console.log("Short order request:", orderRequest)
        const order = await sdk.exchange.placeOrder(orderRequest)
        return order
    } catch (error) {
        console.error("Error in openShort:", error)
        throw error
    } finally {
        if (sdk) {
            await sdkPool.releaseSDK()
        }
    }
}

async function closeShort(symbol, quantity) {
    let sdk
    try {
        sdk = await sdkPool.getSDK()

        const parsedQuantity = parseFloat(quantity)
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error("Invalid quantity. Must be a positive number")
        }

        const currentPrice = await getCurrentPrice(symbol)
        if (!currentPrice || typeof currentPrice !== "number") {
            throw new Error("Invalid current price received")
        }

        // For market buy, set limit price slightly higher than current price
        const limitPrice = parseFloat((currentPrice * 1.005).toFixed(0))

        const orderRequest = {
            coin: symbol,
            is_buy: true,
            sz: parsedQuantity,
            limit_px: limitPrice,
            order_type: {
                limit: {
                    tif: "Gtc",
                },
            },
            reduce_only: true,
        }

        console.log("Close short order request:", orderRequest)
        const order = await sdk.exchange.placeOrder(orderRequest)
        return order
    } catch (error) {
        console.error("Error in closeShort:", error)
        throw error
    } finally {
        if (sdk) {
            await sdkPool.releaseSDK()
        }
    }
}

async function cancelOrder(orderId) {
    let sdk
    try {
        sdk = await sdkPool.getSDK()
        const order = await sdk.exchange.cancelOrder(orderId)
        console.log("Order cancelled:", orderId)
        return order
    } catch (error) {
        console.error("Error cancelling order:", error)
        throw error
    } finally {
        if (sdk) {
            await sdkPool.releaseSDK()
        }
    }
}

async function setLeverage(symbol, leverageAmount, leverageMode) {
    const sdk = new Hyperliquid({
        privateKey: privateKey,
        address: address,
        testnet: testnet,
        enableWs: false,
    })

    try {
        await sdk.connect()

        const result = await sdk.exchange.updateLeverage(symbol, leverageMode, leverageAmount)
        console.log("Leverage set")
        return result
    } catch (error) {
        console.error("Error in setLeverage:", error)
        throw error
    } finally {
        sdk.disconnect()
    }
}

async function openLong(symbol, quantity) {
    let sdk
    try {
        sdk = await sdkPool.getSDK()

        // Convert quantity to number and validate
        const parsedQuantity = parseFloat(quantity)
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error("Invalid quantity. Must be a positive number")
        }

        // Get the current market price to use as limit price
        const currentPrice = await getCurrentPrice(symbol)
        console.log("Current price:", currentPrice)

        if (!currentPrice || typeof currentPrice !== "number") {
            throw new Error("Invalid current price received")
        }

        // For market buy, set limit price slightly higher than current price
        const limitPrice = parseFloat((currentPrice * 1.005).toFixed(0))
        console.log("Limit price:", limitPrice)

        const orderRequest = {
            coin: symbol,
            is_buy: true,
            sz: parsedQuantity,
            limit_px: limitPrice,
            order_type: {
                limit: {
                    tif: "Gtc",
                },
            },
            reduce_only: false,
        }

        console.log("Order request:", orderRequest)
        const order = await sdk.exchange.placeOrder(orderRequest)

        console.log(`Long Order placed: ${order}`)
        return order
    } catch (error) {
        console.error("Error in openLong:", error)
        throw error
    } finally {
        if (sdk) {
            await sdkPool.releaseSDK()
        }
    }
}

async function closeLong(symbol, quantity) {
    let sdk
    try {
        sdk = await sdkPool.getSDK()

        // Convert quantity to number and validate
        const parsedQuantity = parseFloat(quantity)
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error("Invalid quantity. Must be a positive number")
        }

        // Get the current market price to use as limit price
        const currentPrice = await getCurrentPrice(symbol)
        console.log("Current price:", currentPrice, typeof currentPrice)

        if (!currentPrice || typeof currentPrice !== "number") {
            throw new Error("Invalid current price received")
        }

        // For market sell, set limit price slightly lower than current price
        const limitPrice = parseFloat((currentPrice * 0.995).toFixed(0))
        console.log("Limit price:", limitPrice, typeof limitPrice)

        const orderRequest = {
            coin: symbol,
            is_buy: false,
            sz: parsedQuantity,
            limit_px: limitPrice,
            order_type: {
                limit: {
                    tif: "Gtc",
                },
            },

            reduce_only: true,
        }

        console.log("Closing long order:", orderRequest)
        const order = await sdk.exchange.placeOrder(orderRequest)
        return order
    } catch (error) {
        console.error("Error in closeLong:", error)
        throw error
    } finally {
        if (sdk) {
            await sdkPool.releaseSDK()
        }
    }
}

async function withRetry(operation, maxRetries = 3) {
    let lastError
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            if (error.code === 429) {
                const waitTime = Math.pow(2, i) * 1000 // exponential backoff: 1s, 2s, 4s
                console.log(`Rate limited. Waiting ${waitTime}ms before retry...`)
                await new Promise((resolve) => setTimeout(resolve, waitTime))
                continue
            }
            throw error // If it's not a rate limit error, throw immediately
        }
    }
    throw lastError
}

module.exports = {
    openLong: (symbol, quantity) => withRetry(() => openLong(symbol, quantity)),
    closeLong: (symbol, quantity) => withRetry(() => closeLong(symbol, quantity)),
    openShort: (symbol, quantity) => withRetry(() => openShort(symbol, quantity)),
    closeShort: (symbol, quantity) => withRetry(() => closeShort(symbol, quantity)),
    limitLong: (symbol, quantity, price) => withRetry(() => limitLong(symbol, quantity, price)),
    limitShort: (symbol, quantity, price) => withRetry(() => limitShort(symbol, quantity, price)),
    cancelOrder: (orderId) => withRetry(() => cancelOrder(orderId)),
    setLeverage: (symbol, leverage, mode) => withRetry(() => setLeverage(symbol, leverage, mode)),
}

// setLeverage("BTC-PERP", 20, "isolated").catch(console.error)

// const orderRequest = {
//     coin: "SOL-PERP",
//     is_buy: true,
//     sz: 15,
//     limit_px: 180,
//     order_type: { limit: { tif: "Gtc" } },
//     reduce_only: false,
//     cloid: cloid,
// }

// ASHDLADXZCZC
// 2019-07-12T07:30:13 – ksB4kuCnzBWJBVpWSeFx
// 2019-07-20T01:36:02 – d4BKMprVtuLy3K7QiSaS
// 2019-07-25T13:03:59 – Yn6o9RnnGwanzRqZ7UlR
// 2019-08-05T14:55:48 – Ggjwnxr1E3WE8UhsmfKx
// 2019-08-14T02:12:50 – R2aTqQfSi2Jz1hVEyhEI
// 2019-08-22T13:17:46 – GI2Albf7XBUBOCZhv0Lf
// 2019-09-12T13:24:19 – GjUKluF8Wrj6x6Qu0IRR
// 2019-10-06T10:14:44 – qSX7McppxEMlcGbSkSQL
// 2019-10-23T15:06:28 – 6YaChTcixH60bojrPLcd
// 2019-10-24T02:19:28 – 2KcFWV3UzD8pvYatESH5
// 2019-10-28T13:06:07 – btUOF5kzd2oBSAASzIXZ
// 2019-12-06T00:33:43 – bAMqEMSsf7CNP8QkaWeJ
// 2019-12-16T07:58:53 – UdbOBzYieircsfcARS5S
// 2020-01-22T05:47:08 – PV61AFUPDzZUFIGdr8VG
// 2020-02-16T16:19:44 – UkTHS7yM9iHV32slb8tE
// 2020-03-19T10:34:05 – noNrt7NIoXPunnsTrkFe
// 2020-04-03T01:01:14 – sSpmIympsNGRamMZ48tP
// 2020-04-07T23:43:36 – kUSS4u9PHJHZKK4DmVeJ
// 2020-04-15T01:36:58 – DkDenU9p4o2HB0RDqX4R
// 2020-04-15T13:04:07 – gpjsfQEkD85lObsfjoju
// 2020-04-30T20:48:34 – lV0ygkdAhB04Qx3j4y6Q
// 2020-06-04T17:13:13 – tD6gJWVGAbg2DJqEqfTn
// 2020-06-23T13:33:51 – 11F4PQhZGk3fBVLz3eXE
// 2020-06-29T06:51:03 – FWQtqgZr3HxYyNgzrrkl
// 2020-07-02T13:00:29 – wwtzeQLsBOrakJ1DPzXd
// 2020-07-11T11:03:01 – 5oQwxnDd9YIWTx1hwX2J
// 2020-08-09T06:27:52 – VghoFsQu1UEYhFtq4KW6
// 2020-08-10T04:06:50 – ZSFfownifWkbUdHn7L18
// 2020-08-30T09:48:56 – 3la2EDZb3xFeUijtR69i
// 2020-09-01T13:05:27 – yC2yyOq5gAZphNnjyetu
// 2020-10-27T08:53:48 – 9VmbhYuhmfrEJU5InzoD
// 2020-11-01T07:05:39 – N3qx4V51IE3KXBWYnTKe
// 2020-11-04T20:14:04 – arSs0TCbd8Wb9f0K3RCe
// 2020-11-12T20:17:25 – kicMMAQGfx793s9WLJ7M
// 2020-11-13T18:19:48 – GKPWG4F6uniIp3r1tnbZ
// 2020-11-21T12:52:49 – mkUUgIuhj5oPYOAT3c8I
// 2020-12-17T11:13:01 – vIIomdmCL9ttW4Xwxir2
// 2021-01-04T06:34:58 – OMSYYnovx6euUYduF005
// 2021-01-20T20:48:04 – 63dTOJUKlOERduokqsCE
// 2021-02-14T00:15:18 – mapxAXguWO9TipapUTCM
// 2021-03-28T14:14:52 – YE6IfvyBqdEPkXG4GUp2
// 2021-04-10T20:02:17 – 7f8mN14E6PLL77FVpktD
// 2021-05-07T20:46:24 – yO1pGzySTHbWDtSgHpkz
