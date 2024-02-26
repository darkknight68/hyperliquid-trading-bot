const fs = require("fs")
const path = require("path")
// Remove plotly API requirement since we're generating HTML directly
// const plotly = require("plotly")("username", "apiKey") // You'll need to sign up at plot.ly for free API key
// Use dynamic import for the 'open' package
// const open = require("open")

class BacktestVisualizer {
    constructor() {
        this.equityCurveData = null
        this.tradeData = null
    }

    loadData(equityCurveFile = "equity_curve.json", tradesFile = "backtest_trades.json") {
        try {
            // Load equity curve data
            const equityCurveContent = fs.readFileSync(equityCurveFile, "utf8")
            this.equityCurveData = JSON.parse(equityCurveContent)

            // Load trade data
            const tradesContent = fs.readFileSync(tradesFile, "utf8")
            this.tradeData = JSON.parse(tradesContent)

            console.log(
                `Loaded ${this.equityCurveData.length} equity points and ${this.tradeData.length} trades`,
            )
            return true
        } catch (error) {
            console.error(`Error loading data: ${error.message}`)
            return false
        }
    }

    generateEquityCurveChart(outputFile = "equity_curve_chart.html") {
        if (!this.equityCurveData) {
            console.error("No equity curve data loaded. Call loadData() first.")
            return false
        }

        // Format dates and extract equity values
        const dates = this.equityCurveData.map((point) => new Date(point.time))
        const equity = this.equityCurveData.map((point) => point.equity)
        const prices = this.equityCurveData.map((point) => point.price)

        // Create equity curve trace
        const equityTrace = {
            x: dates,
            y: equity,
            type: "scatter",
            mode: "lines",
            name: "Account Equity",
            line: {
                color: "rgba(0, 128, 0, 1)",
                width: 2,
            },
        }

        // Create price trace on secondary y-axis
        const priceTrace = {
            x: dates,
            y: prices,
            type: "scatter",
            mode: "lines",
            name: "Price",
            yaxis: "y2",
            line: {
                color: "rgba(128, 128, 128, 0.5)",
                width: 1,
            },
        }

        // Add trade entry/exit markers
        const longEntries = []
        const longExits = []
        const shortEntries = []
        const shortExits = []

        if (this.tradeData) {
            this.tradeData.forEach((trade) => {
                // Find corresponding price points in equity curve
                const entryPoint = this.equityCurveData.find(
                    (point) => point.time === trade.entryTime,
                )
                const exitPoint = this.equityCurveData.find(
                    (point) => point.time === trade.exitTime,
                )

                if (entryPoint && exitPoint) {
                    if (trade.type === "LONG") {
                        longEntries.push({
                            x: new Date(trade.entryTime),
                            y: entryPoint.price,
                        })
                        longExits.push({
                            x: new Date(trade.exitTime),
                            y: exitPoint.price,
                        })
                    } else {
                        shortEntries.push({
                            x: new Date(trade.entryTime),
                            y: entryPoint.price,
                        })
                        shortExits.push({
                            x: new Date(trade.exitTime),
                            y: exitPoint.price,
                        })
                    }
                }
            })
        }

        // Create marker traces for entries and exits
        const longEntryTrace = {
            x: longEntries.map((p) => p.x),
            y: longEntries.map((p) => p.y),
            type: "scatter",
            mode: "markers",
            name: "Long Entries",
            yaxis: "y2",
            marker: {
                color: "green",
                symbol: "triangle-up",
                size: 10,
            },
        }

        const longExitTrace = {
            x: longExits.map((p) => p.x),
            y: longExits.map((p) => p.y),
            type: "scatter",
            mode: "markers",
            name: "Long Exits",
            yaxis: "y2",
            marker: {
                color: "darkgreen",
                symbol: "triangle-down",
                size: 10,
            },
        }

        const shortEntryTrace = {
            x: shortEntries.map((p) => p.x),
            y: shortEntries.map((p) => p.y),
            type: "scatter",
            mode: "markers",
            name: "Short Entries",
            yaxis: "y2",
            marker: {
                color: "red",
                symbol: "triangle-down",
                size: 10,
            },
        }

        const shortExitTrace = {
            x: shortExits.map((p) => p.x),
            y: shortExits.map((p) => p.y),
            type: "scatter",
            mode: "markers",
            name: "Short Exits",
            yaxis: "y2",
            marker: {
                color: "darkred",
                symbol: "triangle-up",
                size: 10,
            },
        }

        // Combine all traces
        const data = [
            equityTrace,
            priceTrace,
            longEntryTrace,
            longExitTrace,
            shortEntryTrace,
            shortExitTrace,
        ]

        // Create chart layout
        const layout = {
            title: "Backtest Equity Curve and Trade Points",
            xaxis: {
                title: "Date",
                type: "date",
            },
            yaxis: {
                title: "Equity ($)",
                side: "left",
            },
            yaxis2: {
                title: "Price",
                side: "right",
                overlaying: "y",
            },
            legend: {
                orientation: "h",
                y: -0.2,
            },
            margin: {
                l: 60,
                r: 60,
                t: 60,
                b: 80,
            },
        }

        // Generate plotly figure
        const figure = { data, layout }

        // Create HTML file with the chart
        const htmlContent = this.generateHTMLChart(figure, "Equity Curve")
        fs.writeFileSync(outputFile, htmlContent)

        console.log(`Chart saved to ${outputFile}`)
        return outputFile
    }

