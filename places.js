// Google Places API (New, v1) integration.
//
// This module fetches real restaurants near the user's current location and
// transforms them into the same shape app.js expects:
//   { name, cuisine, neighborhood, price, rating }
//
// On any failure (no key, geolocation denied, fetch error) we fall back to
// the hardcoded RESTAURANTS / NEIGHBORHOODS / CUISINES from data.js so the UI
// still works.

(function () {
  const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

  // Map Google's primary type strings to a short, human-friendly cuisine label.
  // Anything not in this map falls through to "Restaurant".
  const CUISINE_MAP = {
    american_restaurant: "American",
    italian_restaurant: "Italian",
    mexican_restaurant: "Mexican",
    thai_restaurant: "Thai",
    japanese_restaurant: "Japanese",
    sushi_restaurant: "Sushi",
    indian_restaurant: "Indian",
    chinese_restaurant: "Chinese",
    vietnamese_restaurant: "Vietnamese",
    korean_restaurant: "Korean",
    pizza_restaurant: "Pizza",
    seafood_restaurant: "Seafood",
    steak_house: "Steakhouse",
    barbecue_restaurant: "BBQ",
    vegan_restaurant: "Vegan",
    vegetarian_restaurant: "Vegetarian",
    mediterranean_restaurant: "Mediterranean",
    middle_eastern_restaurant: "Middle Eastern",
    french_restaurant: "French",
    spanish_restaurant: "Spanish",
    greek_restaurant: "Greek",
    ramen_restaurant: "Ramen",
    fast_food_restaurant: "Fast Food",
    breakfast_restaurant: "Breakfast",
    brunch_restaurant: "Brunch",
    sandwich_shop: "Sandwich",
    hamburger_restaurant: "Burger",
    cafe: "Cafe",
    bakery: "Bakery",
    bar_and_grill: "Bar & Grill",
  };

  const PRICE_MAP = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 0,
    PRICE_LEVEL_MODERATE: 1,
    PRICE_LEVEL_EXPENSIVE: 2,
    PRICE_LEVEL_VERY_EXPENSIVE: 3,
  };

  function cuisineFromTypes(primaryType, types) {
    if (primaryType && CUISINE_MAP[primaryType]) return CUISINE_MAP[primaryType];
    if (Array.isArray(types)) {
      for (const t of types) {
        if (CUISINE_MAP[t]) return CUISINE_MAP[t];
      }
    }
    return "Restaurant";
  }

  // Pull a neighborhood-ish label out of addressComponents. Google rarely tags
  // a component as "neighborhood", so we walk a preference list and pick the
  // first match.
  function neighborhoodFromAddress(components) {
    if (!Array.isArray(components)) return "Nearby";
    const preference = [
      "neighborhood",
      "sublocality_level_1",
      "sublocality",
      "locality",
      "administrative_area_level_3",
      "administrative_area_level_2",
    ];
    for (const want of preference) {
      const hit = components.find((c) => c.types && c.types.includes(want));
      if (hit) return hit.shortText || hit.longText || "Nearby";
    }
    return "Nearby";
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        return reject(new Error("Geolocation not available"));
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }

  async function fetchNearby(latitude, longitude) {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.GOOGLE_PLACES_API_KEY) throw new Error("Missing GOOGLE_PLACES_API_KEY");

    const body = {
      includedTypes: ["restaurant"],
      maxResultCount: cfg.MAX_RESULTS || 20,
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: cfg.SEARCH_RADIUS_M || 4000,
        },
      },
    };

    const res = await fetch(PLACES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": cfg.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.primaryType,places.types,places.priceLevel,places.rating,places.addressComponents,places.googleMapsUri",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Places API ${res.status}: ${text}`);
    }
    const json = await res.json();
    return json.places || [];
  }

  function transformPlaces(places) {
    return places
      .map((p) => {
        const name = p.displayName && p.displayName.text;
        if (!name) return null;
        const cuisine = cuisineFromTypes(p.primaryType, p.types);
        const neighborhood = neighborhoodFromAddress(p.addressComponents);
        const price = p.priceLevel != null && PRICE_MAP[p.priceLevel] != null
          ? PRICE_MAP[p.priceLevel]
          : 1; // default to $$
        const rating = typeof p.rating === "number" ? p.rating : 4.0;
        const placeId = p.id || null;
        const mapsUrl = p.googleMapsUri || null;
        return { name, cuisine, neighborhood, price, rating, placeId, mapsUrl };
      })
      .filter(Boolean);
  }

  // Replace the globals defined in data.js so app.js (which reads them at init)
  // sees the live data. Called BEFORE app.js init runs.
  function applyLiveData(restaurants) {
    if (!restaurants || restaurants.length === 0) return false;
    const seenN = new Set();
    const seenC = new Set();
    restaurants.forEach((r) => {
      seenN.add(r.neighborhood);
      seenC.add(r.cuisine);
    });
    window.NEIGHBORHOODS = Array.from(seenN);
    window.CUISINES = Array.from(seenC);
    window.RESTAURANTS = restaurants;
    return true;
  }

  // ----- Place Details (lazy, on selection) -----
  // Fetches rich details for a single place: address, phone, hours, website, photo.
  window.fetchPlaceDetails = async function fetchPlaceDetails(placeId) {
    if (!placeId) return null;
    const cfg = window.APP_CONFIG || {};
    if (!cfg.GOOGLE_PLACES_API_KEY) return null;

    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": cfg.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,currentOpeningHours.openNow,currentOpeningHours.weekdayDescriptions,photos,googleMapsUri",
      },
    });
    if (!res.ok) return null;
    const d = await res.json();

    // Build a photo URL from the first photo reference
    let photoUrl = null;
    if (d.photos && d.photos.length > 0) {
      const photoName = d.photos[0].name; // e.g. "places/xxx/photos/yyy"
      photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${cfg.GOOGLE_PLACES_API_KEY}`;
    }

    return {
      address: d.formattedAddress || null,
      phone: d.nationalPhoneNumber || d.internationalPhoneNumber || null,
      website: d.websiteUri || null,
      mapsUrl: d.googleMapsUri || null,
      openNow: d.currentOpeningHours ? d.currentOpeningHours.openNow : null,
      hours: d.currentOpeningHours ? d.currentOpeningHours.weekdayDescriptions : null,
      photoUrl,
    };
  };

  // Default fallback when geolocation isn't granted (downtown Seattle).
  // Lets the user still see real Places data even without location permission.
  const FALLBACK_COORDS = { latitude: 47.6062, longitude: -122.3321 };

  // Public entry point — called by app.js before it builds the strips.
  window.loadLiveRestaurants = async function loadLiveRestaurants() {
    let coords;
    let usedFallbackCoords = false;
    try {
      coords = await getPosition();
    } catch (geoErr) {
      console.info("[urbanspoon] Geolocation unavailable, using Seattle default:", geoErr.message || geoErr);
      coords = FALLBACK_COORDS;
      usedFallbackCoords = true;
    }

    try {
      const places = await fetchNearby(coords.latitude, coords.longitude);
      const transformed = transformPlaces(places);
      const ok = applyLiveData(transformed);
      if (ok) {
        console.info(
          `[urbanspoon] Loaded ${transformed.length} live restaurants` +
            (usedFallbackCoords ? " (Seattle default)" : "")
        );
        return { source: "google", count: transformed.length, fallbackCoords: usedFallbackCoords };
      }
      console.warn("[urbanspoon] No usable restaurants in Places response, using stubs");
      return { source: "stub", count: window.RESTAURANTS.length };
    } catch (apiErr) {
      console.warn("[urbanspoon] Places API error, using stubs:", apiErr.message || apiErr);
      return { source: "stub", count: window.RESTAURANTS.length, error: apiErr.message || String(apiErr) };
    }
  };
})();
