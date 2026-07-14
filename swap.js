/* ===== EQI Exchange — Swap Logic ===== */
const EQI = "0x29005dC84FFE39Be301C7978750cD4B62F245EAc";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

const ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

let provider, signer, account;
let direction = "buy"; // buy = BNB->EQI, sell = EQI->BNB

const $ = (id) => document.getElementById(id);

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("Please install MetaMask or Trust Wallet to use EQI Exchange.");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();

    // Ensure BSC network
    const net = await provider.getNetwork();
    if (net.chainId !== 56n) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }],
        });
      } catch (e) {
        alert("Please switch to BNB Smart Chain (BSC).");
      }
    }

    const btn = $("connectBtn");
    btn.textContent = account.slice(0, 6) + "..." + account.slice(-4);
    btn.classList.add("connected");
    $("swapBtn").textContent = "Swap";

    await refreshBalances();
    await updateRate();
  } catch (e) {
    console.error(e);
    alert("Connection failed: " + (e.message || e));
  }
}

async function refreshBalances() {
  if (!provider || !account) return;
  try {
    const bnb = await provider.getBalance(account);
    $("bnbBal").textContent = "Balance: " + parseFloat(ethers.formatEther(bnb)).toFixed(4);
    const eqi = new ethers.Contract(EQI, ERC20_ABI, provider);
    const eqiBal = await eqi.balanceOf(account);
    $("eqiBal").textContent = "Balance: " + parseFloat(ethers.formatUnits(eqiBal, 18)).toFixed(2);
  } catch (e) { console.warn(e); }
}

