// Original INEXHO line icons, retained from the existing template.
const paths = {
  home: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8",
  bed: "M3 18V6m18 12V9M3 14h18M3 9h6v5M9 10h12v4M3 18v3m18-3v3",
  people:
    "M16 21v-3a4 4 0 0 0-8 0v3M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 11a3 3 0 0 1 3 3v5M3 11a3 3 0 0 0-3 3v5",
  pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0",
  photo: "M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M16 7h.01",
  wifi: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01",
  shield: "M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6ZM8 12l3 3 5-6",
  car: "M4 11l2-6h12l2 6M3 11h18v8H3ZM6 15h1m10 0h1M5 19v2m14-2v2",
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}
