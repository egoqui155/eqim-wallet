/* ===== EQI Coin — Live Market Data ===== */
const EQI_PAIR = "0x385fB6D58e542c6ceAaCC7767DB18caF89B8ae01";
const DEX_API = "https://api.dexscreener.com/latest/dex/pairs/bsc/" + EQI_PAIR;
const CG_API =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true";

const COINS = [
  { id: "bitcoin", sym: "BTC", name: "Bitcoin", color: "#f7931a", letter: "₿" },
  { id: "ethereum", sym: "ETH", name: "Ethereum", color: "#627eea", letter: "Ξ" },
  { id: "binancecoin", sym: "BNB", name: "BNB", color: "#f3ba2f", letter: "B" },
  { id: "solana", sym: "SOL", name: "Solana", color: "#14f195", letter: "S" },
  { id: "ripple", sym: "XRP", name: "XRP", color: "#23292f", letter: "X" },
];

function fmtPrice(p) {
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return "$" + p.toFixed(2);
  if (p >= 0.01) return "$" + p.toFixed(4);
  return "$" + p.toPrecision(3);
}
function fmtBig(n) {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + Math.round(n);
}
function fmtChange(c) {
  const up = c >= 0;
  return `<span class="chg ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(c).toFixed(2)}%</span>`;
}

let eqiData = null;

async function fetchEQI() {
  try {
    const r = await fetch(DEX_API);
    const j = await r.json();
    const p = j.pairs && j.pairs[0];
    if (!p) return;
    eqiData = {
      price: parseFloat(p.priceUsd),
      change: parseFloat(p.priceChange?.h24 || 0),
      vol: parseFloat(p.volume?.h24 || 0),
      liq: parseFloat(p.liquidity?.usd || 0),
    };
    // Update hero stats
    const sp = document.getElementById("statPrice");
    if (sp && eqiData.price) sp.textContent = fmtPrice(eqiData.price);
    const sl = document.getElementById("statLiq");
    if (sl && eqiData.liq) sl.textContent = fmtBig(eqiData.liq);
    const sv = document.getElementById("statVol");
    if (sv) sv.textContent = fmtBig(eqiData.vol);
  } catch (e) {
    console.warn("EQI data unavailable", e);
  }
}

async function fetchMarkets() {
  let prices = {};
  try {
    const r = await fetch(CG_API);
    prices = await r.json();
  } catch (e) {
    console.warn("CoinGecko unavailable", e);
  }

  // Build ticker
  const ticker = [];
  const rows = [];

  COINS.forEach((c) => {
    const d = prices[c.id];
    if (!d) return;
    const price = d.usd;
    const change = d.usd_24h_change || 0;
    ticker.push(
      `<span class="tk-item"><b style="color:${c.color}">${c.sym}</b> ${fmtPrice(price)} ${fmtChange(change)}</span>`
    );
    rows.push(marketRow(c, price, change, false));
  });

  // EQI row (from DexScreener)
  if (eqiData) {
    ticker.unshift(
      `<span class="tk-item tk-eqi"><b>EQI</b> ${fmtPrice(eqiData.price)} ${fmtChange(eqiData.change)}</span>`
    );
    rows.unshift(
      marketRow(
        { sym: "EQI", name: "EQI Coin", color: "#4dd9e8", letter: "E" },
        eqiData.price,
        eqiData.change,
        true
      )
    );
  }

  // Render ticker (duplicate for seamless scroll)
  const track = document.getElementById("tickerTrack");
  if (track && ticker.length) {
    track.innerHTML = ticker.join("") + ticker.join("");
  }

  // Render market table
  const body = document.getElementById("marketBody");
  if (body && rows.length) body.innerHTML = rows.join("");
}

function marketRow(c, price, change, isEqi) {
  const buyLink = isEqi
    ? "https://pancakeswap.finance/swap?outputCurrency=0x29005dC84FFE39Be301C7978750cD4B62F245EAc"
    : "exchange.html";
  return `
  <a href="${buyLink}" target="_blank" class="mt-row${isEqi ? " mt-eqi" : ""}">
    <span class="mt-asset">
      <span class="mt-ico" style="background:${c.color}">${c.letter}</span>
      <span class="mt-name"><b>${c.sym}</b><small>${c.name}</small></span>
    </span>
    <span class="mt-price">${fmtPrice(price)}</span>
    <span class="mt-chg">${fmtChange(change)}</span>
    <span class="mt-trade"><span class="trade-btn">${isEqi ? "Buy EQI" : "Trade"}</span></span>
  </a>`;
}

async function refreshAll() {
  await fetchEQI();
  await fetchMarkets();
}

refreshAll();
setInterval(refreshAll, 30000);

// Reveal-on-scroll
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in-view");
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".feature, .token-card, .step, .stat").forEach((el) => {
  el.classList.add("reveal");
  io.observe(el);
});
