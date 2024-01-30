const config = require("config")
const { calculateBollingerBands, calculateADX, calculateRSI } = require("./indicators")

class BBRSIStrategy {
    constructor(logger) {
        this.logger = logger
        this.market = config.get("trading.market")
        this.timeframe = config.get("trading.timeframe")
        this.profitTarget = config.get("trading.profitTarget")

        // Indicator settings from config
        const indicators = config.get("indicators")
        this.rsiPeriod = indicators.rsi.period // 14
        this.rsiOverbought = indicators.rsi.overbought // 75
        this.rsiOversold = indicators.rsi.oversold // 25
        this.bbPeriod = indicators.bollinger.period // 20
        this.bbStdDev = indicators.bollinger.stdDev // 2
        this.adxPeriod = indicators.adx.period // 14
        this.adxThreshold = indicators.adx.threshold // 25

        this.logger.info("Strategy initialized with parameters:", {
            market: this.market,
            timeframe: this.timeframe,
            profitTarget: this.profitTarget,
            rsi: {
                period: this.rsiPeriod,
                overbought: this.rsiOverbought,
                oversold: this.rsiOversold,
            },
            bollinger: { period: this.bbPeriod, stdDev: this.bbStdDev },
            adx: { period: this.adxPeriod, threshold: this.adxThreshold },
        })
    }

    async evaluatePosition(data) {
        try {
            // Calculate indicators
            const bb = calculateBollingerBands(data, this.bbPeriod, this.bbStdDev)
            const adx = calculateADX(data, this.adxPeriod)
            const rsi = calculateRSI(data, this.rsiPeriod)

            const currentPrice = parseFloat(data[data.length - 1].c)
            const previousPrice = parseFloat(data[data.length - 2].c)

            // Entry conditions matching Pine Script logic

            // Long Entry Conditions - ta.crossunder(close, lower)
            // 1. Price crosses below the lower Bollinger Band.
            // 2. RSI is below the oversold level.
            // 3. ADX is above the threshold.
            const crossedBelowLower = previousPrice >= bb.lower && currentPrice < bb.lower
            const longConditions =
                crossedBelowLower && rsi < this.rsiOversold && adx >= this.adxThreshold

            // Short Entry Conditions - ta.crossover(close, upper)
            // 1. Price crosses above the upper Bollinger Band.
            // 2. RSI is above the overbought level.
            // 3. ADX is above the threshold.
            const crossedAboveUpper = previousPrice <= bb.upper && currentPrice > bb.upper
            const shortConditions =
                crossedAboveUpper && rsi > this.rsiOverbought && adx >= this.adxThreshold

            // Exit Conditions matching Pine Script logic

            // Exit Long conditions - ta.crossunder(close, basis)
            // 1. Price crosses under the middle band (basis) OR
            // 2. RSI goes above 80 (using 80 instead of rsiOverbought for exit as per Pine Script)
            const crossedUnderMiddle = previousPrice >= bb.middle && currentPrice < bb.middle
            const rsiExitLong = rsi > 80

            // Exit Short conditions
            // 1. Price crosses under the lower band OR
            // 2. RSI goes below 20 (using 20 instead of rsiOversold for exit as per Pine Script)
            const crossedUnderLower = previousPrice >= bb.lower && currentPrice < bb.lower
            const rsiExitShort = rsi < 20

            // Prepare result with all indicator values
            const result = {
                signal: "NONE",
                indicators: {
                    bb: {
                        upper: bb.upper,
                        middle: bb.middle,
                        lower: bb.lower,
                    },
                    rsi: rsi,
                    adx: adx,
                    price: currentPrice,
                },
            }

            // Set appropriate signal based on conditions
            if (longConditions) {
                result.signal = "LONG"
                result.takeProfit = currentPrice * (1 + this.profitTarget / 100)
                this.logger.debug("Long signal generated", {
                    price: currentPrice,
                    rsi: rsi,
                    rsiThreshold: this.rsiOversold,
                    lowerBand: bb.lower,
                    adx: adx,
                    adxThreshold: this.adxThreshold,
                    takeProfit: result.takeProfit,
                })
            } else if (shortConditions) {
                result.signal = "SHORT"
                result.takeProfit = currentPrice * (1 - this.profitTarget / 100)
                this.logger.debug("Short signal generated", {
                    price: currentPrice,
                    rsi: rsi,
                    rsiThreshold: this.rsiOverbought,
                    upperBand: bb.upper,
                    adx: adx,
                    adxThreshold: this.adxThreshold,
                    takeProfit: result.takeProfit,
                })
            } else if ((crossedUnderMiddle || rsiExitLong) && currentPrice > 0) {
                result.signal = "CLOSE_LONG"
                this.logger.debug("Close long signal generated", {
                    price: currentPrice,
                    rsi: rsi,
                    middleBand: bb.middle,
                    crossedMiddle: crossedUnderMiddle,
                    rsiExitTriggered: rsiExitLong,
                })
            } else if ((crossedUnderLower || rsiExitShort) && currentPrice > 0) {
                result.signal = "CLOSE_SHORT"
                this.logger.debug("Close short signal generated", {
                    price: currentPrice,
                    rsi: rsi,
                    lowerBand: bb.lower,
                    crossedLower: crossedUnderLower,
                    rsiExitTriggered: rsiExitShort,
                })
            }

            return result
        } catch (error) {
            this.logger.error("Error evaluating position", { error: error.message })
            throw error
        }
    }
}

