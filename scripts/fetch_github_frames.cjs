const fs = require('fs');
const path = require('path');
const { PNG } = require('d:/code_tool/photo-custom/photobooth-react/node_modules/pngjs');

const OUTPUT_DIR = path.join(__dirname, 'github_frames');
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

      if (count > 30) {
        const x = minX * blockSize;
        const y = minY * blockSize;
        const w = (maxX - minX + 1) * blockSize;
        const h = (maxY - minY + 1) * blockSize;
        regions.push({ x, y, width: w, height: h, pixelCount: count });
      }
    }
  }

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

async function collectGithubFrames() {
  const sources = [
    // Snappie (8 frames)
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/frameFree1.png', name: 'Snappie Cute Pastel', category: 'cartoon', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/frameFree2.png', name: 'Snappie Vintage Minimal', category: 'basic', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/frameFree3.png', name: 'Snappie Soft Pink', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/frameFree4.png', name: 'Snappie Retro Film', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/frameFree5.png', name: 'Snappie Cloud Dream', category: 'cartoon', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/frameFree6.png', name: 'Snappie Starry Night', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/framePaid1.png', name: 'Snappie Premium Y2K', category: 'y2k', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/frame4/framePaid2.png', name: 'Snappie Premium Sparkle', category: 'y2k', layout: '1x4' },

    // Snapshoot (12 frames)
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/archive/funky/frame-blok-biru.png', name: 'Snapshoot Blok Biru', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/archive/funky/frame-blok-hijau.png', name: 'Snapshoot Blok Hijau', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/archive/funky/frame-checker.png', name: 'Snapshoot Checkerboard', category: 'y2k', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/archive/funky/frame-sirkus.png', name: 'Snapshoot Funky Circus', category: 'cartoon', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/archive/retro/frame-bergerigi.png', name: 'Snapshoot Stamp Edge', category: 'basic', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/archive/retro/frame-studio-sage.png', name: 'Snapshoot Studio Sage', category: 'basic', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/archive/retro/frame-terracotta.png', name: 'Snapshoot Terracotta Warm', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/funky/frame-bintang.png', name: 'Snapshoot Star Glow', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/funky/frame-halftone.png', name: 'Snapshoot Retro Halftone', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/retro/frame-kartu-pos.png', name: 'Snapshoot Postcard Vintage', category: 'basic', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/retro/frame-sprocket.png', name: 'Snapshoot 35mm Sprocket Film', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Fahmi-mi/snapshoot/main/assets/frames/retro/frame-polos.png', name: 'Snapshoot Classic Clean', category: 'basic', layout: '1x4' },

    // JiggleDuo (4 frames)
    { url: 'https://raw.githubusercontent.com/Heramb1221/JiggleDuo-Photobooth/main/public/assets/frames/heart-frame.png', name: 'Jiggle Heart Romantic', category: 'couple', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Heramb1221/JiggleDuo-Photobooth/main/public/assets/frames/heart-frame-2.png', name: 'Jiggle Sweet Heart Pink', category: 'couple', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Heramb1221/JiggleDuo-Photobooth/main/public/assets/frames/heart-frame-3.png', name: 'Jiggle Cherry Blossom Heart', category: 'couple', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/Heramb1221/JiggleDuo-Photobooth/main/public/assets/frames/heart-frame-4.png', name: 'Jiggle Violet Dream Heart', category: 'couple', layout: '1x4' },

    // Photobooth-baddiecom (3 frames)
    { url: 'https://raw.githubusercontent.com/khushnumaparween/photobooth-baddiecom/main/src/main/resources/static/frames/bowframe.png', name: 'Baddie Bow Aesthetic', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/khushnumaparween/photobooth-baddiecom/main/src/main/resources/static/frames/flower.png', name: 'Baddie Floral Bloom', category: 'amazing', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/khushnumaparween/photobooth-baddiecom/main/src/main/resources/static/frames/pink.png', name: 'Baddie Hot Pink Y2K', category: 'y2k', layout: '1x4' },

    // Prismo Photo (2 frames)
    { url: 'https://raw.githubusercontent.com/yunkhngn/prismo-photo/main/public/frames/frame-prism-pink.png', name: 'Prismo Clay Pink', category: 'cartoon', layout: '1x4' },
    { url: 'https://raw.githubusercontent.com/yunkhngn/prismo-photo/main/public/frames/frame-prism-red.png', name: 'Prismo Clay Ruby', category: 'amazing', layout: '1x4' }
  ];

  console.log(`Checking ${sources.length} open-source community frames...`);
  const validCatalog = [];

  for (let i = 0; i < sources.length; i++) {
    const item = sources[i];
    const url = item.url;
    const fileName = `gh_${path.basename(url)}`;
    const localPath = path.join(OUTPUT_DIR, fileName);

    try {
      let buf;
      if (fs.existsSync(localPath)) {
        buf = fs.readFileSync(localPath);
      } else {
        const res = await fetch(url);
        if (res.status !== 200) {
          console.warn(`[Skip] ${item.name}: status ${res.status}`);
          continue;
        }
        const arr = await res.arrayBuffer();
        buf = Buffer.from(arr);
        fs.writeFileSync(localPath, buf);
      }

      const png = PNG.sync.read(buf);
      const slots = detectSlots(png);

      validCatalog.push({
        id: `gh_frame_${i + 1}`,
        name: item.name,
        category: item.category,
        layout: item.layout,
        fileName: fileName,
        localPath: localPath,
        width: png.width,
        height: png.height,
        slots: slots
      });

      console.log(`[${validCatalog.length}/${sources.length}] Verified: ${item.name} (${png.width}x${png.height}, ${slots.length} slots)`);
    } catch (err) {
      console.warn(`Failed for ${item.name}:`, err.message);
    }
  }

  console.log(`\n=== VERIFIED & DOWNLOADED: ${validCatalog.length} NEW FRAMES ===`);
  const catalogPath = path.join(OUTPUT_DIR, 'catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(validCatalog, null, 2), 'utf8');
}

collectGithubFrames().catch(console.error);
