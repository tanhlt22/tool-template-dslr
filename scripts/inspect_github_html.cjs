async function inspectThemes() {
  const url = 'https://github.com/kim-kwanho/event-photobooth/tree/main/public/themes';
  const res = await fetch(url);
  const html = await res.text();
  const links = [...html.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('Themes links:', links.filter(l => l.includes('public/themes/')));

  const urlConfig = 'https://github.com/kim-kwanho/event-photobooth/tree/main/public/config';
  const resC = await fetch(urlConfig);
  const htmlC = await resC.text();
  const linksC = [...htmlC.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('Config links:', linksC.filter(l => l.includes('public/config/')));
}
inspectThemes().catch(console.error);
