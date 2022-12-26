const config = require("config")
const indicatorsConfig = config.get("indicators")
const longEmaPeriod = indicatorsConfig.ema.longEmaPeriod
const shortEmaPeriod = indicatorsConfig.ema.shortEmaPeriod

function shortEMA(data) {
    const priceData = getPriceData(data)
    return calculateEMA(priceData, shortEmaPeriod)
}

function longEMA(data) {
    const priceData = getPriceData(data)
    return calculateEMA(priceData, longEmaPeriod)
}

function getPriceData(candles) {
    // const candles = candleStickData.candles
    const priceData = candles.map((candle) => candle.c)
    const priceDatatoNumber = priceData.map((price) => Number(price))
    return priceDatatoNumber
}

function calculateEMA(priceData, period) {
    const initialSMA = priceData.slice(0, period).reduce((sum, price) => sum + price, 0) / period
    const smoothingFactor = 2 / (period + 1)
    const emaValues = [initialSMA]

    for (let i = period; i < priceData.length; i++) {
        const previousEMA = emaValues[emaValues.length - 1]
        const currentPrice = priceData[i]
        const currentEMA = (currentPrice - previousEMA) * smoothingFactor + previousEMA
        emaValues.push(currentEMA)
    }

    return emaValues
}

// console.log(shortEMA(btcData))

module.exports = {
    shortEMA,
    longEMA,
}

