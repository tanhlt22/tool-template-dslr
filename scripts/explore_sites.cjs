async function inspectServices() {
  const res = await fetch('https://kentphotobooth.io.vn/static/js/main.4253d422.js');
  const js = await res.text();

  // Search for firebase, supabase, backend urls
  const urls = js.match(/https?:\/\/[a-zA-Z0-9\-\.]+(?:\/[^\s"']*)?/g) || [];
  const uniqueUrls = [...new Set(urls)].filter(u => !u.includes('w3.org') && !u.includes('reactjs.org'));
  console.log('Backend / External URLs:', uniqueUrls);
}
inspectServices().catch(console.error);
