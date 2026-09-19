async function checkSites() {
  try {
    const res1 = await fetch('https://photobothne.io.vn');
    console.log('photobothne status:', res1.status);
    const html1 = await res1.text();
    console.log('photobothne html length:', html1.length);
    const scripts1 = [...html1.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
    console.log('photobothne scripts:', scripts1);
  } catch (e) {
    console.error('photobothne error:', e.message);
  }

  try {
    const res2 = await fetch('https://smileupphoto.com');
    console.log('smileupphoto status:', res2.status);
    const html2 = await res2.text();
    console.log('smileupphoto html length:', html2.length);
    const scripts2 = [...html2.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
    console.log('smileupphoto scripts:', scripts2);
  } catch (e) {
    console.error('smileupphoto error:', e.message);
  }
}
checkSites().catch(console.error);
