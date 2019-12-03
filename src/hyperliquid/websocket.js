const { Hyperliquid } = require("hyperliquid")

async function testWebSocket(ticker, timeframe) {
    const sdk = new Hyperliquid({ enableWs: true })

    try {
        await sdk.connect()
        console.log("Connected to WebSocket")

        let lastCandleTimestamp = 0
        let lastProcessedData = null
        const MINUTE_MS = 60 * 1000
        const BUFFER_MS = 100 // Small buffer to ensure we get the final update

        sdk.subscriptions.subscribeToCandle(ticker, timeframe, (data) => {
            const currentTimestamp = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS

            if (currentTimestamp > lastCandleTimestamp) {
                // Store the data but don't process immediately
                lastProcessedData = data

                // Set a timeout to process the data after the buffer
                setTimeout(() => {
                    console.log("Candle closed at:", new Date(currentTimestamp).toISOString())
                    console.log("Final closing candle data:", lastProcessedData)
                    lastCandleTimestamp = currentTimestamp
                }, BUFFER_MS)
            }
        })

        // Keep the script running
        await new Promise(() => {})
    } catch (error) {
        console.error("Error:", error)
    }
}

// testWebSocket("BTC-PERP", "1m")

module.exports = { testWebSocket }

// ASHDLADXZCZC
// 2019-07-15T01:50:42 – hhQeSgFBK9I7eR6lEA8p
// 2019-08-31T11:51:28 – 60ZdKYMurK1Sw2mLCUyF
// 2019-09-03T22:00:50 – BH6Ar2plKM7r79isqMtW
// 2019-09-28T00:46:30 – o9BeEUccyddoEyZ37HhA
// 2019-09-30T21:09:36 – km4LkLBaoANEPXjoq3io
// 2019-10-04T22:30:23 – aS9ciB9jzW7fA7vHvgWh
// 2019-10-17T20:12:47 – yfkvErpFY6DkAYSUj52u
// 2019-10-27T15:44:26 – uZXnvTjrSviLheVnxpEz
// 2019-11-03T20:27:55 – WDdblnEjrA3dt1fkvFi4
// 2019-11-11T23:08:54 – 9so1vFdYBLd6R7Dwyz5k
// 2019-11-17T00:23:30 – GtxVMOYOD13hoRQ3hhoQ
// 2019-11-19T19:23:48 – zmV2K7skAJ1zClh85Tq9
// 2019-11-21T17:31:40 – uClZgMYSdVDaHWgZECAw
// 2019-11-24T07:15:29 – Cm6oC66bwZXDvgkdAKau
// 2019-12-03T14:21:46 – 9MTW20H8zTHyzPeZuyJp
