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
// 2021-08-02T03:56:41 – WFRqpDsPJ7WKkoNhk9Cn
// 2021-08-04T02:53:12 – Ju7lfGpnSQiJ7P5rVBVf
// 2021-08-07T13:58:44 – pLhJvzhfAMXcdanl1Un8
// 2021-09-09T15:52:09 – Yp8piseE04hX17BLwn3V
// 2021-09-12T15:46:26 – ULMKgDF0j4lgOAg5Bt2j
// 2021-09-18T17:41:25 – kaWhTfBAWjgogRJJqx1W
// 2021-09-27T08:26:01 – uiT0yuTbdgqugYp7OGuj
// 2021-10-05T18:11:16 – bh6L0Kb28UcoxdxBI3mX
// 2021-10-08T15:16:12 – ITZTmwoPdfUQUHaxe4xi
// 2021-10-13T08:31:11 – KWz4Y6SiICmEeH5mixKB
// 2021-10-23T22:31:35 – pCOISRh4g4OHOkdkyszH
// 2021-10-26T07:37:21 – Z49Ur1dWjidd1cPEnuug
// 2021-11-18T00:20:58 – 1w7ug1X4da3SiJePPqRn
// 2021-11-20T19:28:33 – Re2uGSCq11e9k8PZZrs9
// 2021-11-25T15:11:41 – lW1B84G76eLZwj1gaM8k
// 2021-12-16T19:59:13 – EjxAcom6OB4uUhM5rIMg
// 2022-01-01T05:55:47 – 7oPuqq4JRZAGNxdogvdT
// 2022-01-06T08:10:56 – APpRggSMDaTsih4xQlHd
// 2022-01-17T07:55:12 – l1ywsXv04mtR5n27IZ1X
// 2022-01-18T11:06:09 – dbMjuivfdpjrqViGLo7W
// 2022-01-19T13:46:14 – PxKqTUt7gsho7B8UX0iC
// 2022-01-28T01:39:56 – kA0kDypq83XmdNs4ZKgq
// 2022-02-12T06:09:49 – Td9qmhAHthZQK1qhbIjN
// 2022-03-03T06:01:17 – 0OaeSPVgqgjBrWXZXGN5
// 2022-03-06T23:23:19 – pTTrOXiSZeWIdo31Q6kW
// 2022-03-22T23:34:39 – VWk3eT63ZffL2PUbx1gQ
// 2022-04-01T09:20:45 – Dk4Uz8dLEfSvjbHFNdlh
// 2022-04-18T14:39:14 – sQSPVI1siZQRAFhOPAn1
// 2022-05-20T16:10:08 – qMFgOIxxnKKnhdAu9QDT
// 2022-06-19T08:55:47 – CFLzscgweL3kwMQq1BG9
// 2022-06-23T18:27:47 – PkbsT5EnaQgKirJthHMm
// 2022-06-28T06:35:48 – NpevVvKqiHnkJ7WjRvJo
// 2022-06-30T18:09:49 – R4IN2Uz1cEks3xGndceg
// 2022-07-26T13:44:53 – bCVPSkSMNrsOsJCSQdIu
// 2022-07-30T16:45:03 – 0aagAHRcKRJheVkJBi3O
// 2022-08-15T15:54:37 – 048pd3WEZi8q3KRjcJAo
// 2022-08-22T03:58:27 – eD2h3Z5mb23gpa7r4BPW
// 2022-09-13T07:06:00 – X1NCJU5G4h9Ijkgd7fTW
// 2022-09-16T20:51:05 – 79LnRnWDK53npAEIMouw
// 2022-09-19T17:53:29 – ESCSixsrNpB5M1dtAFvV
// 2022-09-26T12:16:35 – wiZum6RzKrQMk3hsQIjx
// 2022-10-03T05:34:41 – EKc8fmi0XUorpKRwiSWA
// 2022-10-03T08:40:14 – ZGHDSH0DzDTa5X66eI7h
// 2022-10-07T08:15:18 – CUvmCn1JCED1jPzVJp1E
// 2022-10-17T19:57:27 – T4ZORgHleGM18rEm7QlY
// 2022-10-18T15:49:09 – ib25jRyGmqQaegqlp19W
// 2022-11-25T13:06:38 – ErYNveYAHYLxE9KlhCMr
// 2022-12-05T10:27:20 – PdQT3E29tyESt0UAATtN
// 2022-12-09T03:51:52 – ZrqKr3nG9pF3NmY2Nvop
// 2022-12-13T02:06:58 – jODsr236lAIBsayNjA7x
// 2022-12-24T01:33:10 – v332GwUuO4JeOJs001qg
// 2022-12-29T21:03:53 – 0l1xiAb7XGRLbdmB2hwX
// 2023-01-11T12:01:18 – tALK8DLcvQGlyFV25zEw
// 2023-02-08T16:08:53 – UkOwJxIbrsWTz6Q4yvx9
// 2023-03-06T15:57:18 – OkEDF5MsQNtacZeJvsUr
// 2023-03-15T13:05:52 – mjkNLqmFf8OD4nwVN214
// 2023-03-17T06:57:52 – 2WovR3kkynqQiqiESVC5
// 2023-04-13T10:18:27 – I5jh2gcHwt6gsf3eEhsk
// 2023-04-27T05:43:22 – jtrtRH3mAEFkQndhabnh
// 2023-05-23T23:48:55 – EjRhjdB8Jw9cg9CNq1M8
// 2023-06-11T23:14:40 – AOrZw1KB5V58STHbyGGd
// 2023-06-25T08:35:32 – yERyN9ia62uTfWZzBYqb
// 2023-07-01T00:03:18 – fwVBmv61JRJ8fDW1pqyC
// 2023-07-03T02:21:20 – PaiTahrtBOKntesH1MTU
// 2023-07-29T05:44:32 – p0Sal5WxF2ecqk0vmWfR
// 2023-08-10T02:26:38 – qQfRZ8JblwtxRrrzuERj
// 2023-08-21T15:24:10 – wNEjwLJN2N7mBQTqyl8R
// 2023-08-24T04:26:23 – m4cR5bAamugF2Z1hrpzj
// 2023-08-27T07:22:04 – ymRCOx5HRLFaGV6SmvTs
// 2023-08-31T05:15:04 – jhlDE343MAGBTrAtVYCQ
// 2023-09-17T04:35:18 – iotRUBmITKX9QspAn9iO
// 2023-09-21T09:29:47 – rMlZjHLdDSF3AKvnjOyX
// 2023-09-21T10:29:02 – aMLr2EUCyQq2ORtpANNg
// 2023-09-27T19:51:34 – rNFxRQ0sunV1ewJG2rfY
// 2023-10-02T01:29:53 – 9hSBHJRghPSuxP1HNmpn
// 2023-10-22T08:37:43 – uaQpBPrqiggBwNtnN6B9
// 2023-10-24T16:55:28 – Xbx91nBaw6i0iwGmAm5p
// 2023-10-31T03:22:28 – dMK3VDH0lpmTCAcWbVuP
// 2023-11-02T03:51:06 – GA8PyKgkn0mQTVzZy85O
// 2023-11-29T09:45:33 – RCCn30lyr99UvWEtJITA
// 2023-12-25T16:57:18 – C8bNCEJNf7JiOG0jal9h
// 2024-01-09T07:07:51 – e4ueEYQJ1U0VCyxn3WAc
