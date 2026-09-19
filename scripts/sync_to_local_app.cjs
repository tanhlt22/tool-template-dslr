const fs = require('fs');
const path = require('path');

const PBNE_CATALOG = path.join(__dirname, 'photobothne_frames', 'catalog.json');
const PBNE_DIR = path.join(__dirname, 'photobothne_frames');

const TARGET_FRAMES_DIR = 'd:/code_tool/photo-custom/photobooth-react/public/frames';
const TARGET_MEDIA_DIR = 'd:/code_tool/photo-custom/LumiBooth.App/media/frames';
const TARGET_CATALOG_REACT = 'd:/code_tool/photo-custom/photobooth-react/public/frames/frames_catalog.json';
const TARGET_CATALOG_SRC = 'd:/code_tool/photo-custom/photobooth-react/src/assets/frames_catalog.json';

async function syncLocal() {
  const pbneItems = JSON.parse(fs.readFileSync(PBNE_CATALOG, 'utf8'));
  console.log(`Syncing ${pbneItems.length} photobothne items to local...`);

  // Ensure directories
  if (!fs.existsSync(TARGET_FRAMES_DIR)) fs.mkdirSync(TARGET_FRAMES_DIR, { recursive: true });
  if (!fs.existsSync(TARGET_MEDIA_DIR)) fs.mkdirSync(TARGET_MEDIA_DIR, { recursive: true });

  // Read existing catalog
  let existingCatalog = [];
  if (fs.existsSync(TARGET_CATALOG_REACT)) {
    try {
      const raw = fs.readFileSync(TARGET_CATALOG_REACT, 'utf8').replace(/^\uFEFF/, '');
      existingCatalog = JSON.parse(raw);
    } catch {}
  }

  let nextId = 1000;
  for (const item of existingCatalog) {
    if (item.Id && item.Id >= nextId) nextId = item.Id + 1;
  }

  const newCatalogEntries = [];

  for (const item of pbneItems) {
    const srcFile = item.localPath;
    const destFile1 = path.join(TARGET_FRAMES_DIR, item.fileName);
    const destFile2 = path.join(TARGET_MEDIA_DIR, item.fileName);

    fs.copyFileSync(srcFile, destFile1);
    fs.copyFileSync(srcFile, destFile2);

    const catalogItem = {
      Id: nextId++,
      Name: item.name,
      FileName: item.fileName,
      Layout: item.layout,
      SlotCount: item.slots.length,
      Width: item.width,
      Height: item.height,
      CategoryName: item.category === 'amazing' ? 'Frame Amazing ⭐️' : item.category === 'basic' ? 'Frame Basic' : 'Frame Sự Kiện',
      ConfigJson: JSON.stringify(item.slots),
      OverlayUrl: `/media/frames/${item.fileName}`
    };

    newCatalogEntries.push(catalogItem);
  }

  const combinedCatalog = [...existingCatalog, ...newCatalogEntries];
  fs.writeFileSync(TARGET_CATALOG_REACT, JSON.stringify(combinedCatalog, null, 2), 'utf8');
  fs.writeFileSync(TARGET_CATALOG_SRC, JSON.stringify(combinedCatalog, null, 2), 'utf8');
  console.log(`Updated local catalog: ${combinedCatalog.length} frames total`);

  // Also update dist/frames if dist exists
  const distFrames = 'd:/code_tool/photo-custom/photobooth-react/dist/frames';
  if (fs.existsSync(distFrames)) {
    for (const item of pbneItems) {
      fs.copyFileSync(item.localPath, path.join(distFrames, item.fileName));
    }
  }
}

syncLocal().catch(console.error);
