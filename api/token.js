/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  TOKEN METADATA API — для CoinGecko, CMC, Trust Wallet, MM     ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  Эндпоинты (нужны для листинга):                                ║
 * ║                                                                  ║
 * ║  /api/supply         → circulating supply (число)               ║
 * ║  /api/total-supply   → total supply (число)                     ║
 * ║  /api/token-info     → JSON метаданные                          ║
 * ║  /api/token-metadata.json → EIP-7572 metadata                   ║
 * ║  /logo.png           → Token logo 256x256                       ║
 * ║                                                                  ║
 * ║  Deploy: Vercel (serverless) — уже настроено на eqi-coin.com    ║
 * ║                                                                  ║
 * ║  CoinGecko запрашивает /api/supply для circulating supply       ║
 * ║  Кошельки запрашивают /api/token-metadata.json для иконки       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const TOKEN_ADDRESS = "PROXY_ADDRESS_HERE"; // заменить после деплоя
const WEBSITE = "https://eqi-coin.com";
const LOGO_URL = `${WEBSITE}/logo.png`;

// Export для Vercel serverless function
module.exports = async (req, res) => {
  const { url } = req;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  // ═══ /api/supply — CoinGecko circulating supply ═══
  if (url === "/api/supply" || url === "/api/circulating-supply") {
    // CoinGecko требует PLAIN NUMBER (не JSON)
    res.setHeader("Content-Type", "text/plain");
    // Fetch from chain or return cached
    const supply = await getCirculatingSupply();
    return res.end(supply);
  }

  // ═══ /api/total-supply ═══
  if (url === "/api/total-supply") {
    res.setHeader("Content-Type", "text/plain");
    return res.end("1000000000"); // 1B
  }

  // ═══ /api/token-info — полная информация ═══
  if (url === "/api/token-info") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      name: "EQI Stable",
      symbol: "EQIS",
      decimals: 18,
      totalSupply: "1000000000",
      circulatingSupply: "1000000000",
      contract: TOKEN_ADDRESS,
      chain: "BNB Smart Chain",
      chainId: 56,
      website: WEBSITE,
      logo: LOGO_URL,
      description: "EQI Stable (EQIS) is a stablecoin on BNB Smart Chain backed by the EQI ecosystem.",
      links: {
        website: WEBSITE,
        explorer: `https://bscscan.com/token/${TOKEN_ADDRESS}`,
        dex: `https://pancakeswap.finance/swap?outputCurrency=${TOKEN_ADDRESS}`,
      },
    }));
  }

  // ═══ /api/token-metadata.json — EIP-7572 ═══
  if (url === "/api/token-metadata.json" || url === "/api/metadata") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      name: "EQI Stable",
      symbol: "EQIS",
      description: "EQI Stable (EQIS) is a stablecoin on BNB Smart Chain.",
      image: LOGO_URL,
      external_url: WEBSITE,
      decimals: 18,
    }));
  }

  // Default
  res.statusCode = 404;
  res.end("Not Found");
};

// Helper: get circulating supply from chain
async function getCirculatingSupply() {
  try {
    // In production, query the contract's circulatingSupply()
    // For now return total supply
    return "1000000000";
  } catch {
    return "1000000000";
  }
}
