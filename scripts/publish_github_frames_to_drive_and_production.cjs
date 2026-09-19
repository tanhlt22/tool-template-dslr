const fs = require('fs');
const path = require('path');

const CATALOG_FILE = path.join(__dirname, 'github_frames', 'catalog.json');
const PROGRESS_FILE = path.join(__dirname, 'gh_upload_progress.json');

const DRIVE_CONFIG = {
  clientId: '251105969406-ffhuetcuk4poknhsijf663g6vtdof0h9.apps.googleusercontent.com',
  clientSecret: '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',
  refreshToken: '1//04HODypjPbZTeCgYIARAAGAQSNwF-L9IrWwvPfQV9pPlRFW42pw_nEa2Wet73v2SdbJ4XxaHIEangCW9yhDwbBSovdVy0pufPlIg',
  rootFolderId: '1lTpzdKmPOWyBixawbFFtFFXR8IGoSRMC'
};

const WORKER_ENDPOINT = 'https://frame-storage-proxy.toashop2002.workers.dev';
const CONCURRENCY = 4;

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    client_id: DRIVE_CONFIG.clientId,
    client_secret: DRIVE_CONFIG.clientSecret,
    refresh_token: DRIVE_CONFIG.refreshToken,
    grant_type: 'refresh_token'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth error: ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

async function uploadImageToDriveWithRetry(filePath, fileName, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = await getAccessToken();
      const fileBuf = fs.readFileSync(filePath);
      const boundary = 'cf_boundary_' + Math.random().toString(36).substring(2);
      const metadata = {
        name: 'gh_' + fileName,
        parents: [DRIVE_CONFIG.rootFolderId]
      };

      const headPart = Buffer.from(
        '\r\n--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        '\r\n--' + boundary + '\r\nContent-Type: image/png\r\n\r\n'
      );
      const footPart = Buffer.from('\r\n--' + boundary + '--');
      const multipartBody = Buffer.concat([headPart, fileBuf, footPart]);

      const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'multipart/related; boundary=' + boundary
          },
          body: multipartBody
        }
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Drive upload status ${uploadRes.status}: ${errText}`);
      }

      const fileData = await uploadRes.json();

      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: 'reader', type: 'anyone' })
        });
      } catch (permErr) {
        console.warn(`[Warn] Permission set failed for ${fileData.id}:`, permErr.message);
      }

      return fileData.id;
    } catch (err) {
      console.warn(`[Attempt ${attempt}/${retries}] Upload error for ${fileName}:`, err.message);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function registerFrameWithRetry(payload, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${WORKER_ENDPOINT}/frames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Worker status ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`[Attempt ${attempt}/${retries}] Register frame error for ${payload.id}:`, err.message);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main() {
  console.log('--- STARTING UPLOAD OF 28 NEW COMMUNITY FRAMES TO DRIVE & PRODUCTION D1 ---');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8')).filter(f => f.slots && f.slots.length > 0);
  console.log(`Total items to upload: ${catalog.length}`);

  const progress = loadProgress();
  const queue = [...catalog];
  let completedCount = Object.keys(progress).filter((k) => progress[k]?.status === 'DONE').length;
  console.log(`Already completed: ${completedCount}/${catalog.length}`);

  async function worker(workerId) {
    while (queue.length > 0) {
      const item = queue.shift();
      const frameKey = item.id;

      if (progress[frameKey]?.status === 'DONE') {
        continue;
      }

      const imgFilePath = item.localPath;
      if (!fs.existsSync(imgFilePath)) {
        console.error(`[Worker ${workerId}] File not found: ${imgFilePath}`);
        continue;
      }

      try {
        let driveImageId = progress[frameKey]?.driveImageId;
        if (!driveImageId) {
          driveImageId = await uploadImageToDriveWithRetry(imgFilePath, item.fileName);
          progress[frameKey] = {
            ...progress[frameKey],
            driveImageId,
            status: 'IMAGE_UPLOADED'
          };
          saveProgress(progress);
        }

        const imgUrl = `${WORKER_ENDPOINT}/assets/${driveImageId}`;
        const payload = {
          id: frameKey,
          name: item.name,
          category: item.category,
          layout: item.layout,
          width: item.width,
          height: item.height,
          backgroundImageUrl: imgUrl,
          thumbnail_url: imgUrl,
          slots: item.slots,
          elements: []
        };

        const frameResult = await registerFrameWithRetry(payload);

        progress[frameKey] = {
          status: 'DONE',
          driveImageId,
          driveConfigFileId: frameResult.drive_file_id,
          name: item.name,
          category: item.category,
          layout: item.layout,
          timestamp: new Date().toISOString()
        };
        saveProgress(progress);

        completedCount++;
        console.log(
          `[${completedCount}/${catalog.length}] Worker ${workerId} -> "${item.name}" [${item.category}] | Img: ${driveImageId} | Config: ${frameResult.drive_file_id}`
        );
      } catch (err) {
        console.error(`[Worker ${workerId}] FAILED for "${item.name}" (${item.id}):`, err.message);
      }
    }
  }

  const workers = [];
  for (let i = 1; i <= CONCURRENCY; i++) {
    workers.push(worker(i));
  }

  await Promise.all(workers);

  console.log('--- COMPLETED COMMUNITY FRAMES UPLOAD ---');
  const finalCompleted = Object.keys(progress).filter((k) => progress[k]?.status === 'DONE').length;
  console.log(`Total successfully processed: ${finalCompleted}/${catalog.length}`);
}

main().catch(console.error);
