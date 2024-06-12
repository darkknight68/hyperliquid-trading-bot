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
// 2021-06-01T15:15:50 – VMRfymeiqsFDmoSqssWv
// 2021-06-17T16:56:08 – 4Zj08Dbxwmd9C3i5E4Kc
// 2021-06-19T12:56:30 – 64VBasAjpnuqlV2vp1m0
// 2021-06-23T03:51:45 – GLXXL9dKNqmUscgoJhal
// 2021-06-24T02:20:38 – a8IQdjwXvSmxDXumAPwO
// 2021-07-05T18:04:47 – hbw7VJdgzFqPw3qWmQ1p
// 2021-07-20T02:56:00 – IzL8XAbkAXYjF9wpy0cc
// 2021-07-21T16:28:18 – EtKWZkPxCBlA2umuvMYO
// 2021-07-22T04:53:59 – nWcjO0VbXfX4NTssAyYb
// 2021-08-07T01:20:12 – XUPIdLihWmae9C2Q99NN
// 2021-08-07T16:42:48 – ke0panvF6o1yadJF63tz
// 2021-08-17T07:43:25 – QlZ6tcrrEsQq7EAj7nkK
// 2021-09-28T19:15:20 – xTdH9QyifzdofftFdVsR
// 2021-10-15T07:52:58 – MDh8snsMuGTRHQhKUWSl
// 2021-10-25T21:22:37 – beuHasA3Qol7CTUH1faa
// 2021-10-29T14:51:37 – d63hXa28xfkehAUlXXsz
// 2021-10-31T05:37:18 – epvKwnzvNWVMTAdUz0Ww
// 2021-11-09T06:13:33 – ctev80xe5YsGBcGg2d3n
// 2021-11-10T23:39:54 – OGwf4UCJ6xAdzrgjxCtt
// 2021-11-17T16:26:25 – HjUFuv08UVcQcYRf1ETJ
// 2021-12-07T08:00:43 – 54LaBDJAQM63MsHnyem5
// 2022-01-14T00:06:17 – ZTWJynwNioh3B0YCYo6s
// 2022-01-31T18:29:59 – 0PP1U1VjL3Mis1mkoBkw
// 2022-03-16T11:39:21 – k0As1mhDLI9hfjmqPyjD
// 2022-06-01T20:28:16 – Si2o2kmpYyaZ5OyFhKWE
// 2022-06-21T20:24:24 – 9oGARZZwvIomS9CdXpDk
// 2022-06-23T00:36:51 – wMcgDXjWIQFMUTHxm7yY
// 2022-07-11T00:47:21 – UzKnmCklw9W4rIqQrcsW
// 2022-08-15T23:06:52 – LKnNRgkcFgCGiUm9vND4
// 2022-09-05T11:43:13 – zBNpLJIVgyrrLDa969dP
// 2022-09-20T14:23:13 – wFenpz98nqlBRcarJXQS
// 2022-10-17T00:20:44 – JC683s8B2mwiC4gVrXnB
// 2022-10-17T21:08:52 – C6gCqb8WcpUqOR3eDj36
// 2022-11-17T22:21:10 – c3AVoIx3tRbYjzW3Ltmf
// 2022-11-20T10:55:12 – vj4MK0ms5cfu440n4xnI
// 2022-12-20T19:11:12 – 0DAuFqly66xa4gC2SULf
// 2022-12-25T12:23:32 – 5VMCZZrLqZajCIXYQiJm
// 2023-01-08T03:15:13 – I0IkCnbJZGSY7flXBpYe
// 2023-01-23T09:50:26 – rmKfNzIsOhCRcE1MWFAE
// 2023-01-28T05:00:45 – vs19Pi3kdCOQTFSmDbjZ
// 2023-02-20T18:48:41 – ftv8dOY3GHA0WUTeVU06
// 2023-03-02T15:52:01 – V4jGRMxp4T5FCx24NqFb
// 2023-03-24T13:59:47 – ne0OkuA1880DMAoJKHFc
// 2023-03-26T01:42:41 – dXzwSf5cKQR67dNaWutw
// 2023-03-26T12:16:50 – D7o6P2go2RjvVF5bPV3B
// 2023-04-13T20:10:51 – BhcNd2rLtiKSiTeH1EyQ
// 2023-04-18T09:54:14 – 6DgWRxXCWFRW5ty55CBT
// 2023-04-27T14:03:31 – Owim4vnp7ae9HFvsydMj
// 2023-05-04T11:16:57 – LpavfIt663BpwquJpDTP
// 2023-05-08T00:05:43 – vIc5WH4Xqvun8bM2aqKb
// 2023-05-31T16:08:18 – 6FiC0z9x6zFBrlBPNFtw
// 2023-07-10T08:13:45 – ar7NOZ0NXbHdoHusK6Xv
// 2023-07-17T07:24:39 – PEHOQA1tvvNelcVcCUYz
// 2023-07-19T12:03:55 – glpIOUKtlFNPsXxT1EQE
// 2023-07-20T23:22:45 – dTScbXwWK6bTorC9pNl5
// 2023-07-21T20:46:25 – 5h3iDfgNQNii27mRQ5pI
// 2023-07-28T06:57:27 – UgiTWNqZUZcATk2a8djZ
// 2023-08-03T06:02:11 – 0BEjMM65CRR40KUIIB0l
// 2023-09-22T08:10:06 – XcN9MRxbsUOLKJJ6T0kb
// 2023-10-02T18:12:24 – xlMnG2HIJgSWkCsIh3iu
// 2023-10-17T17:55:43 – Suc5LAicffBuinQjkaz8
// 2023-10-31T14:02:05 – Dp1XLp3qIeRcAWZMeVAx
// 2023-11-10T02:49:02 – I8iCbJKGliZSj3KFs9mW
// 2023-11-11T14:56:53 – 5Gw6Er2HqAZdI45l0aAg
// 2023-11-13T05:16:36 – WoMn6iK0hLFnMphdaFMh
// 2023-11-18T05:55:16 – 5z2Ngw4FKvM2d2coF141
// 2023-11-20T10:45:15 – 9TuwzseEl3WnhSJrTix7
// 2023-12-10T10:06:48 – yMuVMs0nULcIyX6Wc9Np
// 2023-12-11T07:15:27 – mkywIoRDhAxvW6GFZz1A
// 2024-01-15T01:13:58 – 1XgQRhARYJxxHvIyIsMu
// 2024-02-11T03:23:42 – nCjr6ZX6D9b2Upg1ZtP4
// 2024-02-14T04:41:20 – BzW5Yc9X6kEShU2JzHK3
// 2024-02-27T12:22:05 – ebV3pbZGtdCihlGkFMSD
// 2024-04-18T16:38:41 – DZyDbzBARlhCjbbKrVI7
// 2024-05-04T17:16:13 – jkznPGebqQzRPsAtiBnr
// 2024-05-17T19:35:07 – E454rReixU9ci0uAUCzE
// 2024-05-26T02:01:44 – mOSyLqt7XtJhpNRIQVz3
// 2024-06-12T05:02:38 – 0QfhKpgkeRCP4DGuXtsb
