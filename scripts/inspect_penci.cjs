async function inspectPenciPhotobooth() {
  const res = await fetch('https://penci.vn/trang/in-anh-photobooth');
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('Length:', html.length);
  const links = [...html.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('Design / Template Links:', links.filter(l => l.includes('thiet-ke') || l.includes('mau') || l.includes('edit')));
}
inspectPenciPhotobooth().catch(console.error);
