// --- Storage and records ---
// Safe storage: some viewers (WhatsApp, file managers) block localStorage and would crash the game
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

function migrateRecords() {
  if (store.get(LS_METERS) == null && store.get(LS_OLD_METERS) != null) {
    store.set(LS_METERS, store.get(LS_OLD_METERS));
  }
  if (store.get(LS_COINS) == null && store.get(LS_OLD_COINS) != null) {
    store.set(LS_COINS, store.get(LS_OLD_COINS));
  }
}

function loadRecords() {
  migrateRecords();
  const bm = parseInt(store.get(LS_METERS) || '0', 10) || 0;
  const bc = parseInt(store.get(LS_COINS) || '0', 10) || 0;
  bestM.textContent = bm + ' m';
  bestC.textContent = String(bc);
  return { meters: bm, coins: bc };
}

function saveRecords(meters, coinsCount) {
  const rec = loadRecords();
  let isNew = false;
  if (meters > rec.meters) {
    store.set(LS_METERS, String(Math.floor(meters)));
    isNew = true;
  }
  if (coinsCount > rec.coins) {
    store.set(LS_COINS, String(coinsCount));
    isNew = true;
  }
  loadRecords();
  return isNew;
}