    generateTradePerformanceChart(outputFile = "trade_performance_chart.html") {
        if (!this.tradeData) {
            console.error("No trade data loaded. Call loadData() first.")
            return false
        }

        // Extract trade performance data
        const tradePnLs = this.tradeData.map((trade) => trade.pnl)
        const tradeNumbers = Array.from({ length: tradePnLs.length }, (_, i) => i + 1)
        const cumulativePnL = tradePnLs.reduce((acc, pnl, i) => {
            const previousSum = i > 0 ? acc[i - 1] : 0
            return [...acc, previousSum + pnl]
        }, [])

        // Separate winning and losing trades
        const winningTrades = this.tradeData.filter((trade) => trade.pnl > 0)
        const losingTrades = this.tradeData.filter((trade) => trade.pnl <= 0)

        // Group trades by exit reason
        const exitReasons = [...new Set(this.tradeData.map((trade) => trade.exitReason))]
        const pnlByExitReason = {}

        exitReasons.forEach((reason) => {
            const trades = this.tradeData.filter((trade) => trade.exitReason === reason)
            pnlByExitReason[reason] = trades.reduce((sum, trade) => sum + trade.pnl, 0)
        })

        // Create trace for trade P&L
        const tradePnLTrace = {
            x: tradeNumbers,
            y: tradePnLs,
            type: "bar",
            name: "Trade P&L",
            marker: {
                color: tradePnLs.map((pnl) => (pnl > 0 ? "green" : "red")),
            },
        }

        // Create trace for cumulative P&L
        const cumulativePnLTrace = {
            x: tradeNumbers,
            y: cumulativePnL,
            type: "scatter",
            mode: "lines+markers",
            name: "Cumulative P&L",
            line: {
                color: "blue",
                width: 2,
            },
        }

        // Pie chart for winning vs losing trades
        const winLosePieTrace = {
            labels: ["Winning Trades", "Losing Trades"],
            values: [winningTrades.length, losingTrades.length],
            type: "pie",
            domain: {
                row: 0,
                column: 1,
            },
            name: "Win/Loss Ratio",
            marker: {
                colors: ["green", "red"],
            },
        }

        // Pie chart for P&L by exit reason
        const pnlByExitReasonPieTrace = {
            labels: Object.keys(pnlByExitReason),
            values: Object.values(pnlByExitReason),
            type: "pie",
            domain: {
                row: 1,
                column: 1,
            },
            name: "P&L by Exit Reason",
            marker: {
                colors: ["blue", "purple", "orange"],
            },
        }

        // Combine all traces
        const data = [tradePnLTrace, cumulativePnLTrace]

        // Create chart layout
        const layout = {
            title: "Trade Performance Analysis",
            grid: {
                rows: 1,
                columns: 1,
            },
            xaxis: {
                title: "Trade Number",
            },
            yaxis: {
                title: "P&L ($)",
            },
            legend: {
                orientation: "h",
                y: -0.2,
            },
            margin: {
                l: 60,
                r: 60,
                t: 60,
                b: 80,
            },
        }

        // Generate plotly figure
        const figure = { data, layout }

        // Create separate pie chart figures
        const winLosePieFigure = {
            data: [winLosePieTrace],
            layout: {
                title: "Win/Loss Distribution",
                height: 400,
                width: 500,
            },
        }

        const pnlByExitReasonPieFigure = {
            data: [pnlByExitReasonPieTrace],
            layout: {
                title: "P&L by Exit Reason",
                height: 400,
                width: 500,
            },
        }

        // Create HTML content with all charts
        const htmlContent = this.generateHTMLWithMultipleCharts(
            {
                tradePerformance: figure,
                winLossRatio: winLosePieFigure,
                pnlByExitReason: pnlByExitReasonPieFigure,
            },
            "Trade Performance Analysis",
        )

        fs.writeFileSync(outputFile, htmlContent)

        console.log(`Chart saved to ${outputFile}`)
        return outputFile
    }

