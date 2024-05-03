/**
 * ML Optimizer for trading strategies
 * Implements machine learning models to optimize strategy parameters
 * and identify important features/indicators
 */

const fs = require("fs")
const path = require("path")
const util = require("util")
const childProcess = require("child_process")
const exec = util.promisify(childProcess.exec)

// Constants
const DATA_FOLDER = "ml_data"
const MODELS_FOLDER = "ml_models"
const PYTHON_SCRIPT_PATH = path.join(__dirname, "python", "ml_train.py")

class MLOptimizer {
    constructor(options = {}) {
        // Ensure required folders exist
        this.ensureFoldersExist()

        // Base options
        this.datasetSize = options.datasetSize || 1000 // Number of backtests to run for data collection
        this.targetMetric = options.targetMetric || "totalProfitLoss"
        this.validationSplit = options.validationSplit || 0.2
        this.modelType = options.modelType || "randomforest" // randomforest, xgboost, or neuralnetwork
        this.featureImportanceMethod = options.featureImportanceMethod || "shap" // shap or permutation

        // Parameter ranges for training
        this.parameterRanges = options.parameterRanges || {
            // Default parameter ranges for the BBRSI strategy
            rsiPeriod: { min: 5, max: 30, step: 1, type: "int" },
            rsiOverbought: { min: 65, max: 85, step: 1, type: "int" },
            rsiOversold: { min: 15, max: 35, step: 1, type: "int" },
            bbPeriod: { min: 10, max: 50, step: 2, type: "int" },
            bbStdDev: { min: 1.5, max: 3.5, step: 0.1, type: "float" },
            adxPeriod: { min: 7, max: 30, step: 1, type: "int" },
            adxThreshold: { min: 15, max: 35, step: 1, type: "int" },
            // Backtester parameters
            leverage: { min: 1, max: 10, step: 1, type: "int" },
            positionSize: { min: 0.05, max: 0.5, step: 0.05, type: "float" },
            profitTarget: { min: 1.1, max: 3.0, step: 0.1, type: "float" },
        }

        // Technical indicators to use as features
        this.technicalIndicators = options.technicalIndicators || [
            "rsi",
            "bollinger_bands",
            "adx",
            "macd",
            "ema",
            "atr",
            "obv",
            "vwap",
            "price_change",
        ]

        // Market data settings
        this.market = options.market || "BTC-PERP"
        this.timeframe = options.timeframe || "15m"

        // Path to store the dataset
        this.datasetPath = path.join(DATA_FOLDER, `${this.market}_${this.timeframe}_dataset.csv`)

        // Results storage
        this.optimizedParameters = null
        this.featureImportance = null
        this.modelMetrics = null
        this.hasPythonDependencies = false
    }

    /**
     * Ensure required folders exist
     */
    ensureFoldersExist() {
        if (!fs.existsSync(DATA_FOLDER)) {
            fs.mkdirSync(DATA_FOLDER, { recursive: true })
        }

        if (!fs.existsSync(MODELS_FOLDER)) {
            fs.mkdirSync(MODELS_FOLDER, { recursive: true })
        }

        if (!fs.existsSync(path.join(__dirname, "python"))) {
            fs.mkdirSync(path.join(__dirname, "python"), { recursive: true })
        }
    }

    /**
     * Check for required Python dependencies
     */
    async checkPythonDependencies() {
        try {
            // Try to run Python and check for numpy, pandas, scikit-learn
            const { stdout, stderr } = await exec(
                'python -c "import numpy, pandas, sklearn, xgboost, shap"',
            )
            this.hasPythonDependencies = true
            console.log("Python dependencies verified.")
            return true
        } catch (error) {
            console.error("Missing Python dependencies. Please install the required packages:")
            console.error("pip install numpy pandas scikit-learn xgboost shap matplotlib")
            this.hasPythonDependencies = false
            return false
        }
    }

    /**
     * Generate a dataset by running multiple backtests with different parameters
     */
    async generateDataset() {
        console.log(`Generating ML dataset with ${this.datasetSize} samples...`)

        // Create a CSV file for the dataset
        const headerRow = this.createDatasetHeader()
        fs.writeFileSync(this.datasetPath, headerRow + "\n")

        // Run backtests with different parameter combinations
        for (let i = 0; i < this.datasetSize; i++) {
            const parameters = this.generateRandomParameters()

            // Log progress every 10%
            if (i % Math.max(1, Math.floor(this.datasetSize / 10)) === 0) {
                console.log(`Progress: ${Math.round((i / this.datasetSize) * 100)}%`)
            }

            try {
                // Run backtest with these parameters
                const result = await this.runBacktest(parameters)

                // Extract features and target metrics
                const dataRow = this.extractFeaturesAndTarget(parameters, result)

                // Append to dataset
                fs.appendFileSync(this.datasetPath, dataRow + "\n")
            } catch (error) {
                console.error(`Error in backtest run ${i}:`, error.message)
                // Continue with next iteration
            }
        }

        console.log(`Dataset generation completed. Dataset saved to ${this.datasetPath}`)
        return this.datasetPath
    }

