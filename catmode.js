// Cat Mode — Easter egg activated by tapping the "U" logo 5 times.
// Shows bouncing sparkle puff balls. Tap one to lock a cuisine and spin.
//
// Color → cuisine mapping (from real life):
//   Orange  → Indian
//   Yellow  → Chinese
//   Blue    → Upscale American (maps to "American" with $$$)
//   Red     → Pizza
//   White   → Fast Food

(function () {
  const PUFFS = [
    { color: "orange", hue: 25, cuisine: "Indian", label: "Indian" },
    { color: "yellow", hue: 50, cuisine: "Chinese", label: "Chinese" },
    { color: "blue", hue: 210, cuisine: "American", label: "Upscale American", forcePrice: 2 },
    { color: "red", hue: 0, cuisine: "Pizza", label: "Pizza" },
    { color: "white", hue: 0, cuisine: "Fast Food", label: "Fast Food" },
  ];

  const ACTIVATION_TAPS = 2;
  const TAP_WINDOW_MS = 1500;
  let tapTimestamps = [];
  let catModeActive = false;
  let overlay = null;

  // Detect 5 rapid taps on the logo mark
  function onLogoTap() {
    const now = Date.now();
    tapTimestamps.push(now);
    tapTimestamps = tapTimestamps.filter((t) => now - t < TAP_WINDOW_MS);
    if (tapTimestamps.length >= ACTIVATION_TAPS) {
      tapTimestamps = [];
      if (!catModeActive) activateCatMode();
      else deactivateCatMode();
    }
  }

  function activateCatMode() {
    catModeActive = true;

    overlay = document.createElement("div");
    overlay.className = "catmode-overlay";
    overlay.innerHTML = `
      <div class="catmode-header">
        <div class="catmode-title">🐱 Cat Mode</div>
        <p class="catmode-subtitle">Pick a puff ball!</p>
      </div>
      <div class="catmode-arena" id="catArena"></div>
      <button class="catmode-exit" id="catExit">Exit Cat Mode</button>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("active"));

    const arena = document.getElementById("catArena");
    PUFFS.forEach((puff, i) => {
      const el = document.createElement("button");
      el.className = "puffball";
      el.dataset.index = i;
      el.setAttribute("aria-label", puff.label);

      // Generate spiky sparkle layers
      el.innerHTML = `
        <div class="puff-core" style="--hue:${puff.hue}; --puff-color:${puff.color}">
          <div class="puff-spike s1"></div>
          <div class="puff-spike s2"></div>
          <div class="puff-spike s3"></div>
          <div class="puff-spike s4"></div>
          <div class="puff-shimmer"></div>
        </div>
      `;

      // Random bounce animation offset
      el.style.animationDelay = `${(i * 0.35).toFixed(2)}s`;

      el.addEventListener("click", () => onPuffPick(puff));
      arena.appendChild(el);
    });

    document.getElementById("catExit").addEventListener("click", deactivateCatMode);
  }

  function deactivateCatMode() {
    catModeActive = false;
    if (overlay) {
      overlay.classList.remove("active");
      setTimeout(() => {
        overlay.remove();
        overlay = null;
      }, 300);
    }
  }

  function onPuffPick(puff) {
    // Visual feedback — pulse the picked ball
    const arena = document.getElementById("catArena");
    if (arena) {
      arena.querySelectorAll(".puffball").forEach((el) => el.classList.add("not-picked"));
      const idx = PUFFS.indexOf(puff);
      const picked = arena.querySelector(`[data-index="${idx}"]`);
      if (picked) {
        picked.classList.remove("not-picked");
        picked.classList.add("picked");
      }
    }

    // After a short celebration, close overlay and trigger a cuisine-locked spin.
    setTimeout(() => {
      deactivateCatMode();
      triggerCatSpin(puff);
    }, 900);
  }

  function triggerCatSpin(puff) {
    if (typeof window.catModeSpin === "function") {
      window.catModeSpin(puff.cuisine, puff.forcePrice);
    } else {
      document.getElementById("spinBtn").click();
    }
  }

  // Bind on DOMContentLoaded
  function init() {
    const headline = document.querySelector(".largetitle");
    if (headline) {
      headline.style.cursor = "pointer";
      headline.addEventListener("click", (e) => {
        e.stopPropagation();
        onLogoTap();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
