const fs = require('fs');
const { PNG } = require('d:/code_tool/photo-custom/photobooth-react/node_modules/pngjs');

function detectSlots(png) {
  const { width, height, data } = png;
  
  // Find connected components of transparent pixels (alpha < 50)
  // Grid downsampled to 4x4 blocks for speed and noise reduction
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
            if (data[idx + 3] < 50) transCount++;
          }
        }
      }
      if (transCount > (blockSize * blockSize) / 2) {
        isTransparent[gy * gridW + gx] = 1;
      }
    }
  }

  // Flood fill to find distinct regions
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

      // Filter out tiny noise (e.g. less than 50 blocks)
      if (count > 50) {
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

async function test() {
  const url = 'https://photobothne.io.vn/img/khung 4 strips/khung 22.png';
  const res = await fetch(encodeURI(url));
  const arrayBuf = await res.arrayBuffer();
  const png = PNG.sync.read(Buffer.from(arrayBuf));
  const slots = detectSlots(png);
  console.log('Detected slots count:', slots.length);
  console.log('Slots:', slots);
}
test().catch(console.error);
