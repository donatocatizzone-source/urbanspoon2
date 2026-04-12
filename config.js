// Local config — do NOT commit if you ever add this directory to git.
// Add `config.js` to .gitignore alongside any future repo init.
//
// This key is used by the Places API (v1) directly from the browser.
// Restrict it in Google Cloud Console:
//   - Application restrictions: HTTP referrers (websites)
//   - Allowed referrers: http://localhost:5173/* and your eventual deployed origin
//   - API restrictions: Places API (New) only
window.APP_CONFIG = {
  GOOGLE_PLACES_API_KEY: "AIzaSyDfblwz20F9BHKns1zICIDnobIX0gjKOus",
  // Default radius (meters) for the nearby search — 10 miles ≈ 16093 m.
  // The Places API (New) circle radius caps at 50000 m.
  SEARCH_RADIUS_M: 16093,
  // Max results — Places API New caps at 20 per request
  MAX_RESULTS: 20,
};
