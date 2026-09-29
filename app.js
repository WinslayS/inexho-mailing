"use strict";
/* Local-only editor. Photo/compact styling belongs to positions, never to records. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const limits = {
  city: 32,
  type: 32,
  area: 48,
  name: 60,
  phone: 30,
  email: 80,
  street: 65,
  locality: 65,
};
const compactPattern = [
  "light",
  "navy",
  "light",
  "navy",
  "light",
  "light",
  "light",
  "light",
  "navy",
];
const mm = {
  content: 277,
  header: 36,
  photo: 102,
  compact: 54,
  footer: 28,
  gap: 4,
};
let state,
  database,
  uploadTarget,
  saveTimer,
  saveChain = Promise.resolve(),
  revision = 0,
  savedRevision = -1;
let jobs = new Set(),
  drag = null,
  urlCache = new Map(),
  toastTimer;

function newProperty(
  city = "",
  type = "",
  bedrooms = 0,
  persons = 0,
  area = "",
) {
  return {
    id: uid(),
    city,
    type,
    bedrooms,
    persons,
    area,
    availability: { mode: "now", date: "" },
    photos: [],
  };
}
function defaults() {
  return {
    version: 2,
    company: {
      name: "International Expats Houses",
      phone: "+31 6 1539 7067",
      email: "jhopman@inexho.com",
      street: "Diamantweg 68",
      locality: "Alkmaar, Netherlands",
    },
    properties: [
      newProperty("Rotterdam", "Apartment", 4, 8, "City centre"),
      newProperty("Vlaardingen", "House", 3, 5, "Quiet area"),
      newProperty("Amsterdam", "Apartment", 2, 3, "Near station"),
      newProperty("Haarlem", "House", 4, 6, "Residential area"),
      newProperty("Zaandam", "Apartment", 3, 5, "Near station"),
      newProperty("Alkmaar", "House", 3, 4, "City centre"),
    ],
  };
}
const property = (id) => state.properties.find((p) => p.id === id);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === value;
}
function availability(p) {
  return p.availability.mode === "date" && validDate(p.availability.date)
    ? `Available ${p.availability.date.slice(8, 10)}.${p.availability.date.slice(5, 7)}`
    : "Available now";
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3200);
}
function status(message, error = false) {
  $("#save-status").textContent = message;
  $("#save-status").classList.toggle("error", error);
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("inexho-mailing", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents");
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other INEXHO tabs and reload."));
  });
}
function readState() {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction("documents")
      .objectStore("documents")
      .get("current");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function writeState(snapshot, clear = false) {
  return new Promise((resolve, reject) => {
    if (!database) return reject(new Error("Local storage unavailable"));
    const transaction = database.transaction("documents", "readwrite");
    const store = transaction.objectStore("documents");
    if (clear) store.clear();
    store.put(snapshot, "current");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("Save interrupted"));
  });
}
function queueSave(clear = false) {
  clearTimeout(saveTimer);
  const snapshot = structuredClone(state),
    current = revision;
  const operation = saveChain
    .catch(() => {})
    .then(() => writeState(snapshot, clear));
  saveChain = operation
    .then(() => {
      savedRevision = Math.max(savedRevision, current);
      if (revision === current && jobs.size === 0) status("Saved ✓");
    })
    .catch((error) => {
      status("Not saved — storage error", true);
      console.error("Local save failed:", error);
      throw error;
    });
  // Callers may await this promise; unattended autosave errors remain visible, never reported as Saved.
  saveChain.catch(() => {});
  return saveChain;
}
function changed() {
  revision++;
  status(jobs.size ? "Processing…" : "Saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => queueSave().catch(() => {}), 220);
  updateSummary();
}
async function flushSave() {
  clearTimeout(saveTimer);
  if (revision !== savedRevision) await queueSave();
  else await saveChain;
}
function edit(field, value, extra = "") {
  return `contenteditable="plaintext-only" role="textbox" spellcheck="false" data-field="${field}" aria-label="${field}" data-placeholder="${escapeHTML(extra || field)}"`;
}
function companyHeader() {
  const c = state.company;
  return `<header class="company-header"><div class="brand-lockup"><svg class="logo" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M5 24 24 7l19 17v19H28V29h-8v14H5Z" stroke="currentColor" stroke-width="4"/><path d="m13 14 11-10 19 17" stroke="white" stroke-width="3"/></svg><div><h1 data-company ${edit("name", c.name)}>${escapeHTML(c.name)}</h1><p class="eyebrow">CORPORATE HOUSING</p></div></div><div class="company-contact">${["phone", "email"].map((f) => `<div class="contact-line"><span data-company ${edit(f, c[f])}>${escapeHTML(c[f])}</span><button class="copy editor-only" data-copy="${f}" aria-label="Copy ${f}" title="Copy ${f}"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="6" y="6" width="10" height="11" rx="1"/><path d="M12 6V3H3v10h3"/></svg></button></div>`).join("")}</div><address class="company-address"><div data-company ${edit("street", c.street)}>${escapeHTML(c.street)}</div><div data-company ${edit("locality", c.locality)}>${escapeHTML(c.locality)}</div></address></header>`;
}
function footer() {
  return `<footer class="mailing-footer"><div><div class="summary"><div><strong data-total>${state.properties.length}</strong><span>available properties</span></div><div><strong><span data-capacity>${state.properties.reduce((sum, p) => sum + p.persons, 0)}</span> <small>persons</small></strong><span>maximum total capacity</span></div></div><p class="footer-note">Facilities may vary by property.<br>Availability subject to confirmation.</p></div><div class="features">${[
    ["bed", "Furnished"],
    ["wifi", "Internet"],
    ["shield", "SNF"],
    ["car", "Parking"],
  ]
    .map(([name, label]) => `<div>${icon(name)}${label}</div>`)
    .join("")}</div></footer>`;
}
function updateSummary() {
  $$("[data-total]").forEach((e) => (e.textContent = state.properties.length));
  $$("[data-capacity]").forEach(
    (e) =>
      (e.textContent = state.properties.reduce((sum, p) => sum + p.persons, 0)),
  );
}
function photoURL(photo) {
  if (!urlCache.has(photo.id))
    urlCache.set(photo.id, URL.createObjectURL(photo.blob));
  return urlCache.get(photo.id);
}
function badge(p) {
  return `<button class="badge" data-action="availability" aria-label="Change availability for ${escapeHTML(p.city || "property")}" aria-expanded="false"><span>${availability(p)}</span><b aria-hidden="true">→</b></button>`;
}
function gallery(p) {
  if (!p.photos.length)
    return `<div class="gallery count-0">${badge(p)}<div class="placeholder editor-only">${icon("photo")}<span>Add up to 3 photos</span></div></div>`;
  return `<div class="gallery count-${p.photos.length}">${p.photos.map((photo, i) => `<div class="photo" data-photo-id="${photo.id}"><img src="${photoURL(photo)}" alt="${escapeHTML(p.city || "Property")} photo ${i + 1}" draggable="false">${i === 0 ? badge(p) : ""}<div class="photo-tools editor-only"><button class="photo-handle" data-drag="photo" aria-label="Move photo ${i + 1}; use arrow keys or drag" title="Drag to reorder · arrow keys"><svg viewBox="0 0 12 16" width="10" height="13" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.3"/><circle cx="9" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="9" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="9" cy="13" r="1.3"/></svg></button><span class="photo-count">${i === 0 ? "1 · Main" : i + 1}</span><button data-action="remove-photo" aria-label="Remove photo ${i + 1}">×</button></div></div>`).join("")}</div>`;
}
function card(p, index) {
  const photo = index < 3,
    theme = photo ? "" : compactPattern[(index - 3) % compactPattern.length];
  return `<article class="property-card ${photo ? "photo-card" : "compact-card"} ${theme} ${p.photos.length ? "" : "no-photo"}" data-id="${p.id}" aria-label="Property ${index + 1}: ${escapeHTML(p.city || "New property")}"><div class="card-tools editor-only"><button class="card-handle" data-drag="card" aria-label="Move ${escapeHTML(p.city || "property")}; use arrow keys or drag" title="Drag to reorder · arrow keys"><svg viewBox="0 0 12 16" width="10" height="13" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.3"/><circle cx="9" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="9" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="9" cy="13" r="1.3"/></svg></button><button data-action="remove" aria-label="Remove ${escapeHTML(p.city || "property")}" title="Remove property">×</button></div><div class="info"><h2 data-length="${p.city.length > 28 ? "long" : p.city.length > 19 ? "medium" : "short"}" ${edit("city", p.city, "City")}>${escapeHTML(p.city)}</h2><p class="type" ${edit("type", p.type, "Property type")}>${escapeHTML(p.type)}</p><div class="facts">${[
    ["bed", "bedrooms"],
    ["people", "persons"],
  ]
    .map(
      ([name, f]) =>
        `<div class="fact">${icon(name)}<span><input class="number-input" type="number" min="0" max="9999" step="1" inputmode="numeric" data-field="${f}" aria-label="${f}" value="${p[f]}"><span class="number-print">${p[f]}</span> ${f}</span></div>`,
    )
    .join(
      "",
    )}<div class="fact">${icon("pin")}<span class="area" ${edit("area", p.area, "Area (optional)")}>${escapeHTML(p.area)}</span></div></div>${photo ? "" : badge(p)}</div>${photo ? gallery(p) : ""}${photo && p.photos.length < 3 ? '<div class="photo-controls editor-only"><button data-action="upload">+ Add photos</button></div>' : ""}</article>`;
}
// All dimensions are defined in millimetres, independent of viewport and loaded images.
function paginate(properties) {
  const pages = [{ header: true, rows: [], used: mm.header }],
    rows = [];
  for (let i = 0; i < properties.length; i += 3)
    rows.push({
      start: i,
      items: properties.slice(i, i + 3),
      height: i === 0 ? mm.photo : mm.compact,
    });
  for (const row of rows) {
    let page = pages.at(-1),
      gap = page.header || page.rows.length ? mm.gap : 0;
    if (page.used + gap + row.height > mm.content) {
      page = { header: false, rows: [], used: 0 };
      pages.push(page);
      gap = 0;
    }
    page.rows.push(row);
    page.used += gap + row.height;
  }
  let last = pages.at(-1);
  if (last.used + mm.gap + mm.footer > mm.content) {
    // Keep the footer with a property row instead of creating a footer-only sheet.
    const row = last.rows.pop();
    last.used -= row.height + mm.gap;
    last = { header: false, rows: [row], used: row.height };
    pages.push(last);
  }
  last.footer = true;
  return pages;
}
function render(animateID) {
  const used = new Set(
    state.properties.flatMap((p) => p.photos.map((photo) => photo.id)),
  );
  for (const [id, url] of urlCache)
    if (!used.has(id)) {
      URL.revokeObjectURL(url);
      urlCache.delete(id);
    }
  $("#pages").innerHTML = paginate(state.properties)
    .map(
      (page) =>
        `<section class="page">${page.header ? companyHeader() : ""}${page.rows.map((row) => `<div class="property-row ${row.start === 0 ? "photo-row" : ""}">${row.items.map((p, i) => card(p, row.start + i)).join("")}</div>`).join("")}${!state.properties.length ? '<div class="empty-state editor-only"><strong>Your mailing starts here</strong>Add a property to get started.</div>' : ""}${page.footer ? footer() : ""}</section>`,
    )
    .join("");
  if (animateID) $(`[data-id="${animateID}"]`)?.classList.add("moving");
  $("#pages").setAttribute("aria-busy", "false");
}
function cleanText(value, field) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .slice(0, limits[field] || 80);
}
function commitField(element, blur = false) {
  const field = element.dataset.field;
  const record = element.hasAttribute("data-company")
    ? state.company
    : property(element.closest("[data-id]")?.dataset.id);
  if (!record) return;
  let value;
  if (element.matches(".number-input")) {
    const parsed = Number(element.value);
    value = Number.isFinite(parsed)
      ? Math.min(9999, Math.max(0, Math.floor(parsed)))
      : 0;
    if (blur) element.value = value;
    element.nextElementSibling.textContent = value;
  } else {
    value = cleanText(element.textContent, field);
    if (blur) value = value.trim();
    if (blur || value !== element.textContent) {
      element.textContent = value;
      if (!blur) {
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
  if (field === "city")
    element.dataset.length =
      value.length > 28 ? "long" : value.length > 19 ? "medium" : "short";
  if (record[field] !== value) {
    record[field] = value;
    changed();
  }
}
$("#pages").addEventListener("input", (event) => {
  if (event.target.matches("[data-field]")) commitField(event.target);
});
$("#pages").addEventListener("focusout", (event) => {
  if (event.target.matches("[data-field]")) commitField(event.target, true);
});
$("#pages").addEventListener("paste", (event) => {
  const target = event.target.closest("[contenteditable]");
  if (!target) return;
  event.preventDefault();
  const text = cleanText(
      event.clipboardData.getData("text/plain"),
      target.dataset.field,
    ),
    selection = getSelection();
  if (selection.rangeCount) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    commitField(target);
  }
});
$("#pages").addEventListener("keydown", (event) => {
  if (event.target.matches("[contenteditable]") && event.key === "Enter") {
    event.preventDefault();
    event.target.blur();
  }
  const handle = event.target.closest("[data-drag]");
  if (
    !handle ||
    !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
  )
    return;
  event.preventDefault();
  const id = handle.closest("[data-id]").dataset.id,
    delta = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1;
  if (handle.dataset.drag === "card")
    moveProperty(id, state.properties.findIndex((p) => p.id === id) + delta);
  else {
    const p = property(id),
      photoID = handle.closest("[data-photo-id]").dataset.photoId;
    movePhoto(id, photoID, p.photos.findIndex((x) => x.id === photoID) + delta);
  }
  const selector =
    handle.dataset.drag === "card"
      ? `[data-id="${id}"] .card-handle`
      : `[data-id="${id}"] .photo-handle`;
  $(selector)?.focus();
});
function confirmAction(title, message, label) {
  const dialog = $("#confirm-dialog");
  $("#confirm-title").textContent = title;
  $("#confirm-copy").textContent = message;
  $("#confirm-action").textContent = label;
  dialog.returnValue = "cancel";
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true },
    );
    dialog.showModal();
  });
}
function positions(selector) {
  return new Map(
    $$(selector).map((e) => [
      e.dataset.id || e.dataset.photoId,
      e.getBoundingClientRect(),
    ]),
  );
}
function animatePositions(before, selector) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  $$(selector).forEach((e) => {
    const old = before.get(e.dataset.id || e.dataset.photoId);
    if (!old) return;
    const now = e.getBoundingClientRect(),
      x = old.left - now.left,
      y = old.top - now.top;
    if (x || y)
      e.animate(
        [
          { transform: `translate(${x}px,${y}px)` },
          { transform: "translate(0,0)" },
        ],
        { duration: 190, easing: "ease-out" },
      );
  });
}
function moveProperty(id, to) {
  const from = state.properties.findIndex((p) => p.id === id);
  if (from < 0 || to < 0 || to >= state.properties.length || from === to)
    return;
  const before = positions(".property-card");
  state.properties.splice(to, 0, state.properties.splice(from, 1)[0]);
  changed();
  render();
  animatePositions(before, ".property-card");
  notify(`Property moved to position ${to + 1}`);
}
function movePhoto(id, photoID, to) {
  const p = property(id),
    from = p.photos.findIndex((x) => x.id === photoID);
  if (from < 0 || to < 0 || to >= p.photos.length || from === to) return;
  const before = positions(".photo");
  p.photos.splice(to, 0, p.photos.splice(from, 1)[0]);
  changed();
  render();
  animatePositions(before, ".photo");
  notify("Photo order updated");
}
function showAvailability(cardElement, p) {
  $$(".availability-popover").forEach((e) => e.remove());
  $$(".badge").forEach((e) => e.setAttribute("aria-expanded", "false"));
  $(".badge", cardElement).setAttribute("aria-expanded", "true");
  const box = document.createElement("div");
  box.className = "availability-popover editor-only";
  box.innerHTML = `<label>Availability<select aria-label="Availability mode"><option value="now">Available now</option><option value="date">Choose date</option></select></label><input type="date" aria-label="Available date" value="${p.availability.date || today()}"><button data-action="close-availability">Done</button>`;
  cardElement.append(box);
  $("select", box).value = p.availability.mode;
  $("input", box).hidden = p.availability.mode !== "date";
  box.addEventListener("change", (event) => {
    const mode = $("select", box).value,
      date = $("input", box).value;
    if (mode === "date" && !validDate(date)) {
      notify("Choose a valid date.");
      return;
    }
    p.availability = {
      mode,
      date: mode === "date" ? date : p.availability.date,
    };
    $("input", box).hidden = mode !== "date";
    $(".badge span", cardElement).textContent = availability(p);
    changed();
  });
  $("select", box).focus();
}
$("#pages").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.copy) {
    try {
      await navigator.clipboard.writeText(state.company[button.dataset.copy]);
      notify("Copied");
    } catch {
      notify("Copy unavailable here. Select the text to copy.");
    }
    return;
  }
  const cardElement = button.closest("[data-id]"),
    p = property(cardElement?.dataset.id);
  if (!p) return;
  switch (button.dataset.action) {
    case "upload":
      uploadTarget = p.id;
      $("#photo-input").click();
      break;
    case "remove":
      if (
        await confirmAction(
          `Remove ${p.city || "property"}?`,
          "This property and its photos will be removed from this mailing.",
          "Remove",
        )
      ) {
        cardElement.classList.add("removing");
        await new Promise((resolve) => setTimeout(resolve, 140));
        state.properties = state.properties.filter((x) => x.id !== p.id);
        changed();
        render();
      }
      break;
    case "remove-photo":
      p.photos = p.photos.filter(
        (x) => x.id !== button.closest("[data-photo-id]").dataset.photoId,
      );
      changed();
      render(p.id);
      break;
    case "availability":
      showAvailability(cardElement, p);
      break;
    case "close-availability":
      button.closest(".availability-popover").remove();
      $(".badge", cardElement).setAttribute("aria-expanded", "false");
      $(".badge", cardElement).focus();
      break;
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $$(".availability-popover").forEach((e) => e.remove());
    $$(".badge").forEach((e) => e.setAttribute("aria-expanded", "false"));
    cancelDrag();
  }
});
$("#add").onclick = () => {
  document.activeElement.blur();
  const p = newProperty();
  state.properties.push(p);
  changed();
  render(p.id);
  $(`[data-id="${p.id}"] h2`).focus();
};
$("#reset").onclick = async () => {
  if (
    !(await confirmAction(
      "Reset mailing?",
      "All current properties and uploaded photos will be removed from this browser. The example mailing will be restored.",
      "Reset",
    ))
  )
    return;
  status("Resetting…");
  cancelDrag();
  await Promise.allSettled([...jobs]);
  clearTimeout(saveTimer);
  state = defaults();
  revision++;
  render();
  try {
    await queueSave(true);
    notify("Example mailing restored");
  } catch {
    notify("Reset could not be saved. Check browser storage.");
  }
};
async function optimizeImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(`${file.name}: use JPG, PNG or WebP.`);
  // Browser decoding applies EXIF orientation. Originals are never stored.
  let image, objectURL;
  try {
    if (typeof createImageBitmap === "function")
      image = await createImageBitmap(file, { imageOrientation: "from-image" });
    else {
      objectURL = URL.createObjectURL(file);
      image = new Image();
      image.src = objectURL;
      await image.decode();
    }
    const ratio = Math.min(1, 1400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encode = (quality) =>
      new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("Image compression failed")),
          "image/jpeg",
          quality,
        ),
      );
    let blob = await encode(0.82);
    if (blob.size > 400 * 1024) blob = await encode(0.76);
    return { id: uid(), blob, width: canvas.width, height: canvas.height };
  } finally {
    image?.close?.();
    if (objectURL) URL.revokeObjectURL(objectURL);
  }
}
function busyButtons() {
  $("#export").disabled = jobs.size > 0 || !!drag;
  $("#reset").disabled = jobs.size > 0;
}
$("#photo-input").onchange = (event) => {
  const id = uploadTarget,
    p = property(id),
    files = [...event.target.files];
  event.target.value = "";
  if (!p || !files.length) return;
  const room = 3 - p.photos.length;
  if (files.length > room)
    notify(`Only the first ${room} selected photos will be added.`);
  const task = (async () => {
    for (const file of files.slice(0, room)) {
      try {
        const photo = await optimizeImage(file);
        const current = property(id);
        if (current && current.photos.length < 3) current.photos.push(photo);
      } catch (error) {
        notify(error.message);
      }
    }
    changed();
    render(id);
    await queueSave();
  })();
  jobs.add(task);
  status("Processing…");
  busyButtons();
  task
    .catch(() =>
      notify(
        "Photos are visible but could not be saved. Check browser storage.",
      ),
    )
    .finally(() => {
      jobs.delete(task);
      busyButtons();
      if (!jobs.size && revision === savedRevision) status("Saved ✓");
    });
};
// Pointer sorting works with a mouse, pen or touch. Handles keep editing/scrolling separate.
$("#pages").addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-drag]");
  if (!handle || event.button !== 0) return;
  document.activeElement.blur();
  const cardElement = handle.closest("[data-id]"),
    source =
      handle.dataset.drag === "photo"
        ? handle.closest("[data-photo-id]")
        : cardElement;
  drag = {
    kind: handle.dataset.drag,
    propertyID: cardElement.dataset.id,
    photoID: source.dataset.photoId,
    source,
    handle,
    pointerID: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    active: false,
    target: null,
  };
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
  busyButtons();
});
document.addEventListener(
  "pointermove",
  (event) => {
    if (!drag || event.pointerId !== drag.pointerID) return;
    if (
      !drag.active &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6
    )
      return;
    if (!drag.active) {
      drag.active = true;
      const bounds = drag.source.getBoundingClientRect();
      drag.ghost = drag.source.cloneNode(true);
      drag.ghost.classList.add("drag-ghost");
      drag.ghost.style.width = `${bounds.width}px`;
      drag.ghost.style.height = `${bounds.height}px`;
      drag.ghost.setAttribute("aria-hidden", "true");
      drag.ghost.inert = true;
      document.body.append(drag.ghost);
      drag.offsetX = drag.startX - bounds.left;
      drag.offsetY = drag.startY - bounds.top;
      drag.source.classList.add("drag-source");
      document.body.classList.add("dragging");
    }
    event.preventDefault();
    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    const under = document.elementFromPoint(event.clientX, event.clientY),
      candidate = under?.closest(
        drag.kind === "card" ? ".property-card" : ".photo",
      );
    $$(".drop-target").forEach((e) => e.classList.remove("drop-target"));
    drag.target =
      candidate &&
      candidate !== drag.source &&
      (drag.kind === "card" ||
        candidate.closest("[data-id]")?.dataset.id === drag.propertyID)
        ? candidate
        : null;
    drag.target?.classList.add("drop-target");
    if (event.clientY < 110) window.scrollBy(0, -14);
    else if (event.clientY > innerHeight - 65) window.scrollBy(0, 14);
  },
  { passive: false },
);
function cancelDrag() {
  if (!drag) return;
  drag.ghost?.remove();
  drag.source.classList.remove("drag-source");
  $$(".drop-target").forEach((e) => e.classList.remove("drop-target"));
  document.body.classList.remove("dragging");
  drag = null;
  busyButtons();
}
document.addEventListener("pointerup", (event) => {
  if (!drag || drag.pointerID !== event.pointerId) return;
  const { kind, propertyID, photoID, target, active } = drag;
  const to = target
    ? kind === "card"
      ? state.properties.findIndex((p) => p.id === target.dataset.id)
      : property(propertyID).photos.findIndex(
          (p) => p.id === target.dataset.photoId,
        )
    : -1;
  cancelDrag();
  if (active && to >= 0) {
    if (kind === "card") moveProperty(propertyID, to);
    else movePhoto(propertyID, photoID, to);
  }
});
document.addEventListener("pointercancel", cancelDrag);
async function exportPDF() {
  document.activeElement.blur();
  cancelDrag();
  await Promise.allSettled([...jobs]);
  try {
    await flushSave();
  } catch {
    notify(
      "Local save failed. The PDF will still contain your current changes.",
    );
  }
  render();
  document.getAnimations().forEach((animation) => animation.finish());
  await document.fonts.ready;
  await Promise.all(
    $$("#pages img").map((image) => image.decode().catch(() => {})),
  );
  window.print();
}
$("#export").onclick = exportPDF;
window.addEventListener("beforeprint", () => {
  if (!state) return;
  document.activeElement.blur();
  cancelDrag();
  render();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && state)
    flushSave().catch(() => {});
});
window.addEventListener("pagehide", () => {
  if (state) flushSave().catch(() => {});
});
window.addEventListener("beforeunload", (event) => {
  if (state && (jobs.size || revision !== savedRevision)) {
    event.preventDefault();
    event.returnValue = "";
  }
});
async function init() {
  try {
    database = await openDatabase();
    state = await readState();
    if (!state) {
      state = defaults();
      await queueSave();
    } else {
      savedRevision = revision;
      status("Saved ✓");
    }
  } catch (error) {
    state = state || defaults();
    status("Local saving unavailable", true);
    notify(
      "Browser storage is unavailable. Changes will not survive closing this page.",
    );
  }
  document.body.classList.add("starting");
  render();
  setTimeout(() => document.body.classList.remove("starting"), 600);
  $("#add").disabled = false;
  $("#reset").disabled = false;
  $("#export").disabled = false;
}
init();