    /**
     * Create the header row for the dataset
     */
    createDatasetHeader() {
        // Parameter names form the first columns
        const parameterNames = Object.keys(this.parameterRanges)

        // Then technical indicator feature names
        const featureNames = []
        this.technicalIndicators.forEach((indicator) => {
            // Each indicator might have multiple features
            switch (indicator) {
                case "rsi":
                    featureNames.push("rsi_value", "rsi_slope", "rsi_divergence")
                    break
                case "bollinger_bands":
                    featureNames.push(
                        "bb_width",
                        "bb_percent_b",
                        "price_to_upper",
                        "price_to_lower",
                    )
                    break
                case "adx":
                    featureNames.push("adx_value", "di_plus", "di_minus")
                    break
                case "macd":
                    featureNames.push("macd_value", "macd_signal", "macd_histogram")
                    break
                case "ema":
                    featureNames.push("ema_fast", "ema_slow", "ema_ratio")
                    break
                case "atr":
                    featureNames.push("atr_value", "atr_percent")
                    break
                case "obv":
                    featureNames.push("obv_value", "obv_slope")
                    break
                case "vwap":
                    featureNames.push("vwap_value", "price_to_vwap")
                    break
                case "price_change":
                    featureNames.push("daily_return", "weekly_return", "volatility")
                    break
                default:
                    featureNames.push(indicator)
            }
        })

        // Target metrics as the last columns
        const targetMetrics = [
            "totalProfitLoss",
            "sharpeRatio",
            "maxDrawdown",
            "winRate",
            "profitFactor",
        ]

        // Combine all columns
        return [...parameterNames, ...featureNames, ...targetMetrics].join(",")
    }

    /**
     * Generate a random set of parameters within defined ranges
     */
    generateRandomParameters() {
        const parameters = {}

        Object.entries(this.parameterRanges).forEach(([param, range]) => {
            const { min, max, step, type } = range
            let value

            if (type === "int") {
                // Generate random integer
                const steps = Math.floor((max - min) / step) + 1
                value = min + Math.floor(Math.random() * steps) * step
            } else if (type === "float") {
                // Generate random float
                const steps = Math.floor((max - min) / step) + 1
                value = min + Math.floor(Math.random() * steps) * step
                value = parseFloat(value.toFixed(2)) // Round to 2 decimal places
            } else if (type === "boolean") {
                // Generate random boolean
                value = Math.random() >= 0.5
            } else {
                // Default to float
                value = min + Math.random() * (max - min)
                value = parseFloat(value.toFixed(2))
            }

            parameters[param] = value
        })

        return parameters
    }

