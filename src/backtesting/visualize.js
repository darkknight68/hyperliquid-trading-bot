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
// 2019-07-21T01:12:06 – Cvi6g7j5HIffJ41BGnuk
// 2019-07-28T10:54:32 – OEW7ARQzRNNwqr1oXNke
// 2019-08-06T09:52:51 – 1Bju8b4wKBv3bU8wA8ON
// 2019-08-27T14:51:27 – HYRKiTEFVbhqFhu8A2bH
// 2019-09-19T13:38:28 – sr9Fz1ed8rgCMqmSo4OB
// 2019-09-23T06:26:42 – Yg1NQon05G6LPweENvSB
// 2019-09-27T09:24:28 – XI9saRyKVNSdciVdlFoR
// 2019-10-31T02:19:40 – zfcIcTrojNwNzrpTcjyT
// 2019-11-05T13:17:52 – VJz0psuP7znBDexmfGKl
// 2019-11-18T00:25:09 – v1DEGMutpKRdTYhxzwH3
// 2019-12-03T20:19:08 – ud3hmTsdVCRStum9Rtk5
// 2019-12-07T15:37:30 – DZ7wVSalZTOmcWmLnZIs
// 2019-12-23T22:01:55 – hsLPlKRokJ21Vuqun5Vk
// 2020-01-10T15:01:14 – tHWDrKCSuiktonUnPwAe
// 2020-01-12T16:47:43 – bMMML7GQkfzQEPpzSlCs
// 2020-02-01T18:37:27 – iX8o7V8yk4SIrMUVJ0yk
// 2020-02-03T20:46:40 – 9unxl2Y2r35MhSZjFFQh
// 2020-03-13T10:03:02 – cwmZjWTbIEvABx9HQJid
// 2020-03-18T17:16:50 – NuCgatVRt9L4So5cpYjc
// 2020-03-25T08:43:26 – YHIk4J3ISmeH4DpkOlGN
// 2020-04-27T12:33:29 – vCpF7IMsKAUZ7DhsUlvr
// 2020-05-03T05:12:50 – mUaWHGAmthH4h7qAQ3EN
// 2020-05-27T17:43:09 – kyz2WOTzkDNoHy03kVc1
// 2020-06-03T18:19:06 – eIhFKvTNVCLqLI5Gojna
// 2020-06-21T22:20:10 – lLpP2AfQAe9Ispski0YB
// 2020-07-07T16:58:51 – V7zxKsNFhNdfG3eePWod
