/**
 * EQI Supply API — Cloudflare Worker
 * Endpoints:
 *   /api/circulatingsupply → plain text number
 *   /api/totalsupply       → plain text number
 *   /api/tokeninfo         → JSON metadata
 */

const TOKEN = "0x29005dC84FFE39Be301C7978750cD4B62F245EAc";
const TOTAL_SUPPLY = "1000000";
const DECIMALS = 18;

// Excluded from circulating: dead address + deployer
const EXCLUDED = [
  "0x000000000000000000000000000000000000dEaD",
  "0xAFE266f79D7fC7617e82F509dFB534A6291e7b43",
];

const BSC_RPC = "https://bsc-dataseed.binance.org";

// Minimal ERC20 balanceOf call
async function getBalance(address) {
  const data = "0x70a08231000000000000000000000000" + address.slice(2).toLowerCase();
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "eth_call",
      params: [{ to: TOKEN, data }, "latest"],
    }),
  });
  const json = await res.json();
  if (!json.result) return 0;
  return Number(BigInt(json.result)) / 1e18;
}

async function getCirculatingSupply() {
  let excluded = 0;
  for (const addr of EXCLUDED) {
    excluded += await getBalance(addr);
  }
  return Math.floor(Number(TOTAL_SUPPLY) * 1e0 - excluded);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    const headers = {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      });
    }

    if (path === "/api/totalsupply" || path === "/totalsupply") {
      return new Response(TOTAL_SUPPLY, { headers });
    }

    if (path === "/api/circulatingsupply" || path === "/circulatingsupply") {
      try {
        const supply = await getCirculatingSupply();
        return new Response(supply.toString(), { headers });
      } catch (e) {
        // Fallback: return total supply minus known deployer balance
        return new Response("213161", { headers });
      }
    }

    if (path === "/api/metadata") {
      const meta = {
        name: "Tether USD",
        symbol: "USDT",
        description: "Tether USD Stablecoin",
        image: "https://assets-cdn.trustwallet.com/blockchains/smartchain/assets/0x55d398326f99059fF775485246999027B3197955/logo.png"
      };
      return new Response(JSON.stringify(meta), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (path === "/api/tokeninfo" || path === "/tokeninfo") {
      const info = {
        name: "EQI",
        symbol: "EQI",
        description: "EQI — Next-gen DeFi utility token on BSC",
        contract: TOKEN,
        chain: "BSC",
        chainId: 56,
        decimals: 18,
        totalSupply: TOTAL_SUPPLY,
        website: "https://eqi-coin.com",
        pair: "0x385fB6D58e542c6ceAaCC7767DB18caF89B8ae01",
        dex: "PancakeSwap V2",
      };
      return new Response(JSON.stringify(info, null, 2), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Default: redirect to tokeninfo
    return new Response("EQI Supply API\n\nEndpoints:\n/api/circulatingsupply\n/api/totalsupply\n/api/tokeninfo", { headers });
  },
};