    /**
     * Run a backtest with specific parameters
     */
    async runBacktest(parameters) {
        // Create a temporary configuration file for this backtest
        const configPath = path.join(DATA_FOLDER, `temp_config_${Date.now()}.json`)
        fs.writeFileSync(configPath, JSON.stringify(parameters, null, 2))

        // Run the backtester with these parameters
        const Backtester = require("./Backtester")
        const backtester = new Backtester({
            market: this.market,
            timeframe: this.timeframe,
            ...parameters,
        })

        try {
            const results = await backtester.runBacktest(true) // Silent mode

            // Clean up config
            fs.unlinkSync(configPath)

            return results
        } catch (error) {
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath)
            }
            throw error
        }
    }

    /**
     * Extract features and target metrics from backtest results
     */
    extractFeaturesAndTarget(parameters, result) {
        // Start with parameters
        const values = Object.values(parameters).map((p) => p.toString())

        // Extract technical indicator features from the last data point
        // (This would come from the actual data in a real implementation)
        // Here we're just creating placeholder values
        const features = []
        this.technicalIndicators.forEach((indicator) => {
            switch (indicator) {
                case "rsi":
                    features.push(Math.random() * 100) // rsi_value
                    features.push(Math.random() * 2 - 1) // rsi_slope
                    features.push(Math.random() * 2 - 1) // rsi_divergence
                    break
                case "bollinger_bands":
                    features.push(Math.random() * 5) // bb_width
                    features.push(Math.random()) // bb_percent_b
                    features.push(Math.random() * 0.05) // price_to_upper
                    features.push(Math.random() * 0.05) // price_to_lower
                    break
                case "adx":
                    features.push(Math.random() * 100) // adx_value
                    features.push(Math.random() * 50) // di_plus
                    features.push(Math.random() * 50) // di_minus
                    break
                case "macd":
                    features.push(Math.random() * 100 - 50) // macd_value
                    features.push(Math.random() * 100 - 50) // macd_signal
                    features.push(Math.random() * 40 - 20) // macd_histogram
                    break
                case "ema":
                    features.push(Math.random() * 1000) // ema_fast
                    features.push(Math.random() * 1000) // ema_slow
                    features.push(0.8 + Math.random() * 0.4) // ema_ratio
                    break
                case "atr":
                    features.push(Math.random() * 100) // atr_value
                    features.push(Math.random() * 0.1) // atr_percent
                    break
                case "obv":
                    features.push(Math.random() * 1000000) // obv_value
                    features.push(Math.random() * 2 - 1) // obv_slope
                    break
                case "vwap":
                    features.push(Math.random() * 1000) // vwap_value
                    features.push(0.9 + Math.random() * 0.2) // price_to_vwap
                    break
                case "price_change":
                    features.push(Math.random() * 0.1 - 0.05) // daily_return
                    features.push(Math.random() * 0.2 - 0.1) // weekly_return
                    features.push(Math.random() * 0.05) // volatility
                    break
                default:
                    features.push(Math.random())
            }
        })

        // Add target metrics
        const targetMetrics = [
            result.metrics.totalProfitLoss,
            result.metrics.sharpeRatio || 0,
            result.metrics.maxDrawdown || 0,
            result.metrics.winRate || 0,
            result.metrics.profitFactor || 0,
        ]

        // Combine all values
        return [
            ...values,
            ...features.map((f) => f.toString()),
            ...targetMetrics.map((t) => t.toString()),
        ].join(",")
    }

    /**
     * Create the Python ML script for training
     */
    createPythonTrainingScript() {
        const scriptContent = `
# Machine Learning model for strategy optimization
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import pickle
import json
import os
import sys
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import xgboost as xgb
from xgboost import XGBRegressor
import shap

# Arguments
dataset_path = sys.argv[1]
output_path = sys.argv[2]
model_type = sys.argv[3]
target_column = sys.argv[4]
feature_importance_method = sys.argv[5]

# Load dataset
print(f"Loading dataset from {dataset_path}")
data = pd.read_csv(dataset_path)

# Get parameter columns (first n columns before the technical indicators)
param_columns = [col for col in data.columns if col not in 
                ['totalProfitLoss', 'sharpeRatio', 'maxDrawdown', 'winRate', 'profitFactor']]
param_columns = param_columns[:len(${JSON.stringify(Object.keys(this.parameterRanges))})]

# Feature columns (technical indicators)
feature_columns = [col for col in data.columns if col not in 
                  [...param_columns, 'totalProfitLoss', 'sharpeRatio', 'maxDrawdown', 'winRate', 'profitFactor']]

# Print info
print(f"Parameters: {param_columns}")
print(f"Features: {feature_columns}")
print(f"Target column: {target_column}")
print(f"Model type: {model_type}")

# Prepare input and output data
X = data[param_columns + feature_columns]  # Parameters + Technical indicators
y = data[target_column]                  # Target metric

# Split data into training and validation sets
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

# Standardize features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_val_scaled = scaler.transform(X_val)

# Save scaler for later use
with open(os.path.join(output_path, 'scaler.pkl'), 'wb') as f:
    pickle.dump(scaler, f)

# Train the model
if model_type == 'randomforest':
    print("Training Random Forest model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Feature importance
    if feature_importance_method == 'shap':
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_val_scaled)
        feature_importance = np.abs(shap_values).mean(0)
    else:  # permutation
        from sklearn.inspection import permutation_importance
        result = permutation_importance(model, X_val_scaled, y_val, n_repeats=10, random_state=42)
        feature_importance = result.importances_mean

elif model_type == 'xgboost':
    print("Training XGBoost model...")
    model = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Feature importance
    if feature_importance_method == 'shap':
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_val_scaled)
        feature_importance = np.abs(shap_values).mean(0)
    else:  # permutation
        from sklearn.inspection import permutation_importance
        result = permutation_importance(model, X_val_scaled, y_val, n_repeats=10, random_state=42)
        feature_importance = result.importances_mean
    
elif model_type == 'neuralnetwork':
    print("Training Neural Network model...")
    from sklearn.neural_network import MLPRegressor
    model = MLPRegressor(hidden_layer_sizes=(100, 50), max_iter=1000, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Feature importance for neural network (permutation only)
    from sklearn.inspection import permutation_importance
    result = permutation_importance(model, X_val_scaled, y_val, n_repeats=10, random_state=42)
    feature_importance = result.importances_mean

# Evaluate model
y_pred_train = model.predict(X_train_scaled)
y_pred_val = model.predict(X_val_scaled)

# Calculate metrics
train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
val_rmse = np.sqrt(mean_squared_error(y_val, y_pred_val))
train_r2 = r2_score(y_train, y_pred_train)
val_r2 = r2_score(y_val, y_pred_val)

print(f"Train RMSE: {train_rmse:.4f}")
print(f"Validation RMSE: {val_rmse:.4f}")
print(f"Train R²: {train_r2:.4f}")
print(f"Validation R²: {val_r2:.4f}")

# Save model
model_filename = os.path.join(output_path, f"{model_type}_{target_column}.pkl")
with open(model_filename, 'wb') as f:
    pickle.dump(model, f)

# Sort feature importance and get corresponding names
importance_indices = np.argsort(feature_importance)[::-1]
feature_names = np.array(param_columns + feature_columns)
sorted_feature_importance = feature_importance[importance_indices]
sorted_feature_names = feature_names[importance_indices]

# Save feature importance
feature_importance_dict = {
    'feature_names': sorted_feature_names.tolist(),
    'importance_values': sorted_feature_importance.tolist()
}

with open(os.path.join(output_path, 'feature_importance.json'), 'w') as f:
    json.dump(feature_importance_dict, f, indent=2)

# Plot feature importance
plt.figure(figsize=(12, 8))
plt.barh(range(len(sorted_feature_names)), sorted_feature_importance)
plt.yticks(range(len(sorted_feature_names)), sorted_feature_names)
plt.xlabel('Feature Importance')
plt.title(f'Feature Importance for {target_column} ({model_type})')
plt.tight_layout()
plt.savefig(os.path.join(output_path, 'feature_importance.png'))

# Find optimal parameters
param_importance = {}
for i, name in enumerate(param_columns):
    # Find the index of this parameter in the feature names array
    idx = np.where(feature_names == name)[0][0]
    param_importance[name] = feature_importance[idx]

# Sort parameters by importance
sorted_params = sorted(param_importance.items(), key=lambda x: x[1], reverse=True)
print("\\nParameter importance:")
for param, imp in sorted_params:
    print(f"{param}: {imp:.4f}")

# Save model metrics
metrics = {
    'train_rmse': float(train_rmse),
    'val_rmse': float(val_rmse),
    'train_r2': float(train_r2),
    'val_r2': float(val_r2),
    'parameter_importance': {param: float(imp) for param, imp in sorted_params}
}

with open(os.path.join(output_path, 'model_metrics.json'), 'w') as f:
    json.dump(metrics, f, indent=2)

# Use the model to predict the optimal parameters
from scipy.optimize import differential_evolution

# Define the objective function for optimization
def objective(params_array):
    # Create a copy of a random data sample for its feature values
    sample_idx = np.random.randint(0, len(X_val))
    sample = X_val.iloc[sample_idx].copy()
    
    # Update parameter values (keeping feature values the same)
    for i, param in enumerate(param_columns):
        sample[param] = params_array[i]
    
    # Scale the features
    sample_scaled = scaler.transform(sample.values.reshape(1, -1))
    
    # Predict the target value (negative because we want to maximize)
    prediction = model.predict(sample_scaled)[0]
    
    # If trying to minimize (e.g., drawdown), return positive value
    if target_column in ['maxDrawdown']:
        return prediction
    
    # For metrics we want to maximize, return negative
    return -prediction

# Define bounds for each parameter
bounds = []
for param in param_columns:
    param_range = ${JSON.stringify(this.parameterRanges)}[param]
    bounds.append((param_range['min'], param_range['max']))

# Run the optimization
result = differential_evolution(objective, bounds, maxiter=100, popsize=20, recombination=0.7)

# Get the optimal parameters
optimal_params = {}
for i, param in enumerate(param_columns):
    param_range = ${JSON.stringify(this.parameterRanges)}[param]
    value = result.x[i]
    
    # Round according to parameter type
    if param_range['type'] == 'int':
        value = int(round(value))
    elif param_range['type'] == 'float':
        value = round(value, 2)
    
    optimal_params[param] = value

print("\\nOptimal Parameters:")
for param, value in optimal_params.items():
    print(f"{param}: {value}")

# Save optimal parameters
with open(os.path.join(output_path, 'optimal_parameters.json'), 'w') as f:
    json.dump(optimal_params, f, indent=2)

print("\\nTraining completed successfully.")
print(f"Results saved to {output_path}")
        `

        // Write the script to disk
        const scriptPath = PYTHON_SCRIPT_PATH
        fs.writeFileSync(scriptPath, scriptContent)

        return scriptPath
    }

    /**
     * Train the ML model
     */
    async trainModel() {
        // Check for Python dependencies
        const hasDependencies = await this.checkPythonDependencies()
        if (!hasDependencies) {
            throw new Error("Missing Python dependencies")
        }

        // Generate dataset or use existing one
        if (!fs.existsSync(this.datasetPath)) {
            await this.generateDataset()
        } else {
            console.log(`Using existing dataset at ${this.datasetPath}`)
        }

        // Create Python training script
        const scriptPath = this.createPythonTrainingScript()

        // Create output folder for model
        const outputFolder = path.join(
            MODELS_FOLDER,
            `${this.market}_${this.timeframe}_${this.modelType}`,
        )
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true })
        }

        console.log(`Training ${this.modelType} model for ${this.targetMetric}...`)

        try {
            // Run Python script
            const { stdout, stderr } = await exec(
                `python "${scriptPath}" "${this.datasetPath}" "${outputFolder}" "${this.modelType}" "${this.targetMetric}" "${this.featureImportanceMethod}"`,
            )

            console.log("Python training output:")
            console.log(stdout)

            if (stderr) {
                console.error("Python training errors:")
                console.error(stderr)
            }

            // Load results
            const optimalParamsPath = path.join(outputFolder, "optimal_parameters.json")
            const featureImportancePath = path.join(outputFolder, "feature_importance.json")
            const metricsPath = path.join(outputFolder, "model_metrics.json")

            if (fs.existsSync(optimalParamsPath)) {
                this.optimizedParameters = JSON.parse(fs.readFileSync(optimalParamsPath, "utf8"))
            }

            if (fs.existsSync(featureImportancePath)) {
                this.featureImportance = JSON.parse(fs.readFileSync(featureImportancePath, "utf8"))
            }

            if (fs.existsSync(metricsPath)) {
                this.modelMetrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"))
            }

            console.log("Model training completed successfully.")
            return {
                optimizedParameters: this.optimizedParameters,
                featureImportance: this.featureImportance,
                modelMetrics: this.modelMetrics,
            }
        } catch (error) {
            console.error("Error training ML model:", error)
            throw error
        }
    }

    /**
     * Get the most important features from the trained model
     */
    getImportantFeatures(topN = 10) {
        if (!this.featureImportance) {
            throw new Error("No feature importance data available. Train a model first.")
        }

        const { feature_names, importance_values } = this.featureImportance

        // Get top N features
        const result = feature_names
            .map((name, i) => ({ name, importance: importance_values[i] }))
            .slice(0, topN)

        return result
    }

    /**
     * Get the optimized strategy parameters
     */
    getOptimizedParameters() {
        if (!this.optimizedParameters) {
            throw new Error("No optimized parameters available. Train a model first.")
        }

        return this.optimizedParameters
    }

    /**
     * Generate a report on model performance and feature importance
     */
    generateReport(outputFile = "ml_optimization_report.html") {
        if (!this.modelMetrics || !this.featureImportance || !this.optimizedParameters) {
            throw new Error("No model results available. Train a model first.")
        }

        // Create HTML content
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>ML Strategy Optimization Results</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #4CAF50; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                tr:hover { background-color: #ddd; }
                .metric-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 10px; flex: 1; min-width: 200px; }
                .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .metric-label { font-size: 14px; color: #666; }
                .metrics-container { display: flex; flex-wrap: wrap; margin-bottom: 30px; }
                .bar-chart { margin: 20px 0; }
                .bar { height: 25px; margin: 5px 0; background-color: #4CAF50; }
                .bar-label { display: inline-block; width: 200px; }
                .bar-value { display: inline-block; margin-left: 10px; }
            </style>
        </head>
        <body>
            <h1>Machine Learning Strategy Optimization Results</h1>
            
            <div class="metrics-container">
                <div class="metric-box">
                    <div class="metric-label">Model Type</div>
                    <div class="metric-value">${this.modelType}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Target Metric</div>
                    <div class="metric-value">${this.targetMetric}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Validation R²</div>
                    <div class="metric-value">${this.modelMetrics.val_r2.toFixed(4)}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Validation RMSE</div>
                    <div class="metric-value">${this.modelMetrics.val_rmse.toFixed(4)}</div>
                </div>
            </div>
            
            <h2>Optimal Strategy Parameters</h2>
            <table>
                <tr>
                    <th>Parameter</th>
                    <th>Optimal Value</th>
                    <th>Importance</th>
                </tr>
                ${Object.entries(this.optimizedParameters)
                    .map(([param, value]) => {
                        const importance = this.modelMetrics.parameter_importance[param] || 0
                        return `
                        <tr>
                            <td>${param}</td>
                            <td>${value}</td>
                            <td>${importance.toFixed(4)}</td>
                        </tr>
                        `
                    })
                    .join("")}
            </table>
            
            <h2>Feature Importance</h2>
            <div class="bar-chart">
                ${this.featureImportance.feature_names
                    .slice(0, 20) // Show top 20 features
                    .map((feature, i) => {
                        const importance = this.featureImportance.importance_values[i]
                        const maxImportance = Math.max(...this.featureImportance.importance_values)
                        const widthPercent = (importance / maxImportance) * 100

                        return `
                        <div>
                            <span class="bar-label">${feature}</span>
                            <div class="bar" style="width: ${widthPercent}%;"></div>
                            <span class="bar-value">${importance.toFixed(4)}</span>
                        </div>
                        `
                    })
                    .join("")}
            </div>
            
            <h2>Model Performance Metrics</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Training</th>
                    <th>Validation</th>
                </tr>
                <tr>
                    <td>RMSE</td>
                    <td>${this.modelMetrics.train_rmse.toFixed(4)}</td>
                    <td>${this.modelMetrics.val_rmse.toFixed(4)}</td>
                </tr>
                <tr>
                    <td>R²</td>
                    <td>${this.modelMetrics.train_r2.toFixed(4)}</td>
                    <td>${this.modelMetrics.val_r2.toFixed(4)}</td>
                </tr>
            </table>
            
            <h2>Next Steps</h2>
            <p>
                Use the optimal parameters in your strategy:
                <pre>
const strategy = new BBRSIStrategy({
    ${Object.entries(this.optimizedParameters)
        .map(([param, value]) => `    ${param}: ${value}`)
        .join(",\n")}
});
                </pre>
            </p>
            
            <p>
                Focus on the most important features for further optimization:
                <ul>
                    ${this.getImportantFeatures(5)
                        .map(
                            ({ name, importance }) =>
                                `<li>${name} (importance: ${importance.toFixed(4)})</li>`,
                        )
                        .join("")}
                </ul>
            </p>
        </body>
        </html>
        `

        // Write the report to file
        fs.writeFileSync(outputFile, html)
        console.log(`ML optimization report saved to ${outputFile}`)
        return outputFile
    }
}

module.exports = MLOptimizer

// ASHDLADXZCZC
// 2019-07-12T11:18:32 – aJ0velfU9ivBuSpUTAAB
// 2019-07-13T09:00:42 – Tvy3jf71cbRGJF0IF4rQ
// 2019-07-15T07:18:17 – 3ULrEBZEPFb13U5JTFzG
// 2019-08-07T16:40:20 – fPGS8qph3wA02viiKLT3
// 2019-08-09T08:33:19 – Uvw5fVneZjPz7dqlultk
// 2019-08-24T13:14:44 – Scnnh7PLon8zZ09T6SOs
// 2019-09-21T15:46:40 – 0tNRsjILoMcPGjPo5d7r
// 2019-09-26T07:48:32 – DWTPQgzcHgL016TRvWWc
// 2019-09-30T17:40:50 – SDDQZD7s4pFxwNEG8E73
// 2019-10-04T06:59:20 – N6pcIgQQbRJRulfcGsWF
// 2019-10-06T07:39:06 – KwI7t61cTc74aFRGiJ2A
// 2019-11-04T20:50:44 – sNjPk2nPJrEmHNq6wx7Z
// 2019-11-10T11:45:57 – SxAVL0ZhzN2yFpUBeqxM
// 2019-11-30T23:45:12 – OAnel7MB2O7189jUgZoJ
// 2019-12-03T08:58:25 – 7xbksDeIY0rO6rsBsek8
// 2020-01-05T05:00:09 – 73QsepFTwk7kAc1R7xF6
// 2020-01-07T22:57:12 – gmfp8bXU8iG8AZp1yoAk
// 2020-01-11T08:13:53 – AVcBfm7yOERPfeq2xWIh
// 2020-01-17T06:46:13 – g2e0EjmcjBpTAcaIROMQ
// 2020-01-19T22:43:24 – CaxAIM044wwCOHDVsfyx
// 2020-01-22T09:13:27 – PEq5raMQgP1bGWYpmWXw
// 2020-01-26T03:17:46 – 4Zf5Ew1XYwcJVL0dqrdg
// 2020-01-31T04:11:56 – CFiuNtp2rWvMvKLaIyyX
// 2020-02-05T06:02:35 – alBGHOKb7R66VR70C021
// 2020-02-17T17:58:26 – BeeGe9mZRguDAIFMxdg4
// 2020-03-01T11:03:35 – r1BclhUCRiSIVbYB9lwi
// 2020-03-04T00:24:29 – pDLAtdpk1k49M3EHN0M6
// 2020-04-11T11:54:39 – 2XPdhhHcXJwG9J9pLvKl
// 2020-04-11T12:30:12 – 1gvg12bwbYBcSe7qAPrj
// 2020-04-21T02:46:09 – OKneRcQbp17mzYHW3Uvz
// 2020-04-25T06:53:23 – LcwuGTkfoClaaR42XnTp
// 2020-05-01T03:01:49 – vQ9wC42w3yJpQOL8RO2Z
// 2020-05-14T15:32:46 – aAcD0rrnToFlrT8Du93j
// 2020-05-18T14:41:23 – MsEgX7tGiwM3GKRdzHd1
// 2020-05-20T02:18:57 – gKR3RawdNek2VXMOggae
// 2020-05-25T06:11:09 – cIiznm8a0mV14mAsw40i
// 2020-05-31T00:31:02 – VfUkzjXfU06URFXK4B6V
// 2020-06-15T11:26:20 – fA6wpoJonBg6PsM226d0
// 2020-06-18T15:41:26 – H19v4EwxTL7dgWTlTu9j
// 2020-06-21T05:14:24 – aGbbpXy3ZsXrtowlzNb9
// 2020-06-23T06:27:54 – DnCzFtXJyTrcdGFXOxRI
// 2020-06-23T12:20:32 – aflEGna1fSb8xLNTVCdl
// 2020-06-26T19:29:21 – MBZsuRv079YcfxnWk92I
// 2020-07-16T11:16:42 – bMcGkVhw8Bd4GbFEuK8s
// 2020-07-22T00:04:38 – tITr88AgydM0BgbvSme1
// 2020-07-24T12:30:37 – RwyI9ObkM6xF8Ko00L45
// 2020-07-26T00:45:19 – eoEO5p9cSYGn4yeUeHQe
// 2020-07-28T17:02:17 – uNoxpqRlNqnQFfS6C1VI
// 2020-08-08T20:13:15 – URRBW4abRtCdI4KpSoZN
// 2020-08-09T20:04:22 – Obsf0WhbD0dindKU6l9i
// 2020-09-09T01:42:00 – oZj3JF6mue0UyZruLVqb
// 2020-09-17T09:23:27 – dciSMEUWDEbaRqDZqTvb
// 2020-09-18T15:45:38 – 1hPWiYeqeK2c77vXrZXg
// 2020-09-19T17:31:10 – Jr7AWPsaVNKnvDXPbmIG
// 2020-10-28T23:31:21 – jNQL5Jgzra5OgpPlu5nE
// 2020-11-05T01:07:39 – UUibipZYGc6X5hyTOamx
// 2020-11-12T09:38:10 – FYeRZOHdVf70RslxtZno
// 2020-11-12T17:53:58 – VzXoO94nF76W6g9O31jy
// 2020-11-26T07:39:39 – WeW0VPNAlCh5UkwFCGZx
// 2020-12-04T08:43:31 – Q657JdP3lZKQy06BKwSU
// 2020-12-05T20:24:40 – ST2R7G3wK6yTwMmnlX33
// 2020-12-07T16:49:30 – wl1zL8VGpbiIK17BH5FY
// 2020-12-09T15:21:48 – 4USs8RW97gyjdTatVaG0
// 2020-12-29T00:06:20 – 0c1XSvYBZFCjI1CmOwmm
// 2021-01-15T01:40:25 – tYucRrqbAkxT1cIZmaym
// 2021-01-17T11:45:34 – pIHewERvWz1mXr9KGl7X
// 2021-01-20T07:16:47 – 75ksVy8SpqVg5MDMUDvP
// 2021-01-29T02:44:24 – EyTQuhED16gLauWZSP0B
// 2021-02-17T21:41:06 – qXixFL25cObeVc0X5UJb
// 2021-02-26T08:16:45 – CF3OaauplhNNJRBsFhsh
// 2021-03-20T22:17:06 – C9Dq3HK7hPAgOQD1VVAQ
// 2021-03-21T00:59:01 – tFNqsnMxFJzCsCMzjHZA
// 2021-03-23T01:01:55 – CQxYFDWIrHHH2UfUs971
// 2021-05-02T20:38:49 – gYbLWEGJlmfbg1DPlXMm
// 2021-05-08T19:08:33 – HtHL0e44TgrRdwPyLvMY
// 2021-07-26T19:34:25 – 3nLXmU7QILfajM4z6T4b
// 2021-08-01T11:06:59 – hPsXRla5OcBEibMqz3OS
// 2021-08-03T21:24:45 – OV4j0hOpg7Nod6JZoZxB
// 2021-08-10T16:48:14 – UlAYzrhbYzMNUCA60ne3
// 2021-08-11T01:57:30 – uuCFtuKHY8t9cdVuKa7A
// 2021-08-17T18:08:51 – rjPUbxnHsyHBvNgkZBb1
// 2021-09-09T05:48:35 – P01VA6ylrKYlwFE6dOT4
// 2021-09-28T03:30:05 – 7PU5UQelUfeucyGxj5mx
// 2021-11-03T20:44:17 – aRrhJUUtFrwlZkPHCV0E
// 2021-11-23T19:05:21 – 9syPRL6OeFX5xYFZecvU
// 2021-11-28T10:00:24 – 8TIgieJN0TNVPsvvnAOI
// 2021-12-12T05:14:51 – wb20SRDS1KkrIj2319Ca
// 2021-12-19T23:21:01 – FySapWxvF3kEUcLQhaWF
// 2021-12-22T05:46:33 – enyApK4zR30PwoEpvLCJ
// 2021-12-27T08:05:43 – e59gwM9xVFkaKfulZT0l
// 2021-12-29T17:41:58 – nGCH54EVDD4WkvNDHpxg
// 2022-01-03T05:28:33 – od9nBVaLn0Anv9Ets3y2
// 2022-02-05T21:25:09 – IzbTy8q5FNmbe8ZhnbEn
// 2022-02-07T02:59:41 – 3D5rJ8KwtvTkNtFwUmMf
// 2022-02-13T07:23:25 – tYysSzDSET3iO59Zgeoz
// 2022-02-13T08:20:30 – dtixrqqDHzgeUIKXyaf7
// 2022-02-21T03:51:47 – H3aNKxlbuV28DRHve25K
// 2022-02-22T17:22:01 – ER9NN0qpJSkrDPNu1NXs
// 2022-02-28T14:49:11 – JhK3CqXnJWUJP8VBDR3x
// 2022-04-03T08:04:13 – oKMUtdbehmFIxdkT5Ozy
// 2022-04-05T08:44:15 – A6P5OqVoxMXsFUedDLLJ
// 2022-04-10T13:17:58 – GuoRaeSNn3bQnldMPvjx
// 2022-04-23T18:37:45 – OeY329oaw5vE9ReOp8vv
// 2022-05-06T15:12:50 – 8JEE0thu4fpH8FN1EWLa
// 2022-05-26T12:28:48 – RwlzqZE41aUkHfiHQdWs
// 2022-05-29T18:32:56 – tA4R7XTSbSKgNoxmz4xG
// 2022-06-11T21:39:36 – He416A2yP7SPnU2yAUjS
// 2022-07-12T13:30:39 – Gt1rDKNZJr62nlxLmdSf
// 2022-07-13T06:28:03 – kShqJhWr6kHybj8gTG7p
// 2022-07-14T09:34:26 – o26FIgxhQzeOciEM1PsO
// 2022-09-13T14:38:04 – 5ChoCLpSsKeVKc4CPCz1
// 2022-09-14T16:49:25 – tBPHsWYxFyk8e7TXUtyU
// 2022-10-03T06:39:16 – 7HJALltZFURfHSp2z1FK
// 2022-10-11T05:45:32 – xixSrm9cECfy4gCOOlmZ
// 2022-10-14T12:41:07 – ABnnIe53dsqwkSNJuogW
// 2022-10-15T12:53:15 – smqTepsP7UfRt6TbSUtY
// 2022-10-20T07:03:25 – i0mxzUqPruj3JlJI69Yl
// 2022-10-28T16:40:37 – famZdV8A5BtJ49q0t2wh
// 2022-10-31T23:39:05 – SmivmEc5k1pwh2W8Spk1
// 2022-11-01T10:29:45 – OhSaTx8fep305kmXuqcv
// 2022-11-19T09:55:01 – 2QxFdh5AGRWJ3GHy0hsR
// 2022-11-21T15:25:32 – rIKt9Thg01hkZnm5RT4R
// 2022-11-23T00:08:04 – eqBttTkJ8WtbpEylJ11c
// 2022-11-28T00:44:51 – b63sHd8EseQqptUnO5Ey
// 2022-12-03T04:04:01 – IXDy2eZ9xlLrKHCCy5sP
// 2022-12-15T12:45:13 – MCSHR0gvYu5XEyvI45Gj
// 2022-12-29T13:09:24 – ikuuT3dxZ6VHIX48fPYS
// 2023-01-06T00:47:11 – 0cS9Dn9nauB1FxFb52H9
// 2023-01-07T21:21:29 – 3QCNPyDyvx4yt75HXovO
// 2023-01-12T10:59:52 – uxoLNJLLvGkAU9TbeHdb
// 2023-02-07T05:20:11 – mtUCEsweqnl8soEMXNiS
// 2023-03-03T08:56:58 – g2D1pgAxJXdr8teZ2crc
// 2023-03-07T23:32:54 – WsYcOSyajIdNnDdGERWa
// 2023-03-14T10:11:03 – cJIGqxTI0YwnfTooDTvg
// 2023-03-23T16:17:37 – DZ70C9MC5F67ZHKj8vvx
// 2023-04-15T10:24:25 – hhUtU0CJnvYvMRwNxn7B
// 2023-04-21T02:27:23 – AkF1XB5ifogc3d09VkSq
// 2023-04-23T14:12:11 – lhol2oXL0RXiY7iELR65
// 2023-04-24T01:26:08 – KyGMaXs67C8gm6MLIUah
// 2023-05-13T08:31:18 – UM8e3oxXmDH4mkhb9ld9
// 2023-06-17T09:58:16 – J27zbMoau2j5otBK0qvp
// 2023-07-17T08:44:01 – 798iEuvwXP43rzMf4q05
// 2023-07-25T14:22:08 – UBWkYab0MlcDWEQAxBWb
// 2023-08-16T08:37:35 – 9Wz3ZjrsBjzHcOsfgxez
// 2023-09-14T05:07:39 – GsYQLim36HgywxY5cOEO
// 2023-09-20T05:03:24 – NebB3IMfIFx86ZWGZYO4
// 2023-09-29T01:17:33 – jshBSIfIdCxori23OBGH
// 2023-09-29T04:13:25 – 8DjgydJf79ko808y8bJG
// 2023-10-04T10:21:25 – UOJsgapLZXIvpkjlXZ1q
// 2023-10-23T23:13:11 – bAe4dxk3sihB9z6gok6r
// 2023-11-10T15:38:05 – vEALlQVddC3FoWBYGDYj
// 2023-11-26T10:47:25 – tMK5LIDNgTVXSf7M2o82
// 2023-12-14T11:56:45 – Qh5D56LLt1JbUFcsRSw0
// 2023-12-15T23:40:32 – qFOUQc9XvTgl4TdIT2n7
// 2023-12-16T11:41:16 – sFyH2kKkKYECQDFLgSxk
// 2024-01-02T07:13:45 – 9whRdz53y9n3nLJr3iKJ
// 2024-01-13T09:16:48 – UQs2EcNEARhAlvQ1ROdy
// 2024-02-07T06:32:18 – UGiHw8JDPlsiJNr7Voar
// 2024-02-08T06:13:51 – 4hlWxVfrJwI31KxhWiB8
// 2024-02-19T03:18:57 – IYWnUvDdhBhFG27IFBl5
// 2024-02-23T02:07:56 – wEs2QIsUwI0ej8exCT0a
// 2024-02-25T19:43:52 – O5o89SUtsIIMSpAxm24n
// 2024-03-03T12:35:21 – cuUpDuXWeX9p3KlUxkrv
// 2024-03-08T20:03:47 – EuLCHEJHX45KwPjeseHb
// 2024-03-28T09:14:53 – WdPgJWrbZzM6PS44xHyI
// 2024-03-30T06:50:00 – 8tQtTqYvn2hYoh58J2oe
// 2024-04-06T16:25:15 – CBGX6gLAkFmjaehmsCQ3
// 2024-04-09T19:18:44 – 2ndGCpKJHKKIjd2OqQvk
// 2024-04-20T16:53:56 – sDZvLOX5i1FJWN7GJWo3
// 2024-05-01T21:51:22 – 19J70KTqjVwKEau5fpkM
// 2024-05-03T18:11:46 – hPiwzh2QvlCopPbnVkd8
