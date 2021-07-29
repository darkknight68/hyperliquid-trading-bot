const { RSI, BollingerBands, ADX } = require("trading-signals")
// const data = require("../../backtesting/data/BTC-PERP/BTC-PERP-1m.json")
// const last25 = data.slice(-50)
// const config = require("config")

// const indicators = config.get("indicators")
// const rsiPeriod = indicators.rsi.period
// const adxPeriod = indicators.adx.period
// const bollingerPeriod = indicators.bollinger.period
// const bollingerStdDev = indicators.bollinger.stdDev

function calculateBollingerBands(data, period, stdDev) {
    const bb = new BollingerBands(period, stdDev)
    let closes = []

    // Feed all closing prices
    for (let i = 0; i < data.length; i++) {
        closes.push(parseFloat(data[i].c))
        bb.update(closes[i])
    }

    // Get the last result
    const result = bb.getResult()

    return {
        lower: result.lower.valueOf(), // Convert to actual number
        middle: result.middle.valueOf(),
        upper: result.upper.valueOf(),
    }
}

function calculateADX(data, period) {
    const adx = new ADX(period)

    // Feed the data
    for (let i = 0; i < data.length; i++) {
        adx.update({
            high: parseFloat(data[i].h),
            low: parseFloat(data[i].l),
            close: parseFloat(data[i].c),
        })
    }

    // Get the last result and convert to number between 0-100
    const result = adx.getResult()
    return parseFloat(result.valueOf()) // Convert to actual number
}

function calculateRSI(data, period) {
    const rsi = new RSI(period)
    let closes = []

    // Feed all closing prices
    for (let i = 0; i < data.length; i++) {
        closes.push(parseFloat(data[i].c))
        rsi.update(closes[i])
    }

    // Get the last result and convert to number between 0-100
    const result = rsi.getResult()
    return parseFloat(result.valueOf()) // Convert to actual number
}

// Test function to verify outputs
async function testIndicators(data) {
    const indicators = require("config").get("indicators")

    const bb = calculateBollingerBands(
        data,
        indicators.bollinger.period,
        indicators.bollinger.stdDev,
    )
    console.log("Bollinger Bands:", {
        lower: bb.lower,
        middle: bb.middle,
        upper: bb.upper,
    })

    const adx = calculateADX(data, indicators.adx.period)
    console.log("ADX:", adx)

    const rsi = calculateRSI(data, indicators.rsi.period)
    console.log("RSI:", rsi)
}

// testIndicators(last25).catch(console.error)

module.exports = {
    calculateBollingerBands,
    calculateADX,
    calculateRSI,
}

// ASHDLADXZCZC
// 2019-07-20T13:22:33 – SaWtHs916zWrLBlZ3Aec
// 2019-08-07T00:24:38 – C2Hp9zRKCOnSHBQjsWnj
// 2019-09-14T17:24:50 – x61UHMMPTZwiG11VZfpe
// 2019-09-18T18:59:15 – KglVN8PU8m50EZdV0Ulp
// 2019-10-04T19:31:06 – EFtMhOVs6Ko0N68XWvfR
// 2019-10-04T20:32:05 – 4ENPMEHc6vU7UD3oR5pA
// 2019-10-06T05:23:41 – Ep1O8GkALXODiRSnjNqg
// 2019-10-14T00:32:34 – mAjILVqrJRpOcc6WRQTG
// 2019-11-11T07:11:38 – lNmmn9kEDJkNyH4pJccP
// 2019-12-22T17:46:20 – 5WMtSFbqRehDm4dRsKP2
// 2019-12-28T01:23:17 – JFgvLdNWcIC3WjaZoHDI
// 2019-12-30T05:46:17 – VQPW8Xk9vHICX76kI1TA
// 2020-01-06T02:36:51 – OF6GkSxLJsOg8mmgqoJY
// 2020-01-07T11:57:00 – vHo1w8W1rBYJCz5MleGS
// 2020-01-15T17:29:51 – f9IZrl2tsYCnSUfngZkb
// 2020-01-21T05:33:41 – bFUvytdb6WukfUpHlvi2
// 2020-01-26T14:19:17 – jSS8ddw5oisxMv4HlrEA
// 2020-01-30T04:48:34 – U85zGNQfH08X1RBoSMPg
// 2020-01-31T03:22:27 – Gpz2Y7ntElNpMHVMn6cg
// 2020-04-19T06:18:04 – KeuJZrHFJ6Qpnz1XzrJK
// 2020-04-26T07:36:48 – ssZytJ7pUx2LjxO6OST5
// 2020-04-28T06:40:37 – qAqboy2AOo04oNQGKo6s
// 2020-05-11T07:47:02 – 6KZQeFR9WG4G9YwHRkSl
// 2020-06-01T01:03:11 – s3aapsKn7wzlRQgi9XaX
// 2020-06-11T15:56:22 – 8J5zRidkjpNpzYwmEQWy
// 2020-06-17T18:22:49 – wGKCrHMQXhfdq1xym5iT
// 2020-06-19T17:34:02 – JVl4ALNjLSyVubhrry42
// 2020-07-03T23:05:09 – uOOZXACz08Jl0CZXmZVa
// 2020-07-12T10:45:15 – rkgk7SWH7ucpanCtieXD
// 2020-08-06T03:56:11 – HRKTK6j2gqgGytKQYJ4u
// 2020-08-12T10:20:23 – 4gzZsXbP3WxHcffBfecz
// 2020-08-28T02:45:02 – 0BjPXfl895MVDItI1AUJ
// 2020-09-01T20:51:01 – YLwlUgXr25fc888wQgrj
// 2020-09-24T02:21:23 – QZFuO8AgXljG0kBR3oB2
// 2020-10-11T06:02:32 – 6exW7REjiu1KLJlbzD3N
// 2020-10-23T06:29:54 – 2WDCKjlH9c0DLPHEUM70
// 2020-11-24T20:26:51 – wLdwUTF5HuqUzBqDk8Ov
// 2020-12-03T08:20:15 – wRpImrc3wVrjCdQgdc2K
// 2020-12-03T11:38:35 – IFGBznE76hysW1wbxHYD
// 2020-12-12T05:11:11 – sAkAq0gKAbvR8o0poqv3
// 2021-01-20T16:11:30 – KxUCMctrVDCHeSTt7F7Y
// 2021-01-22T02:43:42 – tYA3fXdXe1dtLx8KBmmr
// 2021-01-29T20:00:43 – TzFXsufj3SixlLisJCme
// 2021-02-13T00:43:17 – XO4KldhLNPIiX8LXCdYU
// 2021-02-27T04:26:31 – ZAqfaVmcVf3y4sCnKz95
// 2021-03-14T11:16:43 – GhDMVtV5hX3eS23fLCSQ
// 2021-03-15T06:31:54 – GrUxUTS82gUlCRrxrUo5
// 2021-04-04T19:46:17 – YivJsb7HTDrK1viwN0Md
// 2021-04-07T16:32:01 – tMrToaKWbru0DcDVlaOm
// 2021-04-22T02:25:30 – qw8JlRqQ4l7kDbQdN01I
// 2021-05-04T14:59:59 – 4HVi8f0kEBHCxFSTELeF
// 2021-05-09T00:30:54 – aYPH1tvXhpnXa5JWr6zC
// 2021-06-27T08:51:51 – HbxBYXR1VFQB9xLD9Meq
// 2021-07-15T08:50:48 – zmvcqCI5maoM043DpmFq
// 2021-07-29T07:47:14 – Vi8iSfPxQ7HJC8efKkEa
