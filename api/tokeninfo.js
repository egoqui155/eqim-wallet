const { ethers } = require("ethers");

const EQI = "0x29005dC84FFE39Be301C7978750cD4B62F245EAc";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const PAIR = "0x385fB6D58e542c6ceAaCC7767DB18caF89B8ae01";
const BSC_RPC = "https://bsc-dataseed.binance.org";
const BURN = "0x000000000000000000000000000000000000dEaD";

const ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const PAIR_ABI = [
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
];

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let totalSupply = "1000000";
  let circulatingSupply = "1000000";
  let price = null;
  let marketCap = null;

  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    const token = new ethers.Contract(EQI, ABI, provider);
    const pair = new ethers.Contract(PAIR, PAIR_ABI, provider);

    const [supply, burned, token0, reserves] = await Promise.all([
      token.totalSupply(),
      token.balanceOf(BURN),
      pair.token0(),
      pair.getReserves(),
    ]);

    totalSupply = ethers.formatUnits(supply, 18).split(".")[0];
    circulatingSupply = ethers.formatUnits(supply - burned, 18).split(".")[0];

    const [r0, r1] = reserves;
    let rEQI, rBNB;
    if (token0.toLowerCase() === EQI.toLowerCase()) {
      rEQI = r0; rBNB = r1;
    } else {
      rEQI = r1; rBNB = r0;
    }
    if (rEQI > 0n) {
      const bnbPrice = 600;
      price = (Number(rBNB) / Number(rEQI)) * bnbPrice;
      marketCap = Math.round(price * Number(circulatingSupply));
    }
  } catch {}

  res.status(200).json({
    name: "EQI Coin",
    symbol: "EQI",
    decimals: 18,
    totalSupply,
    circulatingSupply,
    maxSupply: totalSupply,
    contract: EQI,
    chain: "BNB Smart Chain",
    chainId: 56,
    price,
    marketCap,
    website: "https://eqi-coin.com",
    description: "EQI Coin — next-generation decentralized payment token on BNB Smart Chain. Fast, secure, low-cost transactions with multi-DEX liquidity.",
    logo: "https://raw.githubusercontent.com/AsterLume/eqi-assets/main/eqi-logo-256.png",
    links: {
      website: "https://eqi-coin.com",
      twitter: "https://x.com/eqicoin",
      telegram: "https://t.me/eqicoin",
      explorer: "https://bscscan.com/token/0x29005dC84FFE39Be301C7978750cD4B62F245EAc",
      dexscreener: "https://dexscreener.com/bsc/0x385fB6D58e542c6ceAaCC7767DB18caF89B8ae01",
      geckoterminal: "https://www.geckoterminal.com/bsc/pools/0x385fB6D58e542c6ceAaCC7767DB18caF89B8ae01",
      pancakeswap: "https://pancakeswap.finance/swap?outputCurrency=0x29005dC84FFE39Be301C7978750cD4B62F245EAc",
    },
    dex: "PancakeSwap V2",
    pair: PAIR,
  });
};