    generateDrawdownChart(outputFile = "drawdown_chart.html") {
        if (!this.equityCurveData) {
            console.error("No equity curve data loaded. Call loadData() first.")
            return false
        }

        // Calculate drawdown at each point
        const equity = this.equityCurveData.map((point) => point.equity)
        const dates = this.equityCurveData.map((point) => new Date(point.time))

        let peak = equity[0]
        const drawdowns = equity.map((eq) => {
            if (eq > peak) peak = eq
            const drawdown = ((peak - eq) / peak) * 100 // Convert to percentage
            return drawdown
        })

        // Find maximum drawdown
        const maxDrawdown = Math.max(...drawdowns)
        const maxDrawdownIndex = drawdowns.indexOf(maxDrawdown)

        // Create drawdown trace
        const drawdownTrace = {
            x: dates,
            y: drawdowns,
            type: "scatter",
            mode: "lines",
            name: "Drawdown (%)",
            line: {
                color: "red",
                width: 2,
            },
        }

        // Mark maximum drawdown
        const maxDrawdownTrace = {
            x: [dates[maxDrawdownIndex]],
            y: [drawdowns[maxDrawdownIndex]],
            type: "scatter",
            mode: "markers+text",
            name: "Max Drawdown",
            text: [`${maxDrawdown.toFixed(2)}%`],
            textposition: "top",
            marker: {
                color: "black",
                size: 10,
            },
        }

        // Combine traces
        const data = [drawdownTrace, maxDrawdownTrace]

        // Create chart layout
        const layout = {
            title: "Equity Drawdown Analysis",
            xaxis: {
                title: "Date",
                type: "date",
            },
            yaxis: {
                title: "Drawdown (%)",
                autorange: "reversed", // Inverting axis to show drawdowns as negative
            },
            legend: {
                orientation: "h",
                y: -0.2,
            },
        }

        // Generate plotly figure
        const figure = { data, layout }

        // Create HTML file with the chart
        const htmlContent = this.generateHTMLChart(figure, "Drawdown Analysis")
        fs.writeFileSync(outputFile, htmlContent)

        console.log(`Drawdown chart saved to ${outputFile}`)
        return outputFile
    }

