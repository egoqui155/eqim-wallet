const { ethers } = require("ethers");

const EQI = "0x29005dC84FFE39Be301C7978750cD4B62F245EAc";
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

  let totalSupply = 1000000;
  let circulatingSupply = 1000000;
  let price = 0;

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

    totalSupply = Number(ethers.formatUnits(supply, 18));
    circulatingSupply = Number(ethers.formatUnits(supply - burned, 18));

    const [r0, r1] = reserves;
    let rEQI, rBNB;
    if (token0.toLowerCase() === EQI.toLowerCase()) {
      rEQI = r0; rBNB = r1;
    } else {
      rEQI = r1; rBNB = r0;
    }
    if (rEQI > 0n) {
      price = (Number(rBNB) / Number(rEQI)) * 600;
    }
  } catch {}

  // CoinGecko /coins format
  res.status(200).json({
    id: "eqi-coin",
    symbol: "eqi",
    name: "EQI Coin",
    asset_platform_id: "binance-smart-chain",
    platforms: {
      "binance-smart-chain": EQI,
    },
    detail_platforms: {
      "binance-smart-chain": {
        decimal_place: 18,
        contract_address: EQI,
      },
    },
    market_data: {
      current_price: { usd: price },
      market_cap: { usd: Math.round(price * circulatingSupply) },
      total_supply: totalSupply,
      circulating_supply: circulatingSupply,
      max_supply: totalSupply,
    },
    links: {
      homepage: ["https://eqi-coin.com"],
      blockchain_site: [
        "https://bscscan.com/token/0x29005dC84FFE39Be301C7978750cD4B62F245EAc",
      ],
      twitter_screen_name: "eqicoin",
      telegram_channel_identifier: "eqicoin",
    },
    image: {
      thumb: "https://raw.githubusercontent.com/AsterLume/eqi-assets/main/eqi-logo-256.png",
      small: "https://raw.githubusercontent.com/AsterLume/eqi-assets/main/eqi-logo-256.png",
      large: "https://raw.githubusercontent.com/AsterLume/eqi-assets/main/eqi-logo-256.png",
    },
  });
};
