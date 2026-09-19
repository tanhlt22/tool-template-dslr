async function checkMeobeoLayout() {
  const res = await fetch('https://meobeostudio.com/js/layout.js');
  const js = await res.text();
  console.log('layout.js length:', js.length);

  // Search for frames or images
  const imgs = js.match(/[\w\-\/\.]+\.(?:png|jpg|webp|svg)/g) || [];
  console.log('Images in layout.js:', [...new Set(imgs)]);

  // Search for frame or template objects
  const frameMatches = js.match(/\{[^\{\}]{0,100}(?:frame|template|layout|slots?)[^\{\}]{0,100}\}/gi) || [];
  console.log('Frame matches count:', frameMatches.length);
  if (frameMatches.length > 0) {
    console.log('Sample frame matches:', frameMatches.slice(0, 10));
  }
}
checkMeobeoLayout().catch(console.error);
