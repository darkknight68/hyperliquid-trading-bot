const BacktestVisualizer = require("./visualization")

async function main() {
    // Create visualizer
    const visualizer = new BacktestVisualizer()

    // Load data
    const dataLoaded = visualizer.loadData()
    if (!dataLoaded) {
        console.error("Failed to load backtest data. Run a backtest first!")
        process.exit(1)
    }

    // Generate all charts
    console.log("Generating visualization charts...")
    visualizer.generateAllCharts()
    console.log("Done! Check the backtest_summary.html file for results.")
}

main().catch(console.error)

// ASHDLADXZCZC
// 2019-07-16T22:35:18 – UWL7hbCMGhTlcl0tAFyx
// 2019-07-20T17:17:51 – 6Nn6B9G3lGorLVxYG9i6
