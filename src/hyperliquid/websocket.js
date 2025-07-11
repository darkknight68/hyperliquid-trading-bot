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
// 2020-08-10T14:05:12 – PuL9oSW4bCVdmzv4FqHZ
// 2020-08-16T20:24:03 – zYC0SK0mc0aphCmUMQMj
// 2020-09-20T06:57:58 – AXiAmidOqiKiwECwJuex
// 2020-09-25T04:43:23 – Y3fQBph9ni7ztPBaQUIJ
// 2020-09-25T16:18:23 – PUCjUeEd0vFiHecrnHYz
// 2020-10-01T16:44:32 – SwnH6qtDj0gVc4IKwfkb
// 2020-10-07T05:44:42 – nKRpQZtg6ArFyhTbbZ1l
// 2020-10-17T17:00:43 – sy3FOGX8OOtS0x1l1QFm
// 2020-11-20T19:21:12 – vD3zGacdOm3vN5L4aFcG
// 2020-12-15T08:37:14 – PmgXqvXJQxk2d4xnvB4d
// 2020-12-20T18:30:56 – m1j5z1MeJ3ueQvSZCQrJ
// 2020-12-24T17:30:50 – n605CcLN5cl6q215rZqv
// 2020-12-30T06:56:14 – TdS1p1eH4QYqIIQHGcv1
// 2021-02-18T09:03:30 – H3MTVGpsbM7A9F3Ro0l4
// 2021-03-03T10:07:45 – yBoHWEIJB3smeO0cFfJV
// 2021-03-07T09:40:18 – mMuyti72p4zupm5U6Lh5
// 2021-03-11T06:40:12 – czYZlYB4IvKiLi1vtXdQ
// 2021-03-25T20:21:45 – 3XJd5fJxxMesAaxOhxJh
// 2021-04-04T02:19:55 – uIAelmG3OXW9b3uz4pBg
// 2021-04-13T06:00:52 – Ibgj7qF1LV6rROzs9Ejq
// 2021-04-23T11:29:12 – NUKP4Rwpx3rZFEWkiIcN
// 2021-04-25T06:08:05 – OHN8r2s2gYm6Kf562M3S
// 2021-05-14T22:00:03 – EBHOzVEDnWkdTkzg88uA
// 2021-05-31T06:28:26 – T86tgItCmQYJgs2uqV8e
// 2021-06-16T21:14:36 – 7AClV8hIeKmkT2ii5TMw
// 2021-07-08T05:32:29 – rbHOJBBj6Cp50CRCR169
// 2021-07-20T12:03:32 – 0WJcCMD7Png7hzLwqCwF
// 2021-07-21T15:44:09 – Lk0lbQ9BJ4caOh77uoOj
// 2021-07-28T14:58:26 – 6jtyybbbCXc2QKzdr38G
// 2021-08-03T01:10:18 – KtJkWw6YLcZzVQvuLzLM
// 2021-08-05T21:12:07 – XhmcN64rLxYUM4NFj7QY
// 2021-08-25T06:26:41 – PNNVYqsUyXd8oS9X0Rc0
// 2021-08-27T19:57:26 – HxGeporwDy6LRO6T2Gxh
// 2021-08-29T07:31:21 – dAEfuysD0XPTjz4C4hDe
// 2021-09-01T16:29:02 – nK1eO8VmPtEV3SgeJPTn
// 2021-09-12T07:52:12 – AEXyVvd6iLwN2SSdSPb2
// 2021-09-16T05:55:57 – xdwFHRA6sn4tWNxxhmy6
// 2021-09-24T20:45:17 – jbWfizDW4dRft3uNrKDo
// 2021-10-03T18:25:16 – GJUtOb5GBGQOhUJB1o75
// 2021-10-19T00:10:56 – 9Q1INZtBhX3SljKAaHIH
// 2021-10-30T18:05:21 – BUqcdOcKPJYT6PBGu7Ug
// 2021-11-11T12:46:06 – uaWhr7RAy36q1cogw5Ol
// 2021-11-12T23:03:06 – 5YoKTFhqdX6Demfz5i8P
// 2021-11-27T18:48:04 – 1fCPBhhcYdbRIO1E9TKH
// 2021-12-20T02:52:13 – sxcoLkYHYht3mHH3lvAR
// 2022-01-05T12:25:43 – KiLgZLpvH0Y2og6CqBbH
// 2022-01-23T09:03:33 – wcWd7UekKEjmNCiGfqd3
// 2022-02-15T16:44:43 – sHea2JeubjFY38LiNTvS
// 2022-02-16T12:54:38 – SqDzzGwSt8rXRhl0iqBx
// 2022-03-18T09:25:07 – luXKxSiqluryYb3KC99r
// 2022-04-07T20:36:26 – IdTaDT96tqSywMwIDTwX
// 2022-04-09T14:42:07 – keaXdXdqwX1vwASG375n
// 2022-04-21T06:59:48 – y4FQ4d4G38ZDKv2cmre8
// 2022-04-22T07:53:08 – ur5Gcp3jtGdYi3wAa9Nz
// 2022-05-01T09:34:07 – a92DVT5spfcr6UfxhKyW
// 2022-05-01T19:31:37 – nTN8RSzZkKXFvTQtiKMH
// 2022-05-22T16:59:50 – E2PQIRD2goo7LNwhuMwl
// 2022-05-28T05:19:28 – UwvWOO3LPM3AybNvTqbZ
// 2022-05-30T13:31:11 – 3VYfDmHvcEhx9AvSDmNr
// 2022-06-06T15:33:23 – xn1kT733bvfQZvahx5kg
// 2022-06-08T12:25:42 – Z8RmQVl8j0wvw1BoxR2W
// 2022-06-27T02:53:14 – GBff1iJOwoSGAFZ7hcWA
// 2022-09-22T01:36:08 – nQpRDHL5LmSoftHzrVUM
// 2022-10-04T08:50:42 – ETSJWz5EcSgEWeKZRKQ6
// 2022-10-20T16:04:03 – UovYY6jjPWhNSCxefMPE
// 2022-11-15T00:21:08 – W4oWmubyZsHPDSP00gWm
// 2022-11-27T01:23:39 – AupHzYOVe1rCdFM8OrEK
// 2022-12-11T15:40:30 – xyoUH0XoVOfTDk6wVqjP
// 2022-12-13T07:39:08 – rE3JHQl3XhZtGPEAecJf
// 2022-12-16T21:51:44 – dFjemNFOmfB1gGXrtjRe
// 2022-12-28T22:25:34 – CAZvjvL1ZELIaxmtG5k1
// 2023-01-03T05:49:41 – wVxRE3ERSaPmuUpp76Oq
// 2023-01-24T02:11:03 – oetIuD8U4Pjq9BHfYSho
// 2023-02-18T16:44:39 – nHjtoWxyagATgBd7LjRu
// 2023-03-10T07:14:05 – tlCZwxeB7URgt8FuqofD
// 2023-03-22T20:32:47 – 3Ua0CzOWGIIE5o9MBY6d
// 2023-03-28T05:11:22 – 0E8Ho4Lj0cuWk0B2qnWp
// 2023-04-06T08:37:49 – Q1kFVJUvKKoeEov60CnM
// 2023-04-13T20:46:33 – 51O3TI44b5nVJmPFqzfZ
// 2023-04-13T22:48:11 – Pvo9favX0DwMbNHprfU5
// 2023-05-23T18:00:27 – f5ofGtfQnAmWbADk83bM
// 2023-06-16T18:42:21 – FYAmxcbRUrFV2VQQ4dPa
// 2023-06-30T00:22:19 – ZbTJbGaEQ6qyog3dO1hT
// 2023-07-08T00:41:41 – qB9Bu1wsZPEKS4yvnhyc
// 2023-07-13T01:37:15 – cDsAB78kYmtZt5pj8Wp8
// 2023-07-15T16:25:51 – tOISyGZNPSy0AcbYwGeF
// 2023-08-26T04:26:39 – jSqsKpNn7Az0hdGxoulU
// 2023-08-28T12:44:01 – PckiznXDqb7QnpxcDbCY
// 2023-08-28T20:33:03 – WIp3Udf9B1PcsnpHhMCk
// 2023-09-17T14:59:49 – 65cdipsbG48FfVa6MY22
// 2023-10-06T01:40:15 – beWBUUO50BfcdMdVBh7T
// 2023-10-27T01:56:39 – jdmtAEsGE5FdaZf3bv26
// 2023-10-28T03:42:26 – 2HWOChE9JmGuM2wbTBWs
// 2023-12-06T02:37:49 – zN7OHZ59MkY7l2Vfvp07
// 2023-12-10T01:20:27 – k2yY8ViLtYDHSG0L0Kvy
// 2023-12-20T16:10:34 – zAGJCgHLz1QL2eRno87n
// 2024-01-16T23:32:22 – CO03xIMmRLV0gTsKfRlI
// 2024-01-17T23:38:58 – pRGlIohq0KYG3ej4kx6Q
// 2024-01-24T17:16:23 – XdcjxY3Flyu26uzmPvhN
// 2024-01-30T07:15:11 – SKR0gPgPPbNsQIPK1qPE
// 2024-02-03T14:13:39 – MBZJnj1J1I2ikS7Z8lVc
// 2024-02-05T23:38:16 – lnztdM8IxUxS7Zme5boK
// 2024-02-09T11:19:56 – c0rf2MIhbbtMMAorEq9s
// 2024-02-14T23:01:36 – o0KcUiqYuP0yyXkWphzL
// 2024-02-22T13:54:16 – LwYRE2loVnye5tqPU9Ta
// 2024-03-09T17:07:57 – UcCDl2WY8NQgnunA5zP0
// 2024-03-24T12:04:13 – CJlzBvqHZcx5yvsdLyla
// 2024-03-28T01:53:27 – Vc2JMAl1cxhF5k2HJI6C
// 2024-04-19T07:16:36 – Vs6mwGmsvGW3zq2KarTF
// 2024-05-20T09:47:10 – 63eZJAIOcSsvIfIPSOCd
// 2024-05-24T15:40:49 – j8LqGiPQk8nxXpUSLn5N
// 2024-06-01T07:59:15 – W0icNLJbSHCwAtmbSgrb
// 2024-06-04T04:19:21 – UsiLZNRM2536rNiNR47G
// 2024-06-18T07:27:27 – Pmoff7ZSU1PCPhrT59rN
// 2024-06-22T22:04:08 – Z1pV3m2hc2C8EkpuYt1U
// 2024-06-28T08:00:55 – 8rA7ZdISVJ7WTs1N0jzM
// 2024-07-01T22:51:43 – uiPgI4XIGgvMoiYx9F4o
// 2024-07-14T05:04:16 – Ynj535gPOFaJ7b2YSb1C
// 2024-08-22T04:26:04 – hOpZvLPkVMrNmfzf7ETb
// 2024-08-23T11:30:09 – nk4JrlgwQmeOsoXkxsJn
// 2024-09-11T06:14:24 – ol3aEIo5y1q5XjklKdpr
// 2024-10-11T11:46:46 – WJ4lpUCTAZ2m3Y439wrd
// 2024-10-23T17:00:54 – kof8MZTbSSuj1gvenIy6
// 2024-11-04T20:19:00 – tpaBI3GlfwwbNcM0Xo2l
// 2024-11-10T16:22:58 – DT9qbqhBBzEBAnTLfxNP
// 2024-11-26T20:07:40 – qIDc2W7KAJTlinUFGGL2
// 2024-12-12T05:10:23 – moAUHx5er4iuWge6xbjp
// 2024-12-15T04:50:28 – jZaiWWb8rc879OxDfn9l
// 2024-12-21T02:01:46 – bIyUp6XBd98HmD2ATX92
// 2024-12-22T09:10:36 – J5SkmORGHb24BXDdKT4b
// 2025-01-15T08:24:51 – AZeOhS0zyTrUnxJb341j
// 2025-01-15T13:46:06 – SLiXwlT5ADUGkU4lf5w6
// 2025-01-17T18:11:53 – LYnduEC8jzM9o2CTddYF
// 2025-01-25T18:02:48 – fpvse8OZFYgqjBxRL1Nz
// 2025-01-29T22:05:27 – LVIfg3dzv51fcnbiGGcR
// 2025-02-04T04:58:28 – bJNBQtMNbI2uxUU4ST9N
// 2025-02-04T18:27:39 – UPwIc5nu1jbnk74wG2jN
// 2025-02-12T14:52:22 – aHdwWinfTgBgWMwBpzyz
// 2025-03-11T19:52:33 – JiyjWXLrKa8kQo1UCNlt
// 2025-03-16T02:03:26 – II0M5ckY9YY5wzy2YmH4
// 2025-03-16T15:50:30 – eKph1LkRbomyo16vDyqu
// 2025-04-05T15:44:43 – atN2rrk6vOYIMiswhsuZ
// 2025-04-07T15:33:24 – fOEbkBBZGoGWOrOvsRgb
// 2025-04-14T20:10:32 – CkCrXBRyGRTTU1JkdrDd
// 2025-04-18T16:29:24 – ipcbeoksRnxO4jzPnwT9
// 2025-05-26T11:24:15 – OZ8NK8XDxdVGksmcZZHe
// 2025-06-14T22:31:15 – bcwlmlh8jBKCUXUnsbqf
// 2025-07-07T15:25:01 – CnlLO176oDqWAbbstQTz
// 2025-07-09T01:26:50 – sgkwpTgfWwWtETkOBhZj
