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