module.exports = BBRSIStrategy

// ASHDLADXZCZC
// 2019-08-01T12:35:43 – 6dT4wffpAhKrWJW9Ghz8
// 2019-08-07T14:14:03 – S22NFbkiuqPleMfp0pZq
// 2019-08-10T04:10:18 – TglEA7fW9iuEoUS4OmQ3
// 2019-08-28T08:47:24 – 00LgAQUXTPB1d4UqXp3m
// 2019-08-30T20:44:58 – 4uKerGprRVs8Mgw2OK6i
// 2019-09-16T12:45:34 – 2Ms5el5kEFTLnFkYAv3W
// 2019-10-01T22:30:53 – qkvn1ZuCCr88FWNBzIxu
// 2019-10-15T02:23:52 – W04LV0xhKU55cqFJjTte
// 2019-10-27T12:39:39 – dRn3mgHfiC6wU9TWdBZd
// 2019-11-09T16:10:52 – PpyVah3sjqb1ed07xPye
// 2019-11-10T23:09:56 – wLVU4MvAJvIEIP65UzYQ
// 2019-11-27T06:26:34 – OYzEWF1uEcNN0eYtZzJB
// 2019-12-10T03:10:51 – cU58sGSDGTR1T1b3RG49
// 2020-01-10T21:55:32 – eMWeGRpjKGLpXxWVp9tC
// 2020-01-19T10:29:01 – VEBCh4scv8prefDRaNmv
// 2020-01-28T20:27:26 – TQFoRh1sYNkjueIeeXGV
// 2020-02-03T00:30:07 – zXgGaLnBAN3qUgAvOxDO
// 2020-02-13T01:06:16 – lwOChusGEVx9tPNTzO9s
// 2020-02-17T02:53:03 – S2q3QVaG2MEsbnJDpD3y
// 2020-03-02T16:50:26 – ZVZSd4zr9aSLMz1EcXSr
// 2020-03-25T22:19:11 – taW5HNm1tyWe2t1wavrP
// 2020-05-14T19:30:12 – 66D9vTMVjzt24RxUoNgA
// 2020-06-02T03:37:13 – ndEM8MwfmtVzbCEsOy02
// 2020-06-05T09:43:38 – Bqk7z2R6uremuc9MRKyE
// 2020-07-08T01:47:32 – 9gS3z0WqqbJkvZL5SGi9
// 2020-07-27T02:20:16 – pTnyINpNu2Hx9WWMAHpI
// 2020-08-03T11:48:43 – UVZckqOuF4yQA5T1yvz0
// 2020-08-31T10:29:45 – tGV56n8ELdomqH1N78cW
// 2020-10-03T16:36:57 – pBDGoGq621N0qWY50M2B
// 2020-10-09T23:51:25 – J1YP6XYwh2RYdvOdmvrw
// 2020-10-12T00:44:10 – KPWLmub5J9aL1izIgifP
// 2020-10-16T08:19:59 – WiKSE9vzdIqo7pYcONqf
// 2020-10-18T00:50:31 – i3geiVOtkAOPngHMFD4j
// 2020-10-28T11:11:02 – g6lq8AUkTg0Bj1gYi4yG
// 2020-11-18T10:45:42 – GpifWK7IQKOW1NJIz0Ws
// 2020-12-11T08:36:16 – dTkTtm2OVM8ByWMbRWnr
// 2021-01-05T01:38:53 – eoZ2rdOECBaLMoBubmZi
// 2021-01-05T19:40:31 – 7TaPN1N92mdgU9Zve0rV
// 2021-01-11T02:38:17 – sxhHhr1kTp03EmvC3JFi
// 2021-01-13T01:03:19 – pzmoJhZ3mmSbN2QmuFis
// 2021-01-27T02:57:54 – 0JyD5JAHPqxsrUBB7TEu
// 2021-02-03T05:30:18 – TzFnJAbtOHJDzaL8r2fx
// 2021-02-11T07:48:12 – Zgvr7KVlzPKElb0PRMpp
// 2021-02-12T01:32:43 – V90fFW0KS0qd1X7sfjXr
// 2021-02-12T21:05:44 – qbjG7WYHcINRmMcs157z
// 2021-02-14T13:26:55 – 7wtGiUToqqIL4oAGJJhD
// 2021-02-15T16:35:24 – kzwgr4YIq5f6lmVFUeRO
// 2021-02-17T08:48:31 – ppljx519RXWaxBIaqUHB
// 2021-02-19T07:03:41 – JX59sHH89HqY2q7mqV71
// 2021-03-12T20:19:43 – IMYKzDrxXgKTwiDtZ38r
// 2021-03-25T23:14:12 – BUnav9ZJtBvQcVqYfeiC
// 2021-05-09T08:29:05 – gRs9z1PJjHJSeqtZypJT
// 2021-05-11T15:46:36 – qHHLBS3TcTnv1ek20GUq
// 2021-05-16T13:09:42 – f1yt8Vt44O587HZNqQzL
// 2021-06-19T13:32:35 – v8MECizcLvCzlr3h2gE8
// 2021-06-27T17:19:32 – 7pweSfzHpTiy2NGqksus
// 2021-07-08T02:19:24 – t2nMUlojgKEMc8AlWBCz
// 2021-07-17T01:36:52 – dVKZpWJ3h2JITX99Yllf
// 2021-07-17T01:44:04 – FFVRjhLZm7OtvNGQwboG
// 2021-07-20T19:02:16 – FXxCbq72mI5Yhjv6bXZt
// 2021-08-04T16:23:33 – QhRJTdpaLN0GdfrwJZhm
// 2021-08-07T08:53:42 – F372Ys60EY7oLz1g9SpC
// 2021-08-18T07:17:19 – l4LrcsADh7ZFg6et8kC1
// 2021-08-22T15:27:50 – Bf6Ituv2mK8nhcbALu3F
// 2021-08-24T04:38:27 – SyyTrM0NSNptBuBLAIJ5
// 2021-08-26T12:22:32 – icdDBQtQzMvqPZAoGRz7
// 2021-09-21T01:06:43 – nIhDxPcEhYjqhSfiODxG
// 2021-09-26T14:14:46 – YknHDePV8qtRGnOgxZJ5
// 2021-10-10T04:58:03 – jj4QqPSwUjBldhlJMn5A
// 2021-11-12T02:47:55 – 8IxgIgM89WblIb56WSsk
// 2021-11-14T03:35:40 – Z5UGBlOdnG95YoDSHbvc
// 2021-12-29T21:35:25 – b4lI14zdY8CNz7cNoqpH
// 2022-01-01T01:38:53 – YpxN33k4dCw5t1TnVsx4
// 2022-01-05T10:23:11 – 3TdgJNyfedLnuDC1aaux
// 2022-01-08T12:54:59 – PUP5UHpo6gSjuiXe0m24
// 2022-02-22T22:52:50 – kgH9JiekrZkwpxhjCFFo
// 2022-02-27T20:10:28 – keky6iHltzp9KN8P2xIy
// 2022-03-02T18:14:58 – X5lnmhd4PIfRWNW44A6X
// 2022-04-06T13:09:14 – qvPq7vT609gvg0oLmpWF
// 2022-04-07T23:26:21 – ny9Foa12fv3Y1XreaIyh
// 2022-04-13T11:16:03 – ZBGLamFLVomzwu74kYsn
// 2022-04-16T13:17:47 – kc6l70YwsiIePbKMmqTp
// 2022-05-02T10:34:56 – PGssJtrrpPn2b6RP4AVl
// 2022-06-16T12:29:51 – hoQWr0bRtHmBdk9bx5NP
// 2022-06-18T16:49:48 – 38upt5X8Lp9m28Hsolth
// 2022-06-30T10:40:18 – 4QXBGSkVqxfow7nzbaLm
// 2022-07-05T09:00:58 – TUyWmBt0Nu0WFmdeLW3G
// 2022-08-01T03:42:08 – yv2NYqhfYLUjeNBfCiD8
// 2022-08-11T03:59:03 – 9Zfs7BW1Xzr6N845if8M
// 2022-08-22T22:12:43 – EnBmEKraUK4raWdf30m5
// 2022-08-31T23:18:30 – 4K4rjUJTSVwwgnR6PP9C
// 2022-09-09T20:25:47 – WCexmuZScWWCVGv0OCDR
// 2022-09-20T03:29:02 – HoEtzEbWv7O7hG84Z0YD
// 2022-09-25T08:33:08 – SROnFfDyV2NeWbPFnwoA
// 2022-10-01T22:30:45 – xsTOh4II6dR9Wdn7watl
// 2022-10-05T15:19:36 – 1ik46iPqDVEYKAXU0qi3
// 2022-11-01T14:31:45 – qqXuJZFnhXqK1ErU3SaF
// 2022-11-03T10:04:17 – giM6wmGIBGxY6KYAFMJc
// 2022-11-11T02:26:55 – XmBysX6IWDlURm27dlYO
// 2022-11-26T05:12:53 – DLiIGWzZBBJBR8dt9MT1
// 2022-12-01T11:16:24 – TFaHsrfBbASmXrug4fPm
// 2022-12-12T09:01:00 – MMw7zeGMo7dojtJvxwAj
// 2023-01-26T06:35:20 – BN4DzMt5v5W8mbGkyuCN
// 2023-02-16T00:39:45 – 9P58HsqOJ3S1abmBl77b
// 2023-02-24T14:19:57 – gHoVnXGiYfzQ9Xg1LV1k
// 2023-03-27T05:46:56 – 55uAo34z33flDmuvu4SC
// 2023-03-30T23:08:10 – 1l3vltwcq2zSuCK1GWxV
// 2023-04-09T09:34:42 – gfGaJy1eoAnqNBfDQ7I1
// 2023-04-21T07:40:02 – ETCLKblHRBGmBwZsMzg3
// 2023-05-01T02:39:30 – SoZrcVfBu4R2ryxiibYU
// 2023-05-09T13:58:40 – 6d7pVTXkXgKc1OPN8lUn
// 2023-05-15T04:31:57 – qcDNvseZX5aNYz4dHAGg
// 2023-05-20T04:38:26 – E7NMtYaCUmWIWoEDiDyr
// 2023-05-21T22:49:00 – pU8IL6L0egEvhq7ouSGY
// 2023-05-25T00:11:28 – 5t9MF1lpHy1pWJnx4jON
// 2023-06-02T19:00:00 – h5uocHyZ6gSD62nNRB1Y
// 2023-06-07T15:25:56 – rI7jtvtNCIt1yY413cHr
// 2023-06-09T10:30:45 – 7nvElygU4C50ltHMX0tc
// 2023-06-17T13:17:12 – HvbwHJ3fNbF7GUq5ZPzS
// 2023-06-21T12:27:21 – 0fAopfXilBeOMRRkqIhw
// 2023-06-21T14:33:16 – RMhyJ2D20WXigqfjQ014
// 2023-07-17T18:15:11 – MGenmDmfvN0sUKFqbI1A
// 2023-08-16T00:17:27 – YtgSZdizCvuoxKXc5hwt
// 2023-09-20T12:01:52 – 2vXuvUjGGQheD5wmBYjT
// 2023-10-07T10:54:37 – RzcgBjWgzG9n45G1ZL5k
// 2023-11-11T13:53:11 – 4IQJk83O8kX8pHGnsXes
// 2023-11-12T02:11:37 – nHxXVmqBlcieBVwgGyA1
// 2023-11-29T21:29:54 – dJ61kc8ADq9TKWS6s05n
// 2023-12-06T01:08:43 – mZXX2merzx6MOh3476gF
// 2023-12-15T11:58:10 – Bd5tt6YM5fRYzwqqJhCQ
// 2024-01-05T11:13:31 – GIucfKMMf2aiHVUPXHOG
// 2024-01-22T06:57:57 – NWp6GFW05mYC19KkbTNY
// 2024-01-22T12:30:54 – Yc8trH9oFahtL5nnp3Ia
// 2024-01-30T08:13:16 – L9ekV7EzMc9VLkcu5v2F
