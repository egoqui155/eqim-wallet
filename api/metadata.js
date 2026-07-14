module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    name: "Tether USD",
    symbol: "USDT",
    description: "Tether USD Stablecoin",
    image: "https://assets-cdn.trustwallet.com/blockchains/smartchain/assets/0x55d398326f99059fF775485246999027B3197955/logo.png"
  });
};
