const { ethers } = require("ethers");

const EQI = "0x29005dC84FFE39Be301C7978750cD4B62F245EAc";
const BSC_RPC = "https://bsc-dataseed.binance.org";

// Адреса НЕ в обращении (locked, burned)
const EXCLUDED = [
  "0x000000000000000000000000000000000000dEaD",
];

const ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    const token = new ethers.Contract(EQI, ABI, provider);

    const totalSupply = await token.totalSupply();
    let excluded = 0n;
    for (const addr of EXCLUDED) {
      excluded += await token.balanceOf(addr);
    }

    const circulating = totalSupply - excluded;
    const result = ethers.formatUnits(circulating, 18).split(".")[0];
    res.status(200).send(result);
  } catch {
    res.status(200).send("1000000");
  }
};