async function updateRate() {
  if (!provider) provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org");
  try {
    const router = new ethers.Contract(ROUTER, ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(ethers.parseEther("1"), [WBNB, EQI]);
    const rate = parseFloat(ethers.formatUnits(amounts[1], 18));
    $("rate").textContent = "1 BNB = " + rate.toFixed(0) + " EQI";
    // estimate USD price (BNB ~ $600)
    const priceUsd = 600 / rate;
    $("priceUsd").textContent = "$" + priceUsd.toFixed(6);
  } catch (e) { console.warn(e); }
}

async function updateQuote() {
  const amt = $("payAmount").value;
  if (!amt || amt <= 0) { $("getAmount").value = ""; return; }
  try {
    if (!provider) provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org");
    const router = new ethers.Contract(ROUTER, ROUTER_ABI, provider);
    const path = direction === "buy" ? [WBNB, EQI] : [EQI, WBNB];
    const inAmt = direction === "buy" ? ethers.parseEther(amt) : ethers.parseUnits(amt, 18);
    const amounts = await router.getAmountsOut(inAmt, path);
    const out = direction === "buy"
      ? parseFloat(ethers.formatUnits(amounts[1], 18)).toFixed(2)
      : parseFloat(ethers.formatEther(amounts[1])).toFixed(6);
    $("getAmount").value = out;
  } catch (e) { $("getAmount").value = ""; }
}

async function doSwap() {
  if (!signer) { await connectWallet(); return; }
  const amt = $("payAmount").value;
  if (!amt || amt <= 0) { alert("Enter an amount to swap."); return; }

  const btn = $("swapBtn");
  btn.disabled = true;
  btn.textContent = "Swapping...";

  try {
    const router = new ethers.Contract(ROUTER, ROUTER_ABI, signer);
    const deadline = Math.floor(Date.now() / 1000) + 600;

    if (direction === "buy") {
      const tx = await router.swapExactETHForTokens(
        0, [WBNB, EQI], account, deadline, { value: ethers.parseEther(amt) }
      );
      await tx.wait();
    } else {
      const eqi = new ethers.Contract(EQI, ERC20_ABI, signer);
      const inAmt = ethers.parseUnits(amt, 18);
      const allowance = await eqi.allowance(account, ROUTER);
      if (allowance < inAmt) {
        const apTx = await eqi.approve(ROUTER, ethers.MaxUint256);
        await apTx.wait();
      }
      const tx = await router.swapExactTokensForETH(
        inAmt, 0, [EQI, WBNB], account, deadline
      );
      await tx.wait();
    }
    alert("Swap successful! ✅");
    $("payAmount").value = "";
    $("getAmount").value = "";
    await refreshBalances();
  } catch (e) {
    console.error(e);
    alert("Swap failed: " + (e.message || e).slice(0, 120));
  } finally {
    btn.disabled = false;
    btn.textContent = "Swap";
  }
}

function flipDirection() {
  direction = direction === "buy" ? "sell" : "buy";
  // Swap the chip labels visually
  const chips = document.querySelectorAll(".token-chip");
  const payChip = chips[0].innerHTML;
  chips[0].innerHTML = chips[1].innerHTML;
  chips[1].innerHTML = payChip;
  $("payAmount").value = "";
  $("getAmount").value = "";
  updateQuote();
}

// Init
$("connectBtn").addEventListener("click", connectWallet);
$("flipBtn").addEventListener("click", flipDirection);
updateRate();
setInterval(updateRate, 30000);

/* ===== Live market data (ticker + side panel) ===== */
const EQI_PAIR = "0x385fB6D58e542c6ceAaCC7767DB18caF89B8ae01";
const DEX_API = "https://api.dexscreener.com/latest/dex/pairs/bsc/" + EQI_PAIR;
const CG_API =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd&include_24hr_change=true";

const MK_COINS = [
  { id: "bitcoin", sym: "BTC", color: "#f7931a", letter: "₿" },
  { id: "ethereum", sym: "ETH", color: "#627eea", letter: "Ξ" },
  { id: "binancecoin", sym: "BNB", color: "#f3ba2f", letter: "B" },
  { id: "solana", sym: "SOL", color: "#14f195", letter: "S" },
];

function mkPrice(p) {
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return "$" + p.toFixed(2);
  if (p >= 0.01) return "$" + p.toFixed(4);
  return "$" + p.toPrecision(3);
}
function mkBig(n) {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + Math.round(n);
}
function mkChg(c) {
  const up = c >= 0;
  return `<span class="chg ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(c).toFixed(2)}%</span>`;
}

async function loadLiveData() {
  // EQI from DexScreener
  let eqi = null;
  try {
    const r = await fetch(DEX_API);
    const j = await r.json();
    const p = j.pairs && j.pairs[0];
    if (p) {
      eqi = {
        price: parseFloat(p.priceUsd),
        change: parseFloat(p.priceChange?.h24 || 0),
        vol: parseFloat(p.volume?.h24 || 0),
        liq: parseFloat(p.liquidity?.usd || 0),
      };
      $("priceUsd").textContent = mkPrice(eqi.price);
      $("vol24").textContent = mkBig(eqi.vol);
      $("liq").textContent = mkBig(eqi.liq);
      const pc = $("priceChange");
      if (pc) { pc.innerHTML = mkChg(eqi.change); pc.className = "pc-change " + (eqi.change >= 0 ? "up" : "down"); }
    }
  } catch (e) { console.warn("EQI data", e); }

  // Other coins from CoinGecko
  let prices = {};
  try {
    const r = await fetch(CG_API);
    prices = await r.json();
  } catch (e) { console.warn("CoinGecko", e); }

  const ticker = [];
  const rows = [];

  if (eqi) {
    ticker.push(`<span class="tk-item tk-eqi"><b>EQI</b> ${mkPrice(eqi.price)} ${mkChg(eqi.change)}</span>`);
    rows.push(mkRow({ sym: "EQI", color: "#4dd9e8", letter: "E" }, eqi.price, eqi.change));
  }
  MK_COINS.forEach((c) => {
    const d = prices[c.id];
    if (!d) return;
    ticker.push(`<span class="tk-item"><b style="color:${c.color}">${c.sym}</b> ${mkPrice(d.usd)} ${mkChg(d.usd_24h_change || 0)}</span>`);
    rows.push(mkRow(c, d.usd, d.usd_24h_change || 0));
  });

  const track = $("tickerTrack");
  if (track && ticker.length) track.innerHTML = ticker.join("") + ticker.join("");
  const body = $("mkBody");
  if (body && rows.length) body.innerHTML = rows.join("");
}

function mkRow(c, price, change) {
  return `
  <div class="mk-row">
    <span class="mk-asset"><span class="mk-ico" style="background:${c.color}">${c.letter}</span> ${c.sym}</span>
    <span class="mk-price">${mkPrice(price)}</span>
    <span class="mk-chg">${mkChg(change)}</span>
  </div>`;
}

loadLiveData();
setInterval(loadLiveData, 30000);