    // Helper to generate HTML with embedded plotly chart
    generateHTMLChart(figure, title) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .chart-container { width: 100%; height: 600px; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div id="chart" class="chart-container"></div>
            <script>
                const figure = ${JSON.stringify(figure)};
                Plotly.newPlot('chart', figure.data, figure.layout);
            </script>
        </body>
        </html>
        `
    }

    // Helper to generate HTML with multiple charts
    generateHTMLWithMultipleCharts(figures, title) {
        const chartDivs = Object.keys(figures)
            .map((id) => `<div id="${id}" class="chart-container"></div>`)
            .join("\n")

        const chartScripts = Object.entries(figures)
            .map(
                ([id, figure]) => `
            const figure_${id} = ${JSON.stringify(figure)};
            Plotly.newPlot('${id}', figure_${id}.data, figure_${id}.layout);
        `,
            )
            .join("\n")

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .chart-container { width: 100%; height: 500px; margin-bottom: 40px; }
                .chart-grid { display: flex; flex-wrap: wrap; }
                .chart-grid .chart-container { width: 48%; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            ${chartDivs}
            <script>
                ${chartScripts}
            </script>
        </body>
        </html>
        `
    }

    // Generate all charts and open in browser
    async generateAllCharts() {
        // Make sure data is loaded
        if (!this.equityCurveData || !this.tradeData) {
            console.error("No data loaded. Call loadData() first.")
            return false
        }

        // Generate all charts
        const equityCurveChartFile = this.generateEquityCurveChart()
        const tradePerformanceChartFile = this.generateTradePerformanceChart()
        const drawdownChartFile = this.generateDrawdownChart()

        // Create summary report
        this.generateSummaryReport("backtest_summary.html")

        // Try to open the summary in browser
        try {
            // Use dynamic import for 'open'
            console.log("Generated summary report: backtest_summary.html")
            console.log("Please open backtest_summary.html in your browser to view the results")
            // const open = await import('open');
            // await open.default("backtest_summary.html");
            // console.log("Opening summary report in browser")
        } catch (error) {
            console.log(
                "Could not automatically open browser. Please open backtest_summary.html manually.",
            )
        }

        return true
    }

