# StapletonTerminal

StapletonTerminal is a desktop application designed for options traders to manage their portfolios effectively. It integrates with the Alpaca trading API to fetch real-time market data and provides advanced calculations for optimal position sizing using the Kelly Criterion. The app helps traders make informed decisions by calculating weighted portfolio metrics, including delta, leverage, and the Kelly fraction, to determine the ideal percentage of capital to allocate to options strategies.

## Purpose

The primary purpose of StapletonTerminal is to assist options traders in implementing risk-managed trading strategies. By leveraging the Kelly Criterion—a mathematical formula for sizing bets to maximize long-term growth while minimizing risk—the app calculates the optimal fraction of a trader's account balance to invest in specific options contracts. This prevents over-leveraging and promotes sustainable trading practices.

Key features include:
- Real-time data fetching for options contracts (IV, delta, gamma, theta, rho, stock price, current option price).
- Weighted average calculations based on purchase prices.
- Kelly Criterion implementation for position sizing.
- A modern, Bloomberg-inspired UI for easy navigation and data visualization.

The app aims to bridge the gap between complex financial calculations and practical trading tools, making advanced strategies accessible to individual traders.

## Requirements

To run StapletonTerminal, ensure your system meets the following requirements:

- **Node.js**: Version 14 or higher (download from [nodejs.org](https://nodejs.org/)).
- **npm**: Comes bundled with Node.js.
- **Alpaca Account**: A brokerage account with Alpaca for API access (see below).
- **Operating System**: Windows, macOS, or Linux (Electron app).
- **Dependencies**: The app uses Electron for the desktop interface and Express for the backend server.

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/StapletonTerminal.git
   cd StapletonTerminal
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm run server
   ```

4. In another terminal, start the Electron app:
   ```
   npm start
   ```

## Getting Alpaca Credentials

StapletonTerminal requires Alpaca API credentials to fetch market data and manage trading operations. Alpaca is a commission-free brokerage that provides a robust API for algorithmic trading.

### Steps to Obtain Credentials

1. **Sign Up for Alpaca**:
   - Visit [alpaca.markets](https://alpaca.markets/) and create a free account.
   - Complete the verification process, including identity and financial information.
   - Note: Alpaca offers paper trading accounts for testing without real money.

2. **Generate API Keys**:
   - Log in to your Alpaca dashboard.
   - Navigate to the "API" section in your account settings.
   - Click "Generate New Key" to create API Key ID and Secret Key.
   - Copy these credentials securely (do not share them).

3. **Configure in the App**:
   - The app's server (server.js) should be configured to use your Alpaca API keys.
   - Update the server code with your `API_KEY` and `API_SECRET`.
   - Ensure the server is running on `http://localhost:3000` as expected by the frontend.

**Security Note**: Never commit API keys to version control. Use environment variables or a secure config file.

## How Kelly is Calculated

The Kelly Criterion is a formula used to determine the optimal size of a series of bets or investments. In trading, it helps calculate the fraction of capital to risk on a position to maximize long-term growth.

### Key Concepts

- **Weighted Portfolio Delta**: The average delta of the portfolio, weighted by the relative cost (purchase price) of each contract.
- **Weighted Portfolio Leverage**: The average leverage (stock price / option price), weighted similarly.
- **Kelly Fraction**: The optimal bet size, calculated as `Weighted Delta - ((1 - Weighted Delta) / Weighted Leverage)`.
- **Current Value**: Total contract value (sum of current option prices × 100, assuming 100 shares per contract) divided by account balance.
- **Kelly Ratio**: Current value divided by Kelly fraction, indicating if the position is under- or over-sized.

### Calculation Details

1. **Weights**: For each contract, weight = `PurchaseOptionPrice / TotalPurchasePrice`.
2. **Weighted Delta**: `Σ(weight × Delta)`.
3. **Weighted Leverage**: `Σ(weight × (StockPrice / CurrentOptionPrice))`.
4. **Kelly Fraction**: `WeightedDelta - ((1 - WeightedDelta) / WeightedLeverage)`.
5. **Current Value**: `(Σ(CurrentOptionPrice × 100)) / AccountBalance`.
6. **Kelly Ratio**: `CurrentValue / KellyFraction`.

These calculations update in real-time as data refreshes, helping traders adjust positions dynamically.

## Usage

- Add contracts via the form (Ticker, Strike, Expiration, Purchase Price).
- Refresh data to fetch latest market info.
- View Kelly calculations in the dedicated section.
- Use the metrics to decide position sizes and risk management.

## Contributing

Contributions are welcome! Please fork the repo and submit a pull request.

## License

This project is licensed under the MIT License.
