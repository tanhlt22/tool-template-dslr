async function searchHtml() {
  const res = await fetch('https://meobeostudio.com/selfbooth');
  const html = await res.text();

  // Search for frame elements or data-frame or frame selector
  const matches = [...html.matchAll(/data-[\w\-]+=["'][^"']+["']/g)].map(m => m[0]);
  console.log('Sample data attributes:', [...new Set(matches)].slice(0, 30));

  // Search for frame images or frame classes
  const frameItems = [...html.matchAll(/<[^>]+class=["'][^"']*(?:frame|template)[^"']*["'][^>]*>/gi)].map(m => m[0]);
  console.log('Frame items count:', frameItems.length);
  if (frameItems.length > 0) {
    console.log('Sample frame items:', frameItems.slice(0, 10));
  }
}
searchHtml().catch(console.error);
