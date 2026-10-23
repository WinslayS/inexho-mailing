# INEXHO Mailing list

A property availability editor for **International Expats Houses**. Add properties, photos and availability dates, then save a professional A4 PDF. Share the finished document with clients using your preferred method, such as an email attachment.

All you need to use the editor is a modern browser. No registration or additional editing software is required.

## Quick start

1. Open the editor in **Google Chrome** or **Microsoft Edge**.
2. Replace the example properties with your own details and photos.
3. Check the company contact details and list date.
4. Wait for **Saved ✓** in the toolbar.
5. Click **Export PDF**, check the print preview and save the file.

If you received the project as a ZIP archive, extract the entire archive before opening `index.html`. Keep the folder structure intact: the scripts, stylesheet and `assets/` folder must remain alongside the page. For reliable storage, use the editor at a consistent web address; local hosting instructions are provided in the developer section.

## Preparing your list

### Company details and publication date

Click the company name, subtitle, phone number, email or address directly in the banner to edit the text.

Click the underlined date next to **List date** to choose a date from the calendar. This is the publication date of the whole list. Each property's availability is set separately.

### Properties

| Task | How to do it |
| --- | --- |
| Edit a city or property type | Click the corresponding text in the card. |
| Set a region | Click the field next to the location icon. For example: `North Holland`. |
| Change bedrooms or capacity | Type a number or use the arrows beside it. Values must be whole numbers from 0 to 9999. |
| Set availability | Click **Available now**, keep that option or choose a specific date. |
| Add a property | Click **+ Add property** in the toolbar. |
| Reorder properties | Drag a card using the grip above it. You can also focus the grip and use the arrow keys. |
| Remove a property | Click **×** above the card and confirm removal. |

The first **three** properties display photos; the remaining properties use compact cards. Moving a property below the third position hides its photos without deleting them. Move it back into the first three positions to show them again.

### Photos

- Click **+ Add photos** on one of the first three cards. Each property can contain up to **three** photos in JPG, PNG or WebP format.
- Drag a photo using its grip to change the order. The first photo is the main image. Arrow-key controls are also supported.
- Click **×** on a photo to remove that photo only.

The editor resizes and compresses photos for the PDF. Original files on your device remain unchanged. Wait for processing to finish before closing the page.

The property count and **total capacity**, the combined number of people the properties can accommodate, update automatically. Before sharing the list, confirm actual property availability and the facilities provided.

## Saving a PDF

Click **Export PDF** or press **Ctrl+P**; on Mac, use **⌘+P**. In the print dialog, select:

| Setting | Value |
| --- | --- |
| Printer / destination | Save as PDF |
| Paper size | A4 |
| Orientation | Portrait |
| Scale | 100% |
| Margins | None — the document already includes its own spacing |
| Background graphics | On |
| Browser headers and footers | Off |

Check the preview, then click **Save**. The editor suggests a filename based on the selected list date, such as `INEXHO Mailing list - 2026-10-24.pdf`. You can change the final filename in the save dialog.

The PDF uses three columns on A4 pages. The company banner appears at the start, with totals and facilities at the end. Cards are distributed across pages automatically. The editor adapts to phone screens while keeping the printed PDF layout consistent.

## How your data is saved

Changes save automatically **in the current browser on the current device**. **Saved ✓** confirms that saving has finished. Keep the page open while **Saving…** or **Processing…** is displayed.

- Return to the same address in the same browser. A different address or local server port uses separate storage.
- Data does not sync between devices. Clearing site data removes the saved list; private browsing may discard it when the browser closes.
- Storage behaviour varies when opening the page through `file://`. If saving is unavailable, use the editor over HTTP/HTTPS.
- If a storage error appears, keep the page open and save the current result as a PDF first.
- After confirmation, **Reset** clears the entire document, including properties, photos, company details and the list date. It restores the default settings and six example properties. This action cannot be undone.

A PDF is the finished document for your client. It cannot be loaded back into the editor to continue editing. Avoid editing the same list in multiple tabs at once.

## For developers

### Technology and project structure

The application uses HTML, CSS and JavaScript. It requires no build step, backend, server database or runtime npm packages. Playwright is used only for testing.

```text
index.html       Page structure and toolbar
app.js           Editing, autosave, photos and pagination
styles.css       Interface, responsive layout and A4 print styles
icons.js         Shared SVG icons for property cards and the footer
assets/          Toolbar logo (logo-blue.png), document logo (logo.png), favicon
tests/editor.cjs Playwright browser tests
README.md        User and developer guide
```

### Running locally

Use the **`dev`** branch for development. You will need Git and Python 3; tests also require Node.js and npm.

```bash
git clone --branch dev https://github.com/WinslayS/inexho-mailing.git
cd inexho-mailing
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000` in your browser. Press **Ctrl+C** in the terminal to stop the server. On Windows, you can use `py -3` instead of `python3`.

The server only serves static files. Refresh the page after changing HTML, CSS or JavaScript; no build is needed. Keep the address and port consistent to retain access to the same browser data.

### Running tests

From the project root, run:

```bash
npm install
npx playwright install chromium
npm test
```

If Chromium is already installed, the tests can use its executable. For example, on Linux:

```bash
BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

Tests cover editing and autosave, older saved documents, dates, photo processing and ordering, property sorting, numeric fields and step controls, card themes, pagination for 0–100 properties, mobile layout and PDF generation. Screenshots and PDFs from the current run are saved in `test-results/`, which is excluded from Git.

### Development notes

- State is stored in IndexedDB: database `inexho-mailing`, object store `documents`, key `current`. Photos are stored as Blobs with the document.
- When adding fields, provide defaults for older documents. Application updates must preserve existing user data.
- The region field retains the key `area` for compatibility with existing documents.
- Photos are processed in the browser, resized to a maximum of 1400 pixels on the long side and saved as JPEGs. Original files on the user's device remain unchanged.
- Card appearance depends on position: the first three show photos, and later positions use compact cards. `compactPattern` controls compact-card colours.
- Printed pages measure **210 × 297 mm**, with **10 mm** internal padding. Header, card and footer heights are coordinated between `mm` in `app.js` and the CSS. Check both when changing the layout.
- After visual changes, check the PDF and mobile layout. Pay particular attention to long text, photos, complete cards and unexpected extra pages.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Changes are missing when reopening the editor | Are you using the same browser, profile, address and port? Has site data been cleared? |
| A photo has disappeared from a card | Is the property among the first three? Photos are hidden, not deleted, when a property moves below the third position. |
| Background colours are missing from the PDF | Enable background graphics in the print settings. |
| The PDF includes a website address or extra margins | Disable browser headers and footers. Check A4 paper, 100% scale and margins set to None. |
| The editor reports a storage error | Check the browser's permission to store site data and available disk space. Save a PDF before closing the page. |
