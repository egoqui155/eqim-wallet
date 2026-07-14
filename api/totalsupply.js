const { ethers } = require("ethers");

const EQI = "0x29005dC84FFE39Be301C7978750cD4B62F245EAc";
const BSC_RPC = "https://bsc-dataseed.binance.org";
const ABI = ["function totalSupply() view returns (uint256)"];

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    const token = new ethers.Contract(EQI, ABI, provider);
    const supply = await token.totalSupply();
    const formatted = ethers.formatUnits(supply, 18).split(".")[0];
    res.status(200).send(formatted);
  } catch {
    res.status(200).send("1000000");
  }
};
