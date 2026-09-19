async function checkMoreFolders() {
  const folders = [
    'img/khung 3 ảnh',
    'img/khung 4 ảnh',
    'img/khung 5 ảnh',
    'img/khung idol',
    'img/khung tet',
    'img/khung cuoi',
    'img/frames',
    'img/templates'
  ];

  for (const f of folders) {
    const url = `https://photobothne.io.vn/${f}/khung1.png`;
    try {
      const res = await fetch(encodeURI(url), { method: 'HEAD' });
      console.log(res.status, f);
    } catch (e) {}
  }
}
checkMoreFolders().catch(console.error);
