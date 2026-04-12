// Stub restaurant data — used as a fallback when Google Places is unavailable.
// Bound to `window` so places.js can swap them out and app.js sees the change.

window.NEIGHBORHOODS = [
  "Capitol Hill",
  "Belltown",
  "Ballard",
  "Fremont",
  "Pioneer Sq",
  "U District",
  "Queen Anne",
  "West Seattle",
];

window.CUISINES = [
  "American",
  "Italian",
  "Mexican",
  "Thai",
  "Japanese",
  "Indian",
  "Chinese",
  "Vietnamese",
  "Pizza",
  "BBQ",
  "Seafood",
  "Vegetarian",
];

// Index 0..3 maps to $, $$, $$$, $$$$
window.PRICES = ["$", "$$", "$$$", "$$$$"];

window.RESTAURANTS = [
  { name: "The Pink Door", cuisine: "Italian", neighborhood: "Belltown", price: 2, rating: 4.5 },
  { name: "Dick's Drive-In", cuisine: "American", neighborhood: "Capitol Hill", price: 0, rating: 4.3 },
  { name: "Tilikum Place Café", cuisine: "American", neighborhood: "Belltown", price: 2, rating: 4.4 },
  { name: "Paseo", cuisine: "Vietnamese", neighborhood: "Fremont", price: 1, rating: 4.6 },
  { name: "Stateside", cuisine: "Vietnamese", neighborhood: "Capitol Hill", price: 2, rating: 4.5 },
  { name: "Tamarind Tree", cuisine: "Vietnamese", neighborhood: "Capitol Hill", price: 1, rating: 4.4 },
  { name: "Salare", cuisine: "American", neighborhood: "U District", price: 3, rating: 4.5 },
  { name: "Canlis", cuisine: "American", neighborhood: "Queen Anne", price: 3, rating: 4.8 },
  { name: "How To Cook A Wolf", cuisine: "Italian", neighborhood: "Queen Anne", price: 2, rating: 4.4 },
  { name: "Spinasse", cuisine: "Italian", neighborhood: "Capitol Hill", price: 3, rating: 4.6 },
  { name: "Tavolàta", cuisine: "Italian", neighborhood: "Belltown", price: 2, rating: 4.3 },
  { name: "Serious Pie", cuisine: "Pizza", neighborhood: "Belltown", price: 1, rating: 4.4 },
  { name: "Delancey", cuisine: "Pizza", neighborhood: "Ballard", price: 2, rating: 4.5 },
  { name: "Via Tribunali", cuisine: "Pizza", neighborhood: "Capitol Hill", price: 1, rating: 4.2 },
  { name: "La Carta de Oaxaca", cuisine: "Mexican", neighborhood: "Ballard", price: 1, rating: 4.4 },
  { name: "Cactus", cuisine: "Mexican", neighborhood: "West Seattle", price: 1, rating: 4.3 },
  { name: "Frelard Tamales", cuisine: "Mexican", neighborhood: "Fremont", price: 0, rating: 4.6 },
  { name: "Bangrak Market", cuisine: "Thai", neighborhood: "Belltown", price: 1, rating: 4.5 },
  { name: "Little Uncle", cuisine: "Thai", neighborhood: "Capitol Hill", price: 1, rating: 4.6 },
  { name: "Krua Thai", cuisine: "Thai", neighborhood: "U District", price: 0, rating: 4.2 },
  { name: "Maneki", cuisine: "Japanese", neighborhood: "Pioneer Sq", price: 2, rating: 4.5 },
  { name: "Sushi Kashiba", cuisine: "Japanese", neighborhood: "Pioneer Sq", price: 3, rating: 4.7 },
  { name: "Rondo", cuisine: "Japanese", neighborhood: "Fremont", price: 2, rating: 4.4 },
  { name: "Annapurna Cafe", cuisine: "Indian", neighborhood: "Capitol Hill", price: 1, rating: 4.4 },
  { name: "Roti Indian", cuisine: "Indian", neighborhood: "Queen Anne", price: 1, rating: 4.3 },
  { name: "Din Tai Fung", cuisine: "Chinese", neighborhood: "U District", price: 1, rating: 4.5 },
  { name: "Jade Garden", cuisine: "Chinese", neighborhood: "Pioneer Sq", price: 1, rating: 4.3 },
  { name: "Fat's Chicken", cuisine: "BBQ", neighborhood: "Capitol Hill", price: 1, rating: 4.4 },
  { name: "Wood Shop BBQ", cuisine: "BBQ", neighborhood: "West Seattle", price: 1, rating: 4.5 },
  { name: "The Walrus & The Carpenter", cuisine: "Seafood", neighborhood: "Ballard", price: 2, rating: 4.6 },
  { name: "Taylor Shellfish", cuisine: "Seafood", neighborhood: "Capitol Hill", price: 2, rating: 4.5 },
  { name: "Ivar's Acres of Clams", cuisine: "Seafood", neighborhood: "Pioneer Sq", price: 2, rating: 4.2 },
  { name: "Plum Bistro", cuisine: "Vegetarian", neighborhood: "Capitol Hill", price: 2, rating: 4.4 },
  { name: "Café Flora", cuisine: "Vegetarian", neighborhood: "Fremont", price: 2, rating: 4.3 },
];
