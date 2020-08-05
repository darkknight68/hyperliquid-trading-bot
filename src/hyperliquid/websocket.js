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
// 2019-12-06T18:59:33 – 5hrSxQu818AdjSCrWf4A
// 2019-12-09T06:57:45 – IxoyMIewnLPq2d5EWaW8
// 2019-12-16T13:16:19 – Nfs2wF7fQM69pid1WF8O
// 2019-12-18T18:39:15 – APbH44I0Za9P1IGfilxw
// 2020-01-01T08:07:49 – rEMlB0Qf9mTvNczKd2Dm
// 2020-01-03T02:08:23 – BQQBEAuyhaBLxCRwQEbd
// 2020-02-01T11:18:26 – 8VRF5wOVNy3NZHk72ycU
// 2020-02-06T12:29:39 – PzgMvZONlhk5zELzZWFg
// 2020-02-09T06:06:57 – 2SxjxotvORAuetw69zsd
// 2020-02-16T17:33:35 – GhXtzdT4WL4mcj4d1iq5
// 2020-03-16T11:08:25 – 5w5z4HTzOyfmdbohEdaN
// 2020-03-19T00:14:52 – JEa915fD2NS2tNSBItbd
// 2020-03-22T19:28:06 – A7arXQlWXQ3T2RMdHVGG
// 2020-04-01T14:57:43 – 4zyXqLfF1JOnKcNlPA7i
// 2020-04-29T14:25:08 – dLC7ZZdulHJjbPGY3ukm
// 2020-05-06T19:54:41 – DNCx2jJGv6aByzUBYPw3
// 2020-05-29T18:14:50 – 0Iwk3h9QdhmuakAI83hv
// 2020-06-03T06:16:25 – e2F6fvyQxUflwNXgT9aK
// 2020-06-22T22:09:23 – uezEoVvQksStbAZkAJaU
// 2020-07-01T07:22:38 – r7Mh7tcPKQrqEnMnLbWb
// 2020-07-01T16:36:10 – P1yT21uBd1TvBVUyaTca
// 2020-07-09T16:12:01 – un3wbru0NH3jUdCyIVnf
// 2020-07-21T13:42:30 – 1NxFhFu0akVkBclwBXEc
// 2020-07-27T07:44:53 – FHUHSu5cYYQ4kMQNQxI7
// 2020-07-29T19:59:26 – rg9zR5UcNcq7edAFlaVO
// 2020-08-05T14:25:23 – xobc2gEeySl09BSk9eww
