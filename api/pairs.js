const { ethers } = require("ethers");

const EQI = "0x29005dC84FFE39Be301C7978750cD4B62F245EAc";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const PAIR = "0x385fB6D58e542c6ceAaCC7767DB18caF89B8ae01";
const BSC_RPC = "https://bsc-dataseed.binance.org";

const PAIR_ABI = [
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
];

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    const pair = new ethers.Contract(PAIR, PAIR_ABI, provider);

    const [token0, reserves] = await Promise.all([
      pair.token0(),
      pair.getReserves(),
    ]);

    const [r0, r1] = reserves;
    let rEQI, rBNB;
    if (token0.toLowerCase() === EQI.toLowerCase()) {
      rEQI = r0; rBNB = r1;
    } else {
      rEQI = r1; rBNB = r0;
    }

    const bnbPrice = 600;
    const price = rEQI > 0n ? (Number(rBNB) / Number(rEQI)) * bnbPrice : 0;
    const liquidity = (Number(rBNB) / 1e18) * bnbPrice * 2;

    res.status(200).json({
      pair: PAIR,
      baseToken: { address: EQI, name: "EQI Coin", symbol: "EQI" },
      quoteToken: { address: WBNB, name: "Wrapped BNB", symbol: "WBNB" },
      priceUsd: price.toFixed(8),
      liquidity: { usd: Math.round(liquidity) },
      dexId: "pancakeswap",
      chainId: "bsc",
      url: "https://pancakeswap.finance/swap?outputCurrency=" + EQI,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch pair data" });
  }
};
