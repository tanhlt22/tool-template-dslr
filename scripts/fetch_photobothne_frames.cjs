const fs = require('fs');
const path = require('path');
const { PNG } = require('d:/code_tool/photo-custom/photobooth-react/node_modules/pngjs');

const OUTPUT_DIR = path.join(__dirname, 'photobothne_frames');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function detectSlots(png) {
  const { width, height, data } = png;
  const blockSize = 4;
  const gridW = Math.floor(width / blockSize);
  const gridH = Math.floor(height / blockSize);
  const isTransparent = new Uint8Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let transCount = 0;
      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const px = gx * blockSize + dx;
          const py = gy * blockSize + dy;
          if (px < width && py < height) {
            const idx = (width * py + px) << 2;
            if (data[idx + 3] < 60) transCount++;
          }
        }
      }
      if (transCount > (blockSize * blockSize) / 2) {
        isTransparent[gy * gridW + gx] = 1;
      }
    }
  }

  const visited = new Uint8Array(gridW * gridH);
  const regions = [];

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gy * gridW + gx;
      if (!isTransparent[idx] || visited[idx]) continue;

      let minX = gx, maxX = gx, minY = gy, maxY = gy;
      let count = 0;
      const stack = [[gx, gy]];
      visited[idx] = 1;

      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
            const nIdx = ny * gridW + nx;
            if (isTransparent[nIdx] && !visited[nIdx]) {
              visited[nIdx] = 1;
              stack.push([nx, ny]);
            }
          }
        }
      }

      // Filter out tiny noise (less than 40 blocks)
      if (count > 40) {
        const x = minX * blockSize;
        const y = minY * blockSize;
        const w = (maxX - minX + 1) * blockSize;
        const h = (maxY - minY + 1) * blockSize;
        regions.push({ x, y, width: w, height: h, pixelCount: count });
      }
    }
  }

  // Sort regions: top-to-bottom, left-to-right
  regions.sort((a, b) => (Math.abs(a.y - b.y) > 20 ? a.y - b.y : a.x - b.x));

  return regions.map((r, i) => ({
    order: i + 1,
    id: `slot_${i + 1}`,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    rotation: 0,
    path: `M ${r.x} ${r.y} L ${r.x + r.width} ${r.y} L ${r.x + r.width} ${r.y + r.height} L ${r.x} ${r.y + r.height} Z`
  }));
}

async function collectAllFrames() {
  const frameList = [];

  // 1. Khung 1 ảnh (14 frames)
  for (let i = 1; i <= 14; i++) {
    const fileName = i === 4 || i === 5 || i === 12 || i === 13 || i === 14 ? `khung ${i}.png` : `khung${i}.png`;
    frameList.push({
      subPath: `img/khung 1 ảnh/${fileName}`,
      name: `Khung 1 ảnh #${i}`,
      category: 'basic',
      layout: 'polaroid'
    });
  }

  // 2. Khung 2 ảnh (8 frames)
  for (let i = 1; i <= 8; i++) {
    const fileName = i === 4 || i === 5 || i === 6 || i === 7 || i === 8 ? `khung ${i}.png` : `khung${i}.png`;
    frameList.push({
      subPath: `img/khung 2 ảnh/${fileName}`,
      name: `Khung 2 ảnh #${i}`,
      category: 'basic',
      layout: '2x1'
    });
  }

  // 3. Khung 6 ảnh (8 frames)
  for (let i = 1; i <= 8; i++) {
    const fileName = i === 4 || i === 5 || i === 8 ? `khung ${i}.png` : `khung${i}.png`;
    frameList.push({
      subPath: `img/khung 6 ảnh/${fileName}`,
      name: `Khung 6 ảnh #${i}`,
      category: 'basic',
      layout: '2x3'
    });
  }

  // 4. Khung 4 strips (khung 19..21 + 22..71)
  for (let i = 19; i <= 71; i++) {
    frameList.push({
      subPath: `img/khung 4 strips/khung ${i}.png`,
      name: `Khung 4 Strips #${i}`,
      category: 'amazing',
      layout: '1x4'
    });
  }

  // Khung 1..5 variants
  const base4Files = [
    'khung1.png', 'khung1 copy.png', 'khung1 copy 2.png',
    'khung2.png', 'khung2 copy.png', 'khung2 copy 2.png',
    'khung3.png', 'khung3 copy.png', 'khung3 copy 2.png',
    'khung 4.png', 'khung 4 copy.png', 'khung 4 copy 2.png',
    'khung 5.png', 'khung 5 copy.png', 'khung 5 copy 2.png'
  ];
  for (let idx = 0; idx < base4Files.length; idx++) {
    frameList.push({
      subPath: `img/khung 4 strips/${base4Files[idx]}`,
      name: `Khung 4 Strips V#${idx + 1}`,
      category: 'amazing',
      layout: '1x4'
    });
  }

  console.log(`Total candidate frames to verify & download: ${frameList.length}`);

  const validCatalog = [];
  let downloadedCount = 0;

  for (let i = 0; i < frameList.length; i++) {
    const item = frameList[i];
    const url = `https://photobothne.io.vn/${item.subPath}`;
    const cleanFileName = item.subPath.replace(/[\/\\ ]+/g, '_');
    const localPath = path.join(OUTPUT_DIR, cleanFileName);

    try {
      let buf;
      if (fs.existsSync(localPath)) {
        buf = fs.readFileSync(localPath);
      } else {
        const res = await fetch(encodeURI(url));
        if (res.status !== 200) {
          continue;
        }
        const arr = await res.arrayBuffer();
        buf = Buffer.from(arr);
        fs.writeFileSync(localPath, buf);
      }

      const png = PNG.sync.read(buf);
      const slots = detectSlots(png);

      validCatalog.push({
        id: `pbne_${i + 1}`,
        name: item.name,
        category: item.category,
        layout: item.layout,
        fileName: cleanFileName,
        localPath: localPath,
        width: png.width,
        height: png.height,
        slots: slots
      });

      downloadedCount++;
      if (downloadedCount % 10 === 0 || downloadedCount === frameList.length) {
        console.log(`[${downloadedCount}] Verified & processed: ${item.name} (${png.width}x${png.height}, ${slots.length} slots)`);
      }
    } catch (err) {
      console.warn(`Failed for ${item.name}:`, err.message);
    }
  }

  console.log(`\n=== SCAN COMPLETED: ${validCatalog.length} VALID FRAMES FOUND ===`);
  const catalogPath = path.join(OUTPUT_DIR, 'catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(validCatalog, null, 2), 'utf8');
  console.log(`Saved catalog to ${catalogPath}`);
}

collectAllFrames().catch(console.error);
