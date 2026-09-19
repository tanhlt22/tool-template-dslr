async function inspectSmileUp() {
  try {
    const res = await fetch('https://smileupphoto.com/assets/index-DdlCDygq.js');
    const js = await res.text();
    console.log('SmileUp JS length:', js.length);

    // Search for frame objects or png urls
    const pngMatches = js.match(/[\w\-\/\.]+\.(?:png|jpg|webp|svg)/g) || [];
    const uniquePngs = [...new Set(pngMatches)].filter(p => p.includes('frame') || p.includes('template') || p.includes('layout'));
    console.log('Frame-related assets in SmileUp:', uniquePngs);

    // Search for frame arrays or objects
    const frameData = js.match(/\{[^\{\}]{0,100}(?:frame|template|slot)[^\{\}]{0,100}\}/gi) || [];
    console.log('Frame data matches:', frameData.length);
    if (frameData.length > 0) {
      console.log('Sample frame data:', frameData.slice(0, 5));
    }
  } catch (e) {
    console.error('Error in SmileUp:', e.message);
  }
}
inspectSmileUp().catch(console.error);
