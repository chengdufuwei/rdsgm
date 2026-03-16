const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const site = readJson(path.join(src, 'data', 'site.json'));

async function main() {
  const key = site.indexNowKey;
  if (!key) {
    throw new Error('site.json 缺少 indexNowKey，无法提交 IndexNow。');
  }

  const siteUrl = new URL(site.domain);
  const routes = process.argv.slice(2);
  const urlList = (routes.length ? routes : defaultRoutes())
    .map(route => toAbsoluteUrl(route, siteUrl))
    .filter((value, index, array) => array.indexOf(value) === index);

  if (!urlList.length) {
    throw new Error('没有可提交的 URL。');
  }

  const payload = {
    host: siteUrl.hostname,
    key,
    keyLocation: `${trimSlash(site.domain)}/${key}.txt`,
    urlList
  };

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`IndexNow 提交失败: HTTP ${response.status} ${response.statusText}\n${body}`);
  }

  console.log(`IndexNow 已提交 ${urlList.length} 个 URL。`);
  for (const url of urlList) console.log(url);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function trimSlash(value) {
  return String(value).replace(/\/$/, '');
}

function defaultRoutes() {
  return ['/', ...site.sections.map(section => `/${section.slug}/`)];
}

function toAbsoluteUrl(route, siteUrl) {
  if (/^https?:\/\//i.test(route)) return route;
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return new URL(normalized, `${trimSlash(site.domain)}/`).toString();
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
