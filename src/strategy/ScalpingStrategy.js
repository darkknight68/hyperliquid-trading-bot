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
