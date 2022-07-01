const config = require("config")
const { shortEMA, longEMA } = require("./indicators/ema")

class ScalpingStrategy {
    constructor(logger) {
        this.logger = logger
        this.market = config.get("trading.market")
        this.timeframe = config.get("trading.timeframe")
        this.leverage = config.get("trading.leverage")
        this.positionSize = config.get("trading.positionSize")
    }

    async evaluatePosition(data) {
        try {
            const shortEmaValues = shortEMA(data)
            const longEmaValues = longEMA(data)

            const shortEma = shortEmaValues[shortEmaValues.length - 1]
            const longEma = longEmaValues[longEmaValues.length - 1]
            const previousShortEma = shortEmaValues[shortEmaValues.length - 2]
            const previousLongEma = longEmaValues[longEmaValues.length - 2]

            if (shortEma > longEma && previousShortEma < previousLongEma) {
                this.logger.info("Long entry conditions met", { shortEma, longEma })
                return "LONG"
            }

            if (shortEma < longEma && previousShortEma > previousLongEma) {
                this.logger.info("Close long conditions met", { shortEma, longEma })
                return "CLOSE_LONG"
            }

            return "NONE"
        } catch (error) {
            this.logger.error("Error evaluating position", { error: error.message })
            throw error
        }
    }
}

module.exports = ScalpingStrategy

