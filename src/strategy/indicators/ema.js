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
