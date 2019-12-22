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