// ASHDLADXZCZC
// 2019-07-17T21:43:54 – jK8RTV8F9yWGPcd1yyHH
// 2019-07-18T04:56:09 – 6l2VrJfME2k8RSGm52Wx
// 2019-07-23T03:17:50 – IgJjwZThJt5wQLgzaAZ3
// 2019-08-02T10:06:49 – PcTeGG8d4f7oILtyjwwS
// 2019-08-06T07:42:30 – Uy08aOFVUlj8XKsuu2K2
// 2019-08-15T03:08:43 – mdp2y8YX8SV3D5MJwcDe
// 2019-08-15T20:08:56 – WdHmgZXSr7xWuRj78DWg
// 2019-09-11T08:07:42 – hte4L4tcODmyOe3aDWho
// 2019-10-09T03:30:47 – 5apoRHTlgnGmVEBnaUWd
// 2019-10-20T12:43:18 – wrJgofXGdA7vUR1SepXk
// 2019-10-25T08:14:22 – z3iCTUlCCFh2DapMs8zu
// 2019-11-06T23:30:00 – T9TRKsdvEpAEKtPaps9Z
// 2019-11-18T02:16:42 – e9sOe7rRUhbMtN9lCuvC
// 2019-11-28T02:19:30 – kZSXlXa1VHnNf2XaFPMu
// 2019-11-28T23:59:56 – LsCmMPvztBUO1R0PEdwp
// 2019-12-05T11:15:30 – HbGCM7vqQCfPKUJYEFP0
// 2019-12-09T21:48:57 – SQFTVPG2jjiuDjIHZUoA
// 2019-12-22T18:07:43 – qK2jSAnwHB4sLt4Dt8dG
// 2019-12-25T02:02:48 – YzhDkj5wJno6n1SAdW5Y
// 2019-12-26T09:32:21 – NjgezkVCcenHYzfpmDwp
// 2020-01-02T22:15:31 – 6s0PzJHBacRACPUoHzhH
// 2020-02-09T12:25:29 – EJiHdhkjfUzwhHmiV9lC
// 2020-02-29T14:02:44 – BeriDXHrLNvztfjwGdVS
// 2020-03-27T04:52:31 – HUAU2hj36BMzJJi00PKi
// 2020-03-28T04:35:43 – W6uvh5mnw6JRyX3WUpaV
// 2020-03-29T21:35:53 – 43I04fEut2A7MnYC2S71
// 2020-04-04T08:28:54 – btcHUd7H2bJfezJYAx5z
// 2020-04-20T08:13:38 – UB2lgHmvBJ3cZYonnPp9
// 2020-06-12T22:46:16 – URo812dRfEUlfmHCFcbL
// 2020-06-13T06:17:02 – JwNxsl4BernqvePhXv21
// 2020-06-16T20:16:32 – fUoctLMfs8auhlY0nNVe
// 2020-07-06T19:35:34 – F6zwqNSO4zTsDfjSZH2N
// 2020-07-27T02:17:40 – F9WNsx6H6wIn8W5NEJxk
// 2020-08-07T13:51:12 – gXJed92vSAgXwzzu0nsi
// 2020-10-10T10:22:44 – N5Vln2MLTlusrXmFWak6
// 2020-10-12T21:42:38 – imW1DEzuueexOZFbvsBj
// 2020-10-19T08:01:03 – g2YqP65nhFzdvViPJQFE
// 2020-10-26T18:29:44 – 0HPiVQTPEf7pn2OCsRGB
// 2020-10-27T12:46:28 – WwoRKrrbFH7HujEOFFSs
// 2020-11-24T02:04:40 – WgIUMdjbzL8VIUU9ychm
// 2020-11-24T10:32:15 – z11ECM0rLV6WTM6oEiuz
// 2020-11-24T15:43:15 – C1MGgXPRchJs211LNBT5
// 2020-12-04T01:23:52 – JB0lC4aNBRheWIzWwcMH
// 2020-12-20T11:07:22 – b8e2Z013U4toS3GyvNNH
// 2020-12-24T08:42:59 – dPWa1HxSVw7nciKkzqWm
// 2021-01-15T01:22:08 – 3lTWHbihlvXb9Os9x3ow
// 2021-01-17T19:14:14 – L1ASpdz6HT9BS8pSqQll
// 2021-01-18T00:28:59 – SrqsZcTw02gThgG3mGPK
// 2021-02-05T09:52:43 – B8NRLR8v2n5OlggtYXbg
// 2021-02-06T20:38:17 – xgFwaILZwJYCGTLJyHEY
// 2021-02-23T04:09:25 – zDssjQDens9LK5c4Epnf
// 2021-03-16T10:33:54 – 4rcNJhZuzeCFMCXboSE3
// 2021-03-24T20:30:40 – 6XHN0xSIddJtBNcRB2v6
// 2021-04-04T03:01:04 – aJDGVgg6sf3VPhPIA6Tt
// 2021-04-24T23:41:53 – H7SXPWEDyn9hq0v3d1OG
// 2021-04-29T01:42:41 – Of1FIPKkIn1RVxpoUTBZ
// 2021-05-24T18:09:31 – gvv4U6B2mND356Zjjoon
// 2021-06-06T01:42:26 – 5rPFUKbhc3K1mjdiFoVr
// 2021-06-08T16:43:37 – txw50BQbO45sjl5oP3Az
// 2021-07-12T17:46:49 – kndZQWbTRkLIYMtRnKVL
// 2021-07-21T14:43:38 – d2IekshpNWF47wZbQq5k
// 2021-08-09T02:35:29 – 25JZy8b5dGtIE3RtPrM0
// 2021-08-11T21:13:44 – pq7r6lnlnDbOWUX1GU6l
// 2021-08-12T06:07:16 – CxtglG7wVmFvLJOoMGPy
// 2021-09-02T18:41:20 – vxD0VEBAE8qQega29KNp
// 2021-10-05T23:12:58 – 4HxalMoYMedjhu4bu2ZW
// 2021-10-30T05:18:25 – JW5cHkXunR68JlHWJXdh
// 2021-11-01T22:38:02 – SuivehsrkypsHqj1iqh0
// 2021-11-09T08:25:06 – bDg0Zon7jrgRD6Hjo0ua
// 2021-11-16T01:24:52 – Eqdft1NU4jZuHKyHo5HO
// 2021-11-21T11:03:24 – HutL1bv3UhfmbeVuT0I0
// 2021-11-27T00:25:35 – JEgtGxuZqODnHwCyWxMY
// 2021-12-09T22:20:24 – 6cssAg1UH05OG2RXmDo9
// 2021-12-12T04:05:52 – Qd9lNvX5AnG4YGD5g9nS
// 2022-01-02T20:13:41 – nbCE5NyRSy1tmq6sw5cd
// 2022-01-12T13:42:29 – SafXVbNGMx4kDQ9vwLQ9
// 2022-01-18T13:54:03 – ZTENqMBxZDKx36hr65Vm
// 2022-01-22T19:59:27 – F7xbi4Gqh9eeBPbwpc6w
// 2022-01-29T02:41:14 – DajO2qr1twt6BK0wgcMk
// 2022-02-12T08:43:35 – pmwNFW9hMmm1ZZ2PfNCU
// 2022-03-21T00:07:11 – aJkWE8QehOyvlq4hpVf0
// 2022-05-20T00:59:40 – gVUbtSOY7KnCZejIoQY7
// 2022-05-21T11:18:06 – BsbQiJKoKmi9cz7xkEnR
// 2022-05-25T05:55:38 – eOfOYaBsTmoHJzbwHxVA
// 2022-06-08T12:11:56 – aAdQ5czVNLfP0ZdqWHNr
// 2022-06-21T11:46:23 – gPl7ecsZrxS7bmkrdjbb
// 2022-06-26T06:11:55 – Xu3ySgzj5ns53LHHk1mP
// 2022-07-31T07:17:26 – iWkNmAE3P8HAQno0LzCM
// 2022-08-01T16:02:40 – qJXSacEVwkdLaNDyIsSm
// 2022-08-04T02:39:05 – L2Fp9Qh9L6GLbom3H6SY
// 2022-08-06T10:27:48 – gfIzGbWCMHgihV6uQNQ6
// 2022-08-20T02:52:46 – ut0nDBZQNOEdGCxswQUk
// 2022-08-31T16:13:00 – i6fX3Iy8hZQfvo7OD5CZ
// 2022-09-03T18:19:54 – wQsh20S1ObyylS2bqRRs
// 2022-09-11T04:25:06 – 0aMmGfQcPuBWCpPZaFg6
// 2022-09-12T13:37:34 – uJZ4xJZhW8kiFMfHjcY4
// 2022-09-25T17:00:24 – HWFQ1ZX90APcUKFZ2Hza
// 2022-09-29T22:52:38 – npf1bQJCCNoNHINJG5wR
// 2022-10-11T01:24:46 – KSa8oaGCdlObBLFegUeo
// 2022-11-05T05:54:41 – tBm70aCgADZoXYp5RMt1
// 2022-11-05T22:17:23 – F3bTOrqv5HD4AgFiUXlb
// 2022-11-24T20:53:57 – 4j4oSlB3CaetqnizSGt1
// 2022-11-28T11:49:32 – OF6qG12xsvqKdjE9iwnr
// 2022-12-14T23:42:30 – iApMcFhKNq1OqWbgwYAX
// 2022-12-26T04:52:15 – R2PPXAf9ZI3txHEHRY2E
