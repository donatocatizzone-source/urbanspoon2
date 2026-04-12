// Urban Spoon — slot machine logic
// Reels are scrollable strips of <li> elements. We "spin" by translateY-ing
// the strip to land on a chosen index. The center row is the payline.

(function () {
  const ROW_HEIGHT = 36; // must match .strip li height in styles.css
  // CENTER_OFFSET is computed per window so the "current" row sits in the
  // middle of the picker window regardless of its actual rendered height.
  function centerOffsetFor(reelKey) {
    const w = stripEls[reelKey].parentElement; // .window
    return Math.round((w.clientHeight - ROW_HEIGHT) / 2);
  }

  // ----- Build reel strips -----
  // Each strip needs many copies of its options to fake an "infinite" wheel.
  const STRIP_REPEATS = 8;

  // STRIPS is built lazily inside init() so it can read the live data that
  // places.js may have swapped into window.NEIGHBORHOODS / window.CUISINES.
  let STRIPS = null;

  const reelEls = {};
  const stripEls = {};
  const lockedReels = new Set();
  let isSpinning = false;
  let lastResult = null;

  function buildStrip(reelKey) {
    const ul = document.querySelector(`.strip[data-strip="${reelKey}"]`);
    const items = STRIPS[reelKey];
    const html = [];
    for (let r = 0; r < STRIP_REPEATS; r++) {
      for (let i = 0; i < items.length; i++) {
        const cls = reelKey === "price" ? ' class="price"' : "";
        html.push(`<li${cls}>${items[i]}</li>`);
      }
    }
    ul.innerHTML = html.join("");
    stripEls[reelKey] = ul;
    reelEls[reelKey] = ul.closest(".reel");

    // Start at a random position so it doesn't always begin on the first item
    const startIdx = Math.floor(Math.random() * items.length) + items.length * 2;
    setReelPosition(reelKey, startIdx, false);
    reelEls[reelKey].dataset.currentIdx = String(startIdx % items.length);
  }

  function setReelPosition(reelKey, absoluteIndex, animated) {
    const ul = stripEls[reelKey];
    const y = -(absoluteIndex * ROW_HEIGHT - centerOffsetFor(reelKey));
    if (!animated) {
      const prev = ul.style.transition;
      ul.style.transition = "none";
      ul.style.transform = `translateY(${y}px)`;
      // force reflow then restore
      void ul.offsetHeight;
      ul.style.transition = prev;
    } else {
      ul.style.transform = `translateY(${y}px)`;
    }
  }

  // ----- Locking -----
  // Tapping the reel window (or the explicit lock button) toggles lock state.
  function toggleLock(reel) {
    const key = reel.dataset.reel;
    if (lockedReels.has(key)) {
      lockedReels.delete(key);
      reel.classList.remove("locked");
    } else {
      lockedReels.add(key);
      reel.classList.add("locked");
    }
  }

  function bindLocks() {
    document.querySelectorAll(".reel").forEach((reel) => {
      reel.querySelector(".window").addEventListener("click", () => toggleLock(reel));
    });
  }

  // ----- Spin -----
  // Choose a target restaurant honoring locked reels, then animate each reel
  // to land on the matching value.
  function pickRestaurant() {
    const lockedValues = {};
    for (const key of lockedReels) {
      const items = STRIPS[key];
      const idx = Number(reelEls[key].dataset.currentIdx || 0);
      lockedValues[key] = items[idx];
    }

    // For price, the "value" is its index (0..3) since the strip displays $ symbols.
    const candidates = RESTAURANTS.filter((r) => {
      if (lockedValues.neighborhood && r.neighborhood !== lockedValues.neighborhood) return false;
      if (lockedValues.cuisine && r.cuisine !== lockedValues.cuisine) return false;
      if (lockedValues.price !== undefined) {
        const idx = STRIPS.price.indexOf(lockedValues.price);
        if (r.price !== idx) return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      // Locked combination has no matches — pick the closest by relaxing price
      const relaxed = RESTAURANTS.filter((r) => {
        if (lockedValues.neighborhood && r.neighborhood !== lockedValues.neighborhood) return false;
        if (lockedValues.cuisine && r.cuisine !== lockedValues.cuisine) return false;
        return true;
      });
      if (relaxed.length) return pickDistinct(relaxed);
      return pickDistinct(RESTAURANTS);
    }
    return pickDistinct(candidates);
  }

  function pickDistinct(list) {
    if (list.length === 1 || !lastResult) {
      return list[Math.floor(Math.random() * list.length)];
    }
    // Try to avoid repeating the previous result
    for (let attempt = 0; attempt < 6; attempt++) {
      const pick = list[Math.floor(Math.random() * list.length)];
      if (pick.name !== lastResult.name) return pick;
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  function spinReelTo(reelKey, targetValue, durationMs) {
    return new Promise((resolve) => {
      const items = STRIPS[reelKey];
      const baseIdx = items.indexOf(targetValue);
      if (baseIdx === -1) return resolve();
      // Land on a copy several repeats deep so the spin feels long
      const repeatsToTravel = 4;
      const targetAbsoluteIdx = items.length * repeatsToTravel + baseIdx;

      const reel = reelEls[reelKey];
      const ul = stripEls[reelKey];

      // Snap back to a near-start position with no animation, then animate to target
      const startIdx = baseIdx; // current index doesn't matter visually since we're about to translate far
      setReelPosition(reelKey, startIdx, false);

      reel.classList.add("spinning");
      ul.style.transition = `transform ${durationMs}ms cubic-bezier(0.18, 0.7, 0.2, 1)`;
      // next frame
      requestAnimationFrame(() => {
        setReelPosition(reelKey, targetAbsoluteIdx, true);
      });

      const onEnd = (e) => {
        if (e.propertyName !== "transform") return;
        ul.removeEventListener("transitionend", onEnd);
        reel.classList.remove("spinning");
        reel.dataset.currentIdx = String(baseIdx);
        // Reset to a clean position so future spins don't accumulate offset
        setReelPosition(reelKey, baseIdx, false);
        ul.style.transition = "";
        resolve();
      };
      ul.addEventListener("transitionend", onEnd);
    });
  }

  // Cat Mode override: set by catmode.js before triggering a spin.
  // { cuisine: "Indian", forcePrice: 2 | null }
  let catModeOverride = null;

  function pickWithCatOverride() {
    const ov = catModeOverride;
    catModeOverride = null; // consume it — one-shot
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

  // Exposed for catmode.js
  window.catModeSpin = function (cuisine, forcePrice) {
    catModeOverride = { cuisine, forcePrice: forcePrice != null ? forcePrice : null };
    spin();
  };

  async function spin() {
    if (isSpinning) return;
    isSpinning = true;
    hideResult();

    const choice = catModeOverride ? pickWithCatOverride() : pickRestaurant();
    const targets = {
      neighborhood: choice.neighborhood,
      cuisine: choice.cuisine,
      price: STRIPS.price[choice.price],
    };

    // Stagger reel stops for that classic slot-machine feel
    const promises = [];
    const reelOrder = ["neighborhood", "cuisine", "price"];
    reelOrder.forEach((key, i) => {
      if (lockedReels.has(key)) return;
      const dur = 1300 + i * 450;
      promises.push(spinReelTo(key, targets[key], dur));
    });
    // Locked reels: ensure they still hold their current displayed value, but
    // also make sure their dataset matches the current row in case it drifted.
    reelOrder.forEach((key) => {
      if (!lockedReels.has(key)) return;
      const items = STRIPS[key];
      const idx = Number(reelEls[key].dataset.currentIdx || 0);
      reelEls[key].dataset.currentIdx = String(idx % items.length);
    });

    await Promise.all(promises);
    isSpinning = false;
    lastResult = choice;
    showResult(choice);
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
    resultPrice.textContent = STRIPS.price[r.price];
    resultRating.textContent = "\u2605 " + r.rating.toFixed(1) + " / 5.0";

    // Maps link from nearby search (immediate, even before details load)
    if (r.mapsUrl) resultMapsBtn.href = r.mapsUrl;

    resultEl.hidden = false;

    // Fetch rich details asynchronously
    if (r.placeId && typeof window.fetchPlaceDetails === "function") {
      window.fetchPlaceDetails(r.placeId).then((d) => {
        if (!d || resultEl.hidden) return; // dismissed while loading
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
      }).catch(() => {}); // fail silently, basic info is already shown
    }
  }
  function hideResult() {
    resultEl.hidden = true;
  }

  document.getElementById("rejectBtn").addEventListener("click", () => {
    hideResult();
    spin();
  });
  document.getElementById("sheetBackdrop").addEventListener("click", hideResult);

  // ----- Spin button -----
  document.getElementById("spinBtn").addEventListener("click", spin);

  // ----- Shake to spin (DeviceMotion) -----
  // iOS 13+ requires explicit permission via a user gesture.
  let lastShakeAt = 0;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const magnitude = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    // Threshold tuned for a deliberate shake (gravity is ~9.8)
    if (magnitude > 22) {
      const now = Date.now();
      if (now - lastShakeAt > 1200) {
        lastShakeAt = now;
        spin();
      }
    }
  }

  function tryEnableMotion() {
    if (typeof DeviceMotionEvent === "undefined") return;
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      // iOS 13+
      DeviceMotionEvent.requestPermission()
        .then((state) => {
          if (state === "granted") {
            window.addEventListener("devicemotion", onMotion);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener("devicemotion", onMotion);
    }
  }
  document.getElementById("enableMotionBtn").addEventListener("click", tryEnableMotion);
  // Also try silently on first user interaction (works on Android, no-op on iOS)
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
    // Try to load live restaurants from Google Places. Falls back to stub
    // data on any failure (no key, geolocation denied, network error).
    if (typeof window.loadLiveRestaurants === "function") {
      await window.loadLiveRestaurants();
    }
    // Read the (possibly live-updated) globals exactly once into STRIPS.
    STRIPS = {
      neighborhood: window.NEIGHBORHOODS,
      cuisine: window.CUISINES,
      price: PRICES,
    };
    Object.keys(STRIPS).forEach(buildStrip);
    bindLocks();
  }
  init();
})();
