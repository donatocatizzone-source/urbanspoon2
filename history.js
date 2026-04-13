// History carousel + Favorites — persisted in localStorage.
(function () {
  const MAX_HISTORY = 10;
  const HISTORY_KEY = "urbanspoon_history";
  const FAVS_KEY = "urbanspoon_favorites";

  // ----- Helpers -----
  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function saveJSON(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  // Minimal restaurant record for storage (drop transient fields)
  function toRecord(r) {
    return {
      name: r.name,
      cuisine: r.cuisine,
      neighborhood: r.neighborhood,
      price: r.price,
      rating: r.rating,
      placeId: r.placeId || null,
      mapsUrl: r.mapsUrl || null,
    };
  }

  // ===================== HISTORY =====================
  const sectionEl = document.getElementById("historySection");
  const scrollEl = document.getElementById("historyScroll");
  let history = loadJSON(HISTORY_KEY);

  function renderHistory() {
    if (history.length === 0) {
      sectionEl.hidden = true;
      return;
    }
    sectionEl.hidden = false;
    const prices = window.PRICES || ["$", "$", "$$", "$$$"];
    scrollEl.innerHTML = history
      .map(
        (r, i) =>
          `<div class="history-card" data-idx="${i}">` +
          `<div class="history-card-name">${esc(r.name)}</div>` +
          `<div class="history-card-cuisine">${esc(r.cuisine)}</div>` +
          `<div class="history-card-price">${prices[r.price] || "$$"}</div>` +
          `</div>`
      )
      .join("");
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // Called by app.js after each spin result
  window.addToHistory = function (restaurant) {
    const rec = toRecord(restaurant);
    // Remove duplicate if present
    history = history.filter((h) => h.name !== rec.name || h.placeId !== rec.placeId);
    history.unshift(rec);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    saveJSON(HISTORY_KEY, history);
    renderHistory();
  };

  // Tap a history card → show its result
  scrollEl.addEventListener("click", (e) => {
    const card = e.target.closest(".history-card");
    if (!card) return;
    const idx = Number(card.dataset.idx);
    const r = history[idx];
    if (r && typeof window.showResultFromHistory === "function") {
      window.showResultFromHistory(r);
    }
  });

  // ===================== FAVORITES =====================
  let favorites = loadJSON(FAVS_KEY);

  const favBtn = document.getElementById("favBtn");
  const favNavBtn = document.getElementById("favNavBtn");
  const favSheet = document.getElementById("favSheet");
  const favSheetBackdrop = document.getElementById("favSheetBackdrop");
  const favList = document.getElementById("favList");
  const favEmpty = document.getElementById("favEmpty");

  let currentResultName = null; // track which restaurant is shown

  function isFavorited(name) {
    return favorites.some((f) => f.name === name);
  }

  function updateFavBtn() {
    const on = currentResultName && isFavorited(currentResultName);
    favBtn.setAttribute("aria-pressed", String(!!on));
  }

  // Called by app.js when showing a result
  window.setCurrentResult = function (restaurant) {
    currentResultName = restaurant ? restaurant.name : null;
    updateFavBtn();
  };

  favBtn.addEventListener("click", () => {
    if (!currentResultName) return;
    if (isFavorited(currentResultName)) {
      favorites = favorites.filter((f) => f.name !== currentResultName);
    } else {
      // Find full record from history or build from last result
      const rec =
        history.find((h) => h.name === currentResultName) ||
        (window._lastSpinResult ? toRecord(window._lastSpinResult) : null);
      if (rec) favorites.unshift(rec);
    }
    saveJSON(FAVS_KEY, favorites);
    updateFavBtn();
    if (navigator.vibrate) navigator.vibrate(isFavorited(currentResultName) ? [10, 30, 10] : 10);
  });

  // ----- Favorites sheet -----
  function renderFavList() {
    favEmpty.hidden = favorites.length > 0;
    const prices = window.PRICES || ["$", "$", "$$", "$$$"];
    favList.innerHTML = favorites
      .map(
        (r, i) =>
          `<div class="fav-item" data-idx="${i}">` +
          `<div class="fav-item-info">` +
          `<div class="fav-item-name">${esc(r.name)}</div>` +
          `<div class="fav-item-sub">${esc(r.cuisine)} · ${esc(r.neighborhood)} · ${prices[r.price] || "$$"}</div>` +
          `</div>` +
          `<button class="fav-item-remove" aria-label="Remove" data-remove="${i}">&times;</button>` +
          `</div>`
      )
      .join("");
  }

  function openFavSheet() {
    renderFavList();
    favSheet.hidden = false;
  }
  function closeFavSheet() {
    favSheet.hidden = true;
  }

  favNavBtn.addEventListener("click", openFavSheet);
  favSheetBackdrop.addEventListener("click", closeFavSheet);

  favList.addEventListener("click", (e) => {
    // Remove button
    const removeBtn = e.target.closest(".fav-item-remove");
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.remove);
      favorites.splice(idx, 1);
      saveJSON(FAVS_KEY, favorites);
      renderFavList();
      updateFavBtn();
      return;
    }
    // Tap item → show detail
    const item = e.target.closest(".fav-item");
    if (item) {
      const idx = Number(item.dataset.idx);
      const r = favorites[idx];
      if (r && typeof window.showResultFromHistory === "function") {
        closeFavSheet();
        window.showResultFromHistory(r);
      }
    }
  });

  // ----- Init -----
  renderHistory();
})();
