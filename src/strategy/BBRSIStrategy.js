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
