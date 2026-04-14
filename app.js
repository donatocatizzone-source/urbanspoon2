// Urban Spoon — filter-based restaurant picker
(function () {
  // ----- Haptics -----
  function haptic(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // ----- State -----
  const selected = { neighborhood: null, cuisine: null, price: null };
  let openNowFilter = false;
  let lastResult = null;
  let isSpinning = false;

  // ----- Build filter rows -----
  let openFilter = null; // which filter tray is currently expanded

  function buildFilterOptions(filterKey, items) {
    const tray = document.querySelector(`.filter-options[data-options="${filterKey}"]`);
    const valueEl = document.querySelector(`.filter-row-value[data-value="${filterKey}"]`);
    const row = document.querySelector(`.filter-row[data-filter="${filterKey}"]`);

    tray.innerHTML = "";
    items.forEach((item) => {
      const opt = document.createElement("div");
      opt.className = "option-item";
      opt.textContent = item;
      opt.addEventListener("click", () => {
        if (opt.classList.contains("selected")) {
          // Deselect
          opt.classList.remove("selected");
          selected[filterKey] = null;
          valueEl.textContent = "Any";
          valueEl.classList.remove("has-value");
          haptic(10);
        } else {
          // Select
          tray.querySelectorAll(".option-item").forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");
          selected[filterKey] = item;
          valueEl.textContent = item;
          valueEl.classList.add("has-value");
          haptic([10, 30, 10]);
        }
      });
      tray.appendChild(opt);
    });

    // Row tap toggles the options tray
    row.addEventListener("click", () => {
      const isOpen = openFilter === filterKey;
      // Close any open tray
      if (openFilter) {
        document.querySelector(`.filter-options[data-options="${openFilter}"]`).classList.remove("open");
        document.querySelector(`.filter-row[data-filter="${openFilter}"]`).classList.remove("expanded");
      }
      if (isOpen) {
        openFilter = null;
      } else {
        tray.classList.add("open");
        row.classList.add("expanded");
        openFilter = filterKey;
      }
      haptic(10);
    });
  }

  // ----- Open Now toggle -----
  const openNowToggle = document.getElementById("openNowToggle");
  function toggleOpenNow() {
    openNowFilter = !openNowFilter;
    openNowToggle.classList.toggle("on", openNowFilter);
    openNowToggle.setAttribute("aria-checked", String(openNowFilter));
    haptic(10);
  }
  openNowToggle.addEventListener("click", (e) => { e.stopPropagation(); toggleOpenNow(); });
  document.getElementById("openNowRow").addEventListener("click", toggleOpenNow);

  // ----- Pick a restaurant -----
  function hasActiveFilters() {
    return selected.neighborhood || selected.cuisine || selected.price !== null || openNowFilter;
  }

  function filterRestaurants() {
    return RESTAURANTS.filter((r) => {
      if (openNowFilter && r.openNow === false) return false;
      if (selected.neighborhood && r.neighborhood !== selected.neighborhood) return false;
      if (selected.cuisine && r.cuisine !== selected.cuisine) return false;
      if (selected.price !== null) {
        const idx = PRICES.indexOf(selected.price);
        if (idx !== -1 && r.price !== idx) return false;
      }
      return true;
    });
  }

  function pickFiltered() {
    const candidates = filterRestaurants();
    if (candidates.length === 0) return null;
    return pickDistinct(candidates);
  }

  function pickRandom() {
    return pickDistinct(RESTAURANTS);
  }

  function pickDistinct(list) {
    if (list.length === 1 || !lastResult) {
      return list[Math.floor(Math.random() * list.length)];
    }
    for (let attempt = 0; attempt < 6; attempt++) {
      const pick = list[Math.floor(Math.random() * list.length)];
      if (pick.name !== lastResult.name) return pick;
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  // ----- Cat Mode override -----
  let catModeOverride = null;

  function pickWithCatOverride() {
    const ov = catModeOverride;
    catModeOverride = null;
    const cuisineLower = (ov.cuisine || "").toLowerCase();

    let candidates = RESTAURANTS.filter((r) => {
      const rc = r.cuisine.toLowerCase();
      return rc === cuisineLower || rc.includes(cuisineLower) || cuisineLower.includes(rc);
    });
    if (ov.forcePrice != null) {
      const priceFiltered = candidates.filter((r) => r.price >= ov.forcePrice);
      if (priceFiltered.length > 0) candidates = priceFiltered;
    }
    if (candidates.length === 0) {
      showToast("No " + ov.cuisine + " nearby — picking a wild card!");
      return pickDistinct(RESTAURANTS);
    }
    return pickDistinct(candidates);
  }

  function showToast(msg) {
    let toast = document.getElementById("catToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "catToast";
      toast.className = "cat-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("visible"), 3000);
  }

  window.catModeSpin = function (cuisine, forcePrice) {
    catModeOverride = { cuisine, forcePrice: forcePrice != null ? forcePrice : null };
    runPick(pickWithCatOverride);
  };

  // ----- Discover / Find -----
  const discoverBtn = document.getElementById("discoverBtn");
  const findBtn = document.getElementById("findBtn");

  async function runPick(pickFn) {
    if (isSpinning) return;
    isSpinning = true;
    haptic(15);

    discoverBtn.classList.add("loading");
    findBtn.classList.add("loading");
    showSkeleton();

    const choice = pickFn();

    await new Promise((r) => setTimeout(r, 900));

    discoverBtn.classList.remove("loading");
    findBtn.classList.remove("loading");
    isSpinning = false;

    if (!choice) {
      hideResult();
      showToast("No matches — try changing your filters.");
      haptic([10, 40, 10]);
      return;
    }

    haptic([15, 50, 25]);
    lastResult = choice;
    window._lastSpinResult = choice;
    revealResult(choice);
    if (typeof window.addToHistory === "function") window.addToHistory(choice);
  }

  findBtn.addEventListener("click", () => runPick(pickFiltered));
  discoverBtn.addEventListener("click", () => runPick(pickRandom));

  function showSkeleton() {
    resetDetails();
    resultName.textContent = "";
    resultCuisine.textContent = "";
    resultNeighborhood.textContent = "";
    resultPrice.textContent = "";
    resultRating.textContent = "";
    resultMapsBtn.href = "#";

    const card = resultEl.querySelector(".sheet-card");
    card.classList.remove("reveal");
    card.classList.add("skeleton");
    resultEl.hidden = false;
  }

  function revealResult(r) {
    const card = resultEl.querySelector(".sheet-card");
    card.classList.remove("skeleton");
    card.classList.add("reveal");
    showResult(r);
  }


  // ----- Result card -----
  const resultEl = document.getElementById("result");
  const resultName = document.getElementById("resultName");
  const resultCuisine = document.getElementById("resultCuisine");
  const resultNeighborhood = document.getElementById("resultNeighborhood");
  const resultPrice = document.getElementById("resultPrice");
  const resultRating = document.getElementById("resultRating");
  const resultPhotoWrap = document.getElementById("resultPhotoWrap");
  const resultPhoto = document.getElementById("resultPhoto");
  const resultOpenRow = document.getElementById("resultOpenRow");
  const resultOpen = document.getElementById("resultOpen");
  const resultAddressRow = document.getElementById("resultAddressRow");
  const resultAddress = document.getElementById("resultAddress");
  const resultPhoneRow = document.getElementById("resultPhoneRow");
  const resultPhone = document.getElementById("resultPhone");
  const resultWebsiteRow = document.getElementById("resultWebsiteRow");
  const resultWebsite = document.getElementById("resultWebsite");
  const resultMapsBtn = document.getElementById("resultMapsBtn");

  function resetDetails() {
    resultPhotoWrap.hidden = true;
    resultPhoto.src = "";
    resultOpenRow.hidden = true;
    resultAddressRow.hidden = true;
    resultPhoneRow.hidden = true;
    resultWebsiteRow.hidden = true;
    resultMapsBtn.href = "#";
  }

  function showResult(r) {
    resetDetails();
    resultName.textContent = r.name;
    resultCuisine.textContent = r.cuisine;
    resultNeighborhood.textContent = r.neighborhood;
    resultPrice.textContent = PRICES[r.price] || "$$";
    resultRating.textContent = "\u2605 " + r.rating.toFixed(1) + " / 5.0";

    if (r.mapsUrl) resultMapsBtn.href = r.mapsUrl;

    resultEl.hidden = false;
    if (typeof window.setCurrentResult === "function") window.setCurrentResult(r);

    // Fetch rich details
    if (r.placeId && typeof window.fetchPlaceDetails === "function") {
      window.fetchPlaceDetails(r.placeId).then((d) => {
        if (!d || resultEl.hidden) return;
        if (d.photoUrl) {
          resultPhoto.src = d.photoUrl;
          resultPhotoWrap.hidden = false;
        }
        if (d.openNow != null) {
          resultOpen.textContent = d.openNow ? "Open now" : "Closed";
          resultOpen.className = "detail-text " + (d.openNow ? "open" : "closed");
          resultOpenRow.hidden = false;
        }
        if (d.address) {
          resultAddress.textContent = d.address;
          resultAddressRow.hidden = false;
        }
        if (d.phone) {
          resultPhone.textContent = d.phone;
          resultPhone.href = "tel:" + d.phone.replace(/\s/g, "");
          resultPhoneRow.hidden = false;
        }
        if (d.website) {
          const host = new URL(d.website).hostname.replace("www.", "");
          resultWebsite.textContent = host;
          resultWebsite.href = d.website;
          resultWebsiteRow.hidden = false;
        }
        if (d.mapsUrl) resultMapsBtn.href = d.mapsUrl;
      }).catch(() => {});
    }
  }

  function hideResult() {
    resultEl.hidden = true;
  }

  window.showResultFromHistory = function (r) {
    window._lastSpinResult = r;
    showResult(r);
  };

  document.getElementById("rejectBtn").addEventListener("click", () => {
    hideResult();
    runPick(pickRandom);
  });
  document.getElementById("sheetBackdrop").addEventListener("click", hideResult);

  // ----- Shake to discover -----
  let lastShakeAt = 0;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const magnitude = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    if (magnitude > 22) {
      const now = Date.now();
      if (now - lastShakeAt > 1200) {
        lastShakeAt = now;
        runPick(pickRandom);
      }
    }
  }

  function tryEnableMotion() {
    if (typeof DeviceMotionEvent === "undefined") return;
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission()
        .then((state) => {
          if (state === "granted") window.addEventListener("devicemotion", onMotion);
        })
        .catch(() => {});
    } else {
      window.addEventListener("devicemotion", onMotion);
    }
  }
  document.getElementById("enableMotionBtn").addEventListener("click", tryEnableMotion);
  document.addEventListener(
    "click",
    () => {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission !== "function") {
        window.addEventListener("devicemotion", onMotion, { once: false });
      }
    },
    { once: true }
  );

  // ----- Init -----
  async function init() {
    if (typeof window.loadLiveRestaurants === "function") {
      await window.loadLiveRestaurants();
    }
    buildFilterOptions("neighborhood", window.NEIGHBORHOODS);
    buildFilterOptions("cuisine", window.CUISINES);
    buildFilterOptions("price", window.PRICES);
  }
  init();
})();
