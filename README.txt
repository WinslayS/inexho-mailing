INEXHO MAILING — LOCAL A4 EDITOR

Open index.html in a modern browser, or serve this folder over HTTP/HTTPS.
For a local server: python3 -m http.server 8000, then open http://localhost:8000.
No backend, account, runtime dependencies or build step is required.

USING THE EDITOR
• Click city, property type, area or company details to edit plain text.
• Bedrooms and persons accept whole numbers (0–9999).
• Click an availability badge to choose Available now or a real date.
• Drag the grip above a property to change its position. Keyboard alternative:
  focus the grip and press the arrow keys. Touch uses the same grips.
• Positions 1–3 show up to three photos; later positions are compact text cards.
  Moving a property out of the top three hides its photos without deleting them.
• Add photos accepts JPG, PNG and WebP. Images are processed in this browser,
  resized to at most 1400 pixels on the long side and saved as compressed JPEGs.
• Drag a photo's grip to reorder it. The first photo is the main image. Arrow
  keys on the grip also work. The × on a photo removes only that photo.
• Changes save automatically to IndexedDB. Saved ✓ means the transaction has
  completed. Storage errors are shown explicitly. Do not close during uploads
  or while Saving is displayed. There is no manual Save button.
• Reset asks for confirmation, clears the saved mailing and restores six
  example properties. Remove also asks for confirmation.

LOCAL DATA
Data belongs to this browser and origin. It does not sync between devices or
browsers. Clearing site data removes the mailing. Private browsing may discard
it. Using the same HTTPS address or localhost port provides a stable origin;
file:// storage behaviour differs between browsers. The application warns when
storage is unavailable. Avoid editing the same mailing in multiple tabs.

PDF
Export PDF opens the browser print dialog. Select Save as PDF, A4, portrait,
100% scale, background graphics ON, and browser headers/footers OFF.
The document uses @page margins of zero with internal page padding, so Chromium
suppresses its automatic headers and footers (including with its header/footer
flag enabled in the automated export check). Websites cannot override every
browser/printer preference: confirm the preview when using a different browser.
There is only one layout: three columns, A4 portrait, cards kept whole. The
header appears once at the start; totals and facilities appear once at the end.
Phone/tablet editing is responsive, but the printed layout remains identical.
Missing photos never print as grey upload placeholders. Examples are not live
property availability; replace their details before distributing a mailing.

DEVELOPMENT / VERIFICATION
Files: index.html, styles.css, icons.js (original SVG paths), app.js.
The explicit nine-position compact-card colour pattern is presentation only.
State uses stable IDs and stores image Blobs in a single IndexedDB document.
Pagination uses fixed millimetre heights shared with CSS. If changing those
heights, update the mm constants in app.js too.

Run: npm install; npx playwright install chromium; npm test
To use an existing Chromium executable set BROWSER_EXECUTABLE_PATH.
Tests cover autosave/reload, image handling, ordering, date formatting,
plain-text editing, reset, zero properties, pagination and mobile PDF parity.
