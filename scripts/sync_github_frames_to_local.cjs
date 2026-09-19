const fs = require('fs');
const path = require('path');

const GH_CATALOG = path.join(__dirname, 'github_frames', 'catalog.json');
const TARGET_FRAMES_DIR = 'd:/code_tool/photo-custom/photobooth-react/public/frames';
const TARGET_MEDIA_DIR = 'd:/code_tool/photo-custom/LumiBooth.App/media/frames';
const TARGET_CATALOG_REACT = 'd:/code_tool/photo-custom/photobooth-react/public/frames/frames_catalog.json';
const TARGET_CATALOG_SRC = 'd:/code_tool/photo-custom/photobooth-react/src/assets/frames_catalog.json';

async function syncGithubFramesLocal() {
  const ghItems = JSON.parse(fs.readFileSync(GH_CATALOG, 'utf8')).filter(f => f.slots && f.slots.length > 0);
  console.log(`Syncing ${ghItems.length} community frames to local app...`);

  let existingCatalog = [];
  if (fs.existsSync(TARGET_CATALOG_REACT)) {
    try {
      const raw = fs.readFileSync(TARGET_CATALOG_REACT, 'utf8').replace(/^\uFEFF/, '');
      existingCatalog = JSON.parse(raw);
    } catch {}
  }

  let nextId = 2000;
  for (const item of existingCatalog) {
    if (item.Id && item.Id >= nextId) nextId = item.Id + 1;
  }

  const newEntries = [];

  for (const item of ghItems) {
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
      CategoryName: item.category === 'amazing' ? 'Frame Amazing ⭐️' : item.category === 'cartoon' ? 'Frame Cartoon' : item.category === 'y2k' ? 'Frame Amazing ⭐️' : 'Frame Basic',
      ConfigJson: JSON.stringify(item.slots),
      OverlayUrl: `/media/frames/${item.fileName}`
    };

    newEntries.push(catalogItem);
  }

  const combined = [...existingCatalog, ...newEntries];
  fs.writeFileSync(TARGET_CATALOG_REACT, JSON.stringify(combined, null, 2), 'utf8');
  fs.writeFileSync(TARGET_CATALOG_SRC, JSON.stringify(combined, null, 2), 'utf8');
  console.log(`Updated local catalog: ${combined.length} frames total`);

  const distFrames = 'd:/code_tool/photo-custom/photobooth-react/dist/frames';
  if (fs.existsSync(distFrames)) {
    for (const item of ghItems) {
      fs.copyFileSync(item.localPath, path.join(distFrames, item.fileName));
    }
  }
}

syncGithubFramesLocal().catch(console.error);
