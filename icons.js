// Shared INEXHO line icons for property cards and accommodation features.
const paths = {
  home: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8",
  bed: "M3 18v3m18-3v3M3 18h18v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2ZM5 10V5h14v5M7 10V7h4v3m2 0V7h4v3",
  people:
    "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-2a7 7 0 0 1 14 0v2",
  pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0",
  photo: "M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M16 7h.01",
  kitchen: "M3 3h18v18H3ZM3 9h18M9 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 12h12v6H6ZM9 14h6M6 21v1m12-1v1",
  washing: "M3 3h18v18H3ZM3 7h18M6 5h.01m3 0h.01M17 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM7 14c2-2 3 2 5 0s3 0 5 0",
  wifi: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01",
  shield: "M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6ZM8 12l3 3 5-6",
  car: "M4 11l2-6h12l2 6M3 11h18v8H3ZM6 15h1m10 0h1M5 19v2m14-2v2",
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}