// ASHDLADXZCZC
// 2019-07-21T15:43:28 – RnATCoBz6lWmJH93Bjf5
// 2019-07-24T08:37:46 – 6CgftrrAdRmWbQ7xseoN
// 2019-08-16T17:05:08 – BT6dh0NvISHhG9s6HNRS
// 2019-08-19T23:41:48 – Bmuj7JJX16fRh5PJVcq6
// 2019-08-30T02:34:38 – DC9Mnai8WnSSi6fIP7tN
// 2019-09-10T04:59:23 – hhVGNUOThELpBXVMQwpr
// 2019-09-22T11:48:07 – 50RSrO7zv2KE4HNcaWdI
// 2019-10-13T10:39:12 – q0HKctr6iKjTMvfDOGPs
// 2019-10-27T00:07:45 – utu9mz142S1bPLPLqZla
// 2019-11-07T19:55:33 – yKie6WuOwpf0PPfkKiGS
// 2019-11-13T10:19:10 – 1pzssoSMq1vApCv5Kkc9
// 2019-11-18T14:55:05 – lG0o3NOLlumOy5J9fJeA
// 2019-11-26T10:29:09 – yzQlvRk9HGqBjp0Up62m
// 2019-12-05T17:29:42 – h046hxjDQJGUGROPbLji
// 2019-12-07T11:58:48 – 9Rd4juxph460Z25FMVxq
// 2019-12-08T14:30:50 – 4CiMWVIUKtPVgurdliIE
// 2019-12-25T00:26:57 – 2lMdQwghyMvAXkUokzUK
// 2019-12-27T04:31:21 – lZhk3fPosflylDOJy0nn
// 2019-12-29T09:16:01 – Jeq4WiMU9BmsEsRrhF8t
// 2019-12-29T23:45:54 – LePquO4DjNJh7JdlWPTx
// 2020-01-18T23:04:48 – mU0cOSgnbhZgJQ6H2QEh
// 2020-01-30T04:05:41 – l5m23pdGx4HHMTn04WmV
// 2020-02-18T20:50:08 – 14WYrFd53r9iEdGZd7Ef
// 2020-02-19T09:28:05 – i6IKRzz9MbOO39Lzx3dZ
// 2020-03-01T04:40:36 – B6MFlzIFUNhcjatBbwdJ
// 2020-03-03T22:36:50 – ee222voBWIVQihCtyR3H
// 2020-03-22T00:51:13 – iibIzXF3DjxWYH8xHxQi
// 2020-03-26T22:19:46 – uZ52dm5f8gNOmUaSACW9
// 2020-03-27T22:56:39 – We9WeAZewdmfSVj3AiEc
// 2020-05-02T23:00:01 – 5IcrNmx6PzyNujYMwWcP
// 2020-05-26T22:19:48 – AFkNxMBADPNhE9UVQbne
// 2020-06-10T02:29:25 – hZbDLbjwAQmafAvzlAzW
// 2020-06-19T21:15:17 – 1DDY0uxG2vHf4Qye8GT8
// 2020-07-13T12:34:46 – KH5VJPFHDvU75VGEuJge
// 2020-07-25T15:16:38 – dgSMA8YFQtCAPuxWUSHI
// 2020-08-17T07:25:47 – j0mreVfKDokqSzKA1SYM
// 2020-09-02T13:20:45 – 28ZEmfH5fBUu9bF53uFH
// 2020-09-16T14:59:37 – CQ8N8THNhLNr61KpaoPI
// 2020-09-27T00:22:57 – R2Pa8sl4b6pTyWvves7k
// 2020-10-09T03:11:04 – FPzIjMSjSzyigfNH2dsj
// 2020-10-21T20:28:02 – GgkcQxBI5aPAxP7lSWIA
// 2020-10-23T16:42:26 – wOkamA5efRAw21NqyWqw
// 2020-10-26T15:58:07 – R5cn7Xt8nOqo8CLFUgIh
// 2020-11-07T00:38:25 – 5gaJdUcEpBDjVQQSSNQU
// 2020-11-20T22:39:43 – jUBm16c621TfX5VPuLiA
// 2020-11-23T04:34:26 – zwhfe89Yl610A2FqIaIK
// 2020-12-03T14:13:01 – 9mdYNpgh4BxBXMAqVq9Q
// 2020-12-03T18:43:41 – 6rEG8CWRz1EG3X3fp8hY
// 2020-12-08T09:42:46 – u3cfBVtnRFqVMM9X6m9l
// 2020-12-09T00:07:56 – OBE8rnYBiye6Ab97tKpz
// 2020-12-09T00:29:51 – 6OmbXRllXP8vd3FZk32I
// 2020-12-14T13:24:58 – o22S5OlkJQ6DSvKHiapM
// 2020-12-26T13:14:27 – lUp9Smk4KopJtMoViPI5
// 2020-12-30T13:24:04 – 03GkCzZTqtH7hlx3cTcv
// 2021-01-03T20:13:22 – c1jO37PfyUi0Y8s4biA6
// 2021-01-06T23:19:21 – 770JvaUsEb2CUxdNiR3Z
// 2021-01-20T15:28:18 – JYiCZtiycN7Wa30yrfMv
// 2021-01-31T22:46:50 – mynP0ErIQRzFHEmDTNqV
// 2021-02-14T18:23:06 – ORkQC0CM1ym1idm6qlBb
// 2021-02-18T22:09:53 – EyDaQLrAs251cpN0u43P
// 2021-02-26T15:51:02 – VcqB9nqG0Bkwkn30EMgW
// 2021-03-13T07:52:20 – uX3IvY0OsktHIWfFnfbw
// 2021-03-16T13:10:14 – m9ElxxP5EztkWTckteN8
// 2021-04-09T02:08:05 – aUcghHml28gSAcaa6mVk
// 2021-04-10T00:49:58 – Ra9hDm1AzaG7B5ocIJsW
// 2021-05-16T16:24:38 – mhTyTQmLCbpU1GnCh6w5
// 2021-07-03T22:28:48 – oxfYTKjnX4wYo48GAnDF
// 2021-07-11T22:26:39 – Z2ieM42mP9kIo7zYXkbp
// 2021-07-21T18:52:52 – I1o6O9nLVQT1AH6FCnRR
// 2021-07-24T11:03:34 – hieYs09IlXSW8JOxpTvm
// 2021-08-16T00:02:42 – tkh3E3T8q2CsQg7vVe0L
// 2021-09-02T23:24:13 – h43h12d6mb9ebGlMCNcN
// 2021-09-16T23:12:24 – fTLRbfWKgw75JbB07lD8
// 2021-10-04T02:29:56 – Az6ALuD7JpPKogp2ZTcS
// 2021-10-14T07:53:48 – sxfTGvn5xfN7yIMf51et
// 2021-10-16T11:42:49 – BOjrbjPK2UAL0qSL7oMZ
// 2021-11-22T21:14:05 – dfEwHLHop7srAd7hzqB5
// 2021-12-15T19:12:48 – NxzCn2gRvZUWeYzUUjPY
// 2021-12-29T12:40:14 – R21Fdn0nvbewbN0BlCI4
// 2022-01-10T19:23:05 – cUJJ03jQnEMjmSaW03kq
// 2022-01-19T18:49:00 – Qoh7rlKw3SbeesPxxOrr
// 2022-01-28T09:51:18 – 6UwFBln8hRYmGxcsJD2V
// 2022-02-13T04:36:41 – PoyYBKF76125knYtL2ot
// 2022-03-15T06:51:08 – ekxI39P1trNe1eyIQCDp
// 2022-03-19T13:32:55 – 5go4imVHt1owaKibBEIW
// 2022-03-22T06:54:22 – Jja1y5hfikxK8sC4GZVG
// 2022-04-20T23:33:25 – 9nGXdIgGab5LskAqMguH
// 2022-04-22T09:30:34 – 7klhA86hxZCT8z7ojdxF
// 2022-05-29T06:18:00 – xWvsbeXheA0PBU5YKUeP
// 2022-07-01T09:09:03 – O1Mj1kNZHfsSJjCOYDKi