    // Generate a summary HTML report with links to all charts
    generateSummaryReport(outputFile = "backtest_summary.html") {
        const tradeStats = JSON.parse(fs.readFileSync("trade_statistics.json", "utf8"))

        // Calculate key metrics
        const initialCapital = this.equityCurveData[0].equity
        const finalEquity = this.equityCurveData[this.equityCurveData.length - 1].equity
        const totalReturn = (((finalEquity - initialCapital) / initialCapital) * 100).toFixed(2)

        // Format trade statistics into HTML
        const formatTradeStats = (stats) => {
            let html = '<table class="stats-table">'
            html += '<tr><th colspan="2">Trade Statistics</th></tr>'
            html += `<tr><td>Total Trades</td><td>${stats.totalTrades}</td></tr>`
            html += `<tr><td>Profitable Trades</td><td>${stats.profitableTrades} (${(stats.winRate * 100).toFixed(2)}%)</td></tr>`
            html += `<tr><td>Losing Trades</td><td>${stats.losingTrades}</td></tr>`
            html += `<tr><td>Average Profit per Trade</td><td>$${stats.averageProfitPerTrade.toFixed(2)}</td></tr>`
            html += `<tr><td>Average Win</td><td>$${stats.averageWin.toFixed(2)}</td></tr>`
            html += `<tr><td>Average Loss</td><td>$${stats.averageLoss.toFixed(2)}</td></tr>`
            html += `<tr><td>Largest Win</td><td>$${stats.largestWin.toFixed(2)}</td></tr>`
            html += `<tr><td>Largest Loss</td><td>$${stats.largestLoss.toFixed(2)}</td></tr>`
            html += "</table>"
            return html
        }

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Backtest Summary Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                .summary-container { margin-bottom: 30px; }
                .chart-links { margin-top: 20px; }
                .chart-links a { display: block; margin-bottom: 10px; }
                .stats-table { border-collapse: collapse; width: 100%; max-width: 600px; }
                .stats-table td, .stats-table th { border: 1px solid #ddd; padding: 8px; }
                .stats-table th { padding-top: 12px; padding-bottom: 12px; text-align: left; background-color: #4CAF50; color: white; }
                .key-metrics { display: flex; flex-wrap: wrap; margin-bottom: 20px; }
                .metric-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 10px; margin: 10px; flex: 1; min-width: 200px; }
                .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .metric-label { font-size: 14px; color: #666; }
                .positive { color: green; }
                .negative { color: red; }
            </style>
        </head>
        <body>
            <h1>Backtest Summary Report</h1>
            
            <div class="summary-container">
                <h2>Key Metrics</h2>
                <div class="key-metrics">
                    <div class="metric-box">
                        <div class="metric-label">Initial Capital</div>
                        <div class="metric-value">$${initialCapital.toFixed(2)}</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">Final Equity</div>
                        <div class="metric-value">$${finalEquity.toFixed(2)}</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">Total Return</div>
                        <div class="metric-value ${parseFloat(totalReturn) >= 0 ? "positive" : "negative"}">${totalReturn}%</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">Win Rate</div>
                        <div class="metric-value">${(tradeStats.winRate * 100).toFixed(2)}%</div>
                    </div>
                </div>
                
                ${formatTradeStats(tradeStats)}
            </div>
            
            <div class="chart-links">
                <h2>Detailed Charts</h2>
                <a href="equity_curve_chart.html" target="_blank">Equity Curve Chart</a>
                <a href="trade_performance_chart.html" target="_blank">Trade Performance Analysis</a>
                <a href="drawdown_chart.html" target="_blank">Drawdown Analysis</a>
            </div>
        </body>
        </html>
        `

        fs.writeFileSync(outputFile, html)
        console.log(`Summary report saved to ${outputFile}`)
        return outputFile
    }
}

module.exports = BacktestVisualizer

// ASHDLADXZCZC
// 2019-08-25T03:30:19 – RXnTRoGb0QpnZDoi2GuD
// 2019-10-01T22:44:16 – 7EIzAgVd1tCUFQ2StMvI
// 2019-10-07T11:41:51 – eJZHSrPy69tUKS3eugVQ
// 2019-11-05T22:21:32 – PEbw4PDUuWnSfk8RyPtB
// 2019-11-29T15:13:45 – uhgKmU6rqlZQjXsryCYZ
// 2019-12-03T20:35:37 – Lg6rDbM3Tn2hfKzZRp54
// 2019-12-13T22:29:27 – Sew9uZMCVfFfXS8fgC2P
// 2020-02-08T15:47:36 – 8tW3SjdDscsJrzlHDAvR
// 2020-02-12T07:13:42 – ulfuMCjLxdSKYb4qPQFD
// 2020-02-25T18:18:00 – 5UbXibOY9tEbVl8hK8YF
// 2020-03-06T09:05:55 – PIaGX24FGAJYiUNlHbsB
// 2020-03-24T18:48:51 – GUc7EJvrFsehyDPa0xgx
// 2020-03-24T22:00:11 – R4ms9vT86tZvvtBpbTKe
// 2020-04-25T22:21:07 – 6Xncj7YW0aovFQVMMm9u
// 2020-04-28T16:26:49 – flimSygT7pnjfAkVcxEc
// 2020-05-21T19:57:10 – ziOtVKfNNkOF6RfAcHDB
// 2020-05-26T03:58:52 – 68QGfEyL3TOxbFxk6L9r
// 2020-05-28T01:26:45 – OBMD0YYTiIISTxlAcMxs
// 2020-06-05T01:28:45 – Jl31Nvj4sB3MsAlSRz66
// 2020-06-29T18:38:05 – XHyklBX22u0ffTUvufwb
// 2020-07-07T19:48:09 – 6GgmXYqqyMqXHhx86C0v
// 2020-07-14T23:13:31 – MMDe88up10AootmQjzAr
// 2020-07-17T16:55:44 – mhPlqoK3Tu4OV6I4VVq0
// 2020-07-20T09:48:30 – 8m5DBDyhfuU7YdfndvcK
// 2020-07-20T22:00:56 – ZSMWU0dCkMPmChee4aIj
// 2020-07-21T14:08:46 – 12TtVqGrhzLJVav2lJCO
// 2020-07-23T21:15:56 – taipAdVsRuYZCEh8QSGL
// 2020-08-17T20:12:24 – 8HwSolo29T1CfZlAhpR5
// 2020-08-19T14:15:12 – fTUgRqtQSz5yK9XxAgkx
// 2020-08-24T03:28:54 – tqprN8BlCt3lYrIM43pJ
// 2020-08-24T19:40:27 – 4U8G8qG6ApnYtu1CUqQc
// 2020-09-03T16:54:07 – YgzD3upyyqEBQx0dMhFi
// 2020-09-06T10:52:12 – 8SNzHpUoMtMwvh6XBihN
// 2020-09-10T14:34:49 – xhZX4tjMMIQ8iowbO7F9
// 2020-09-17T21:34:34 – f1IdTMQacd4jaBXG9jWO
// 2020-09-20T19:17:40 – m5oTytFbObjC4f7cQW7Y
// 2020-10-02T17:25:57 – cJFucaGDU0YRcAQDPbDL
// 2020-11-06T14:31:55 – Pk8RqEyZRUfYDOdCeBFj
// 2020-11-21T07:29:14 – ixWzt379EnhTbC6VExVF
// 2020-11-23T21:22:05 – 09XGBUV0cw8aDntbF7uf
// 2020-12-11T20:39:05 – hNEMraxczQlinw51yOuE
// 2020-12-28T13:53:39 – BnIIOSRmH9oZouyzE4yw
// 2021-01-17T14:07:19 – VPsbSlJvtEOo6dwqTgx7
// 2021-01-20T04:10:05 – BZCuW2h5fK0QEN0OwSpQ
// 2021-02-03T18:17:28 – DyTNQ55y22IRZWDhINI3
// 2021-03-18T23:33:57 – W0ws4IDuSmAQajrFjAGR
// 2021-03-19T16:21:06 – rI69s0oxJ1zgxn6abgGh
// 2021-04-05T06:57:20 – JiDbLQcdiDjJXTuIgNAu
// 2021-04-06T04:43:27 – HXPL41mpl9q6hbwiHLZ4
// 2021-04-18T20:25:54 – J9EUPGkessrPa3ey6JJr
// 2021-04-28T10:04:39 – yNHdyYEaYhanDL7h0cfl
// 2021-06-01T05:31:26 – Fophdq7qEgMrdspBMZOr
// 2021-06-05T16:33:08 – 9KEzH53sQGb4K7ip2iiU
// 2021-06-07T16:35:38 – xgCCUFmezVkzW4CQbw88
// 2021-07-15T16:18:51 – 7wlBJ17Fw5ZXPPt3On6N
// 2021-08-03T07:52:35 – zxndTCTdSzNeI7QPW2F6
// 2021-08-28T03:14:50 – dFyLzYN9UrU9Nk02OceR
// 2021-08-31T09:38:10 – UQLTKfVf0aCzyPGx1Ib9
// 2021-09-06T23:20:19 – IzWE1jJ9QibZencfPCcr
// 2021-09-15T13:09:55 – uJ9mx8QrkGkppx1Q53yD
// 2021-09-23T07:04:22 – jxtCbmYVnriiJoP587Q6
// 2021-09-29T08:11:08 – 89ubnub5aIhz7vUJmxbs
// 2021-10-16T07:18:09 – TH6lxKaRgIImmXLCk0ff
// 2021-10-20T04:34:09 – onbB8hFWmi5lnrar6ncw
// 2021-11-28T22:18:27 – SqsYWruehcUFhTthBNeJ
// 2021-12-07T08:18:31 – ZLdWsj5lKHhQcDw6GOwx
// 2021-12-24T22:04:20 – 70SzKqSfZqACc3O8eSxL
// 2021-12-29T20:05:19 – 8WC40dL6I3FtbKO2xOy6
// 2022-01-11T19:58:06 – AYgWQmeSFAzFQtdBaOAX
// 2022-01-24T10:10:06 – uEZYwvsLts3ATwfZdBav
// 2022-01-29T22:34:58 – na0caFJ9BdLmFwXV9tm5
// 2022-02-14T19:11:30 – QgDNXEBARwBdpUsLk76p
// 2022-03-05T23:57:39 – QORVrFkiKeAmdFunG4ws
// 2022-03-15T09:38:09 – sQ81WReiPFijo2hOdUPB
// 2022-03-17T23:59:02 – XIY5DfZjZTNQqOoBBHik
// 2022-03-21T07:35:38 – DMkAaYjQ2QMZPEoC0koS
// 2022-03-31T19:07:25 – og9uRmjbXw5J46Xu7Lu7
// 2022-04-18T05:27:47 – W2D1UeK48Br5GrRy2huk
// 2022-04-28T05:06:34 – 756XpPJJDjNwZP59UtDv
// 2022-05-13T19:54:12 – ZGT4RMJ6b3nz0Fpo0yzD
// 2022-05-18T22:27:13 – pCFpQYH6Z4DcBCfXzr2e
// 2022-06-03T06:38:53 – b13gz8KAdLmLh4vPU6y3
// 2022-06-17T12:14:23 – ycBU2dtzNKiB114ZFNUS
// 2022-06-19T19:38:33 – kSiV2LfVv8gKfFm5VLPp
// 2022-06-21T10:53:46 – YLha22cwFJTD1EMAVxeM
// 2022-08-03T05:32:22 – LsIMNXXkkTsIJ1k3lv2a
// 2022-08-12T19:05:16 – i1IPycs5DufJuZjqcX6X
// 2022-08-14T04:40:39 – 7npsqacKHcEbutCX8ytp
// 2022-08-17T10:41:53 – EIylLMq5kInwqA6HvMCv
// 2022-10-09T12:41:26 – 0UX4K77rbh7xFGfZbLR9
// 2022-10-12T08:56:01 – CvR3tClBY9fDCIbDzxmF
// 2022-10-20T15:47:02 – LpbF4SHgGJiGCkeiwoT0
// 2022-10-31T22:05:23 – BdbewRn8K3N94EUPmZHc
// 2022-11-07T21:11:58 – xsyyWXgTzgfI3MPdqtxM
// 2022-11-20T04:31:03 – u2to9X9s7761B8mCvbol
// 2022-11-20T17:37:07 – Cr2IqMTO55X1w54WW7Rj
// 2022-11-23T12:19:31 – ATQUIW5XyibIzoHkM2zM
// 2022-12-18T04:49:46 – kTTKBsl8MQvqQXzORBC8
// 2023-01-03T05:44:43 – fPQpaxc88x9mUm6npuGK
// 2023-01-04T13:51:52 – KBR1jV0TVzYrOgcVzIg0
// 2023-01-06T04:33:09 – bFQB4C2ShvfYuK4xpqbp
// 2023-01-16T18:38:09 – R8mLhdJyZte0EoV3uUee
// 2023-01-17T16:20:47 – 0f5bGSe7kpJhiFSTJ00h
// 2023-01-20T04:13:44 – Bc5bjtXMAThySrmeO8Ko
// 2023-01-20T22:53:23 – WH7DN68rusIAf96XfhjI
// 2023-01-21T18:01:05 – 5TlUxPy2Udj9n8NVKeYB
// 2023-02-17T23:52:02 – RbrKZBcfIlRfTwY4RNRp
// 2023-02-22T23:24:26 – dHRklkHPcrrirY31CVKP
// 2023-03-17T00:38:11 – pWE39gg1UEcDViy1LTsf
// 2023-03-18T22:22:39 – s8eCkaK2GIdcE8R0VLvL
// 2023-03-29T10:50:24 – GXmUJYf0BOsYuRnzVKzv
// 2023-04-09T01:49:23 – kzI7wXvGV9aRySvfWmVy
// 2023-04-27T03:06:39 – dNCS7iIUlKtmvmisb0OO
// 2023-04-27T15:58:38 – BNPu4SXhj7XZCqBQmVfR
// 2023-04-29T04:45:05 – L1Kh2nKrFPAwcQFcxvSk
// 2023-05-12T01:43:01 – rRT2D271QZdStyM2JJU6
// 2023-06-03T23:54:40 – Ah14lWAlTLb0jSHNSFk9
// 2023-06-06T01:41:42 – iWdkPhQYjBAVjkkJUnQE
// 2023-06-15T16:35:14 – hXeiP5CaAACufX05U7bg
// 2023-06-19T18:00:28 – t7f96iX5BhmLUzoGROOG
// 2023-06-22T01:04:50 – WYWbUmEP8p93exYNMWR4
// 2023-06-24T23:50:01 – HF2EmyLo79K370IKmAu6
// 2023-07-16T21:00:44 – WZoiULGspeYQE794UQRV
// 2023-07-26T19:49:36 – vzVaXnR2hGN0oVMqRep9
// 2023-08-04T08:19:54 – j7zrh6SEKWpgi1QERDU0
// 2023-08-21T20:33:44 – HTy5Tn5CV2EOeCwDt05R
// 2023-08-23T19:19:49 – vDiGHytMf5xnU2F66n7p
// 2023-09-04T14:38:07 – qWZa6FYI2LnjBhZBAg2j
// 2023-09-10T09:24:42 – 0gqxyDwN49vTY8wrrggG
// 2023-09-27T14:19:30 – dT6nAtvdGaxnUlacPvHW
// 2023-09-30T21:59:45 – DajJ01TDoNlRldfHOPlk
// 2023-10-01T05:36:31 – 2ayil1xOXN2NvcdAUj9L
// 2023-10-05T04:57:13 – sZFIqzrCya59d7OiuBQc
// 2023-10-09T13:37:59 – 0Dcdn8c0EFJeAztTHb2n
// 2023-10-10T16:01:12 – x724pqfUusuPd87QnyTW
// 2023-11-01T19:15:15 – QWDJyjBCZJDPUL8Rv3sJ
// 2023-11-10T10:03:20 – 48SbbY3RyIkNfL35Nxqc
// 2023-11-15T08:20:27 – y40lePMoDTSxdSIxjckq
// 2023-11-25T10:59:06 – 3DmM22TfUoZiE3ua6ts4
// 2023-11-30T20:03:17 – MgZLvnKvFKtn2aO40n1P
// 2023-12-12T11:33:30 – 9UgeH3gIsByFQQmrvMIo
// 2024-01-02T22:35:09 – H1H0YYWoahiwA7IuU0PR
// 2024-01-07T03:44:57 – DS1oQuFCYqmpN4irQopZ
// 2024-01-16T23:00:12 – UVtNV3mlkSCKLp03sWIh
// 2024-02-03T08:04:17 – j17nQhpfvsffSQyoUgbh
// 2024-02-23T10:17:17 – QzWfOJ15XQuL2vEnV4fU
// 2024-02-23T22:03:01 – 69S1jLNaybwhDtHJkd99
// 2024-02-26T13:43:27 – qANrh8GCuLD0uGhFCRRq
