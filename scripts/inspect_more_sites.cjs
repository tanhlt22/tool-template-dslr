async function checkSnappieFrames() {
  const layouts = ['frame1', 'frame2', 'frame3', 'frame4', 'frame6'];
  for (const l of layouts) {
    for (let i = 1; i <= 10; i++) {
      const candidates = [
        `https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/${l}/frameFree${i}.png`,
        `https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/${l}/framePaid${i}.png`,
        `https://raw.githubusercontent.com/ratuqurratul33/Snappie/main/public/frames/${l}/frame${i}.png`
      ];
      for (const c of candidates) {
        try {
          const res = await fetch(c, { method: 'HEAD' });
          if (res.status === 200) {
            console.log(`[FOUND] ${c} (${res.headers.get('content-length')} bytes)`);
          }
        } catch (e) {}
      }
    }
  }
}
checkSnappieFrames().catch(console.error);
