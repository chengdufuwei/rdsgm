const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const defaultImage = '/assets/cover-seo.svg';
const sectionIconMap = {
  about: 'section-location',
  scenery: 'section-landscape',
  pricing: 'section-pricing',
  process: 'section-process',
  service: 'section-service',
  contact: 'section-contact'
};
const quickHighlights = [
  { icon: 'quick-visit', title: '预约看墓', text: '实地考察全程免费。' },
  { icon: 'quick-guide', title: '现场选购', text: '选购墓型全程陪同。' },
  { icon: 'quick-offer', title: '惠民便民', text: '惠民便民，折上有礼。' },
  { icon: 'quick-service', title: '一对一服务', text: '一对一精准服务。' },
  { icon: 'quick-answer', title: '专业答疑', text: '殡葬疑虑专业答疑。' }
];

const site = readJson(path.join(src, 'data', 'site.json'));
const styles = fs.readFileSync(path.join(src, 'assets', 'styles.css'), 'utf8');
const sceneryDir = path.join(src, 'assets', 'scenery');
const lastModified = new Date().toISOString().slice(0, 10);

rimraf(dist);
fs.mkdirSync(dist, { recursive: true });
writeFile(path.join(dist, 'assets', 'styles.css'), styles);
writeFile(path.join(dist, 'assets', 'cover-seo.svg'), renderCoverSvg());
copyStaticDir(sceneryDir, path.join(dist, 'assets', 'scenery'));
writeGeneratedIcons();
writeFile(path.join(dist, 'robots.txt'), renderRobots());
writeFile(path.join(dist, '404.html'), renderNotFound());

const sectionCards = site.sections.filter(section => section.slug !== 'contact');

writePage('/', renderHome());
for (const section of site.sections) writePage(`/${section.slug}/`, renderSection(section));
writeFile(path.join(dist, 'sitemap.xml'), renderSitemap());
if (site.indexNowKey) writeFile(path.join(dist, `${site.indexNowKey}.txt`), `${site.indexNowKey}\n`);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) rimraf(target); else fs.unlinkSync(target);
  }
  fs.rmdirSync(dir);
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function writePage(route, html) {
  const out = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route, 'index.html');
  writeFile(out, html);
}

function copyStaticDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromFile = path.join(from, entry.name);
    const toFile = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyStaticDir(fromFile, toFile);
    } else {
      fs.copyFileSync(fromFile, toFile);
    }
  }
}

function trimSlash(value) {
  return String(value).replace(/\/$/, '');
}

function pageUrl(route) {
  if (route === '/') return `${trimSlash(site.domain)}/`;
  return `${trimSlash(site.domain)}${route}`;
}

function assetUrl(file) {
  return `${trimSlash(site.domain)}/assets/${file}`;
}

function normalizeDate(date) {
  return new Date(`${date}T08:00:00+08:00`).toISOString();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function phoneHref(phone) {
  return `tel:${String(phone).replace(/[^\d+]/g, '')}`;
}

function renderPhoneLink({ phone = site.phone, label = phone, className = '' }) {
  const classAttr = className ? ` class="${className}"` : '';
  return `<a${classAttr} href="${escapeHtml(phoneHref(phone))}">${escapeHtml(label)}</a>`;
}

function linkifyPhoneText(text) {
  return escapeHtml(text).replaceAll(
    escapeHtml(site.phone),
    renderPhoneLink({ label: site.phone })
  );
}

function relative(fromRoute, toRoute) {
  const fromSegments = (fromRoute === '/' ? '/' : `${fromRoute}`).split('/').filter(Boolean);
  const toSegments = toRoute.split('/').filter(Boolean);
  let i = 0;
  while (i < fromSegments.length && i < toSegments.length && fromSegments[i] === toSegments[i]) i++;
  const up = new Array(Math.max(fromSegments.length - i, 0)).fill('..');
  const down = toSegments.slice(i);
  return [...up, ...down].join('/') || '.';
}

function buildKeywords(route, extra = []) {
  const base = [site.siteName, `${site.city}公墓`, '燃灯寺公墓', '公墓预约', '陵园资讯'];
  const dynamic = site.sections.map(section => section.title);
  return Array.from(new Set(base.concat(dynamic, extra).filter(Boolean))).join(',');
}

function baseSchemas(route, title, description, breadcrumbs) {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.siteName,
      url: pageUrl('/'),
      telephone: site.phone,
      address: {
        '@type': 'PostalAddress',
        addressLocality: site.city,
        streetAddress: site.address,
        addressCountry: 'CN'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.siteName,
      url: pageUrl('/'),
      description,
      inLanguage: 'zh-CN'
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: pageUrl(route),
      description,
      inLanguage: 'zh-CN'
    }
  ];

  if (breadcrumbs.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.label,
        item: pageUrl(crumb.href)
      }))
    });
  }

  return schemas;
}

function renderLayout({
  title,
  description,
  route,
  body,
  breadcrumbs = [],
  keywords = '',
  type = 'website',
  extraHead = '',
  schemas = [],
  canonicalUrl = pageUrl(route),
  ogUrl = pageUrl(route),
  robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
}) {
  const nav = site.navigation.map(item => `<a href="${relative(route, item.href)}"${item.href === route ? ' class="active"' : ''}>${item.label}</a>`).join('');
  const crumbHtml = breadcrumbs.length
    ? `<div class="container breadcrumb">${breadcrumbs.map((crumb, idx) => idx === breadcrumbs.length - 1 ? `<span>${crumb.label}</span>` : `<a href="${relative(route, crumb.href)}">${crumb.label}</a>`).join(' / ')}</div>`
    : '';
  const schemaBlocks = schemas.map(schema => `<script type="application/ld+json">${serializeJsonLd(schema)}</script>`).join('\n  ');
  const mobilePhoneBar = `<div class="mobile-callbar"><a class="mobile-callbar-link" href="${escapeHtml(phoneHref(site.phone))}">电话咨询 ${escapeHtml(site.phone)}</a></div>`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="robots" content="${escapeHtml(robots)}">
  <meta name="author" content="${escapeHtml(site.siteName)}">
  <meta name="msvalidate.01" content="EF97D2F4FBAE4900F130603B1041945A">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${escapeHtml(site.siteName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(ogUrl)}">
  <meta property="og:image" content="${pageUrl(defaultImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#8a2e1d">
  <link rel="stylesheet" href="${relative(route, '/assets/styles.css')}">
  ${extraHead}
  ${schemaBlocks}
</head>
<body>
  <header class="site-header">
    <div class="container header-row">
      <a class="brand" href="${relative(route, '/')}" aria-label="${escapeHtml(site.siteName)}">
        <strong>${escapeHtml(site.siteName)}</strong>
        <span>${escapeHtml(site.tagline)}</span>
      </a>
      <nav class="nav">${nav}</nav>
    </div>
  </header>
  ${crumbHtml}
  ${body}
  <footer class="site-footer">
    <div class="container footer-panel">
      <div>
        <strong>${escapeHtml(site.siteName)}</strong><br>
        <span>${escapeHtml(site.address)}</span>
      </div>
      <div>
        预约热线<br>
        <strong style="color:var(--brand-deep);font-size:1.15rem;">${renderPhoneLink({ className: 'phone-link' })}</strong>
      </div>
    </div>
  </footer>
  ${mobilePhoneBar}
</body>
</html>`;
}

function renderHome() {
  const cards = sectionCards.map(section => `
    <a class="card card-link-block" href="${relative('/', `/${section.slug}/`)}">
      <img class="card-icon" src="${relative('/', `/assets/${sectionIconMap[section.slug] || 'section-service'}.svg`)}" alt="${escapeHtml(section.title)}图标" width="72" height="72">
      <h3>${escapeHtml(section.title)}</h3>
      <p>${escapeHtml(section.description)}</p>
    </a>`).join('');
  const quickCards = quickHighlights.map(item => `
    <article class="quick-card">
      <img class="quick-icon" src="${relative('/', `/assets/${item.icon}.svg`)}" alt="${escapeHtml(item.title)}图标" width="56" height="56">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
    </article>`).join('');

  return renderLayout({
    title: site.seo.title,
    description: site.seo.description,
    route: '/',
    keywords: buildKeywords('/', ['购墓流程', '墓型价格']),
    schemas: baseSchemas('/', site.seo.title, site.seo.description, []),
    body: `
      <section class="hero">
        <div class="container hero-grid">
          <div class="hero-copy">
            <div class="eyebrow">成都 · 龙泉驿区</div>
            <h1>燃灯寺公墓预约服务中心</h1>
            <p class="lead">成都燃灯寺公墓预约咨询热线：138-0801-1743。提供免费专车接送看墓服务，地址位于成都市龙泉驿区同安街道同兴村10组。</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="${escapeHtml(phoneHref(site.phone))}">电话咨询 ${escapeHtml(site.phone)}</a>
              <a class="btn btn-secondary" href="${relative('/', '/contact/')}">预约咨询</a>
            </div>
          </div>
          <aside class="hero-panel">
            <h2>公告</h2>
            <ul class="meta-list">
              <li>购墓凭死亡证明购买。实行实名登记。</li>
              <li>预约电话：${escapeHtml(site.phone)}。</li>
            </ul>
          </aside>
        </div>
      </section>
      <section class="section">
        <div class="container section-head">
          <div>
            <h2>服务项目</h2>
            <p>围绕看墓、选墓、安葬咨询整理的主要服务项目。</p>
          </div>
        </div>
        <div class="container quick-grid">${quickCards}</div>
      </section>
      <section class="section">
        <div class="container section-head">
          <div>
            <h2>栏目导航</h2>
            <p>园区环境、墓型价格、服务流程、客户服务和联系方式可直接查看。</p>
          </div>
        </div>
        <div class="container grid-3">${cards}</div>
      </section>`
  });
}

function renderSection(section) {
  const route = `/${section.slug}/`;
  const breadcrumbs = [{ label: '首页', href: '/' }, { label: section.title, href: route }];
  const sceneryHero = section.slug === 'scenery' && section.heroImage
    ? `<figure class="scenery-hero"><img src="${relative(route, section.heroImage)}" alt="${escapeHtml(section.title)}横幅图" loading="eager"></figure>`
    : '';
  const sceneryGallery = section.slug === 'scenery' && Array.isArray(section.gallery)
    ? `<div class="scenery-gallery">${section.gallery.map(item => `<figure class="scenery-card"><img src="${relative(route, item.src)}" alt="${escapeHtml(item.alt || section.title)}" loading="lazy"><figcaption>${escapeHtml(item.alt || section.title)}</figcaption></figure>`).join('')}</div>`
    : '';
  const pricingBlock = section.slug === 'pricing' && Array.isArray(section.priceItems)
    ? `<div class="pricing-shell">
        <div class="pricing-list">
          ${section.priceItems.map(item => `<article class="pricing-item"><div class="pricing-name">${escapeHtml(item.name)}</div><div class="pricing-value">${escapeHtml(item.price)}</div></article>`).join('')}
        </div>
        ${Array.isArray(section.priceNotice) ? `<div class="pricing-note">${section.priceNotice.map(line => `<p>${linkifyPhoneText(line)}</p>`).join('')}</div>` : ''}
      </div>`
    : '';
  return renderLayout({
    title: `${section.title}_${site.siteName}`,
    description: section.description,
    route,
    breadcrumbs,
    keywords: buildKeywords(route, [section.title]),
    schemas: baseSchemas(route, `${section.title}_${site.siteName}`, section.description, breadcrumbs),
    body: `
      <section class="page-hero">
        <div class="container">
          <div class="section-shell">
            <div class="eyebrow">${escapeHtml(site.city)} · ${escapeHtml(section.title)}</div>
            <h1>${escapeHtml(section.title)}</h1>
            <p class="lead">${escapeHtml(section.description)}</p>
          </div>
        </div>
      </section>
      <section class="page-body">
        <div class="container">
          <article class="section-shell section-content">
            ${sceneryHero}
            ${section.content.map(paragraph => `<p>${linkifyPhoneText(paragraph)}</p>`).join('')}
            ${sceneryGallery}
            ${pricingBlock}
            <div class="cta">预约看墓与咨询请直接联系<strong>${renderPhoneLink({ label: site.phone })}</strong></div>
          </article>
        </div>
      </section>`
  });
}

function renderSitemap() {
  const urls = ['/']
    .concat(site.sections.map(section => `/${section.slug}/`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${pageUrl(url)}</loc><lastmod>${normalizeDate(lastModified)}</lastmod></url>`).join('\n')}\n</urlset>`;
}

function renderCoverSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeHtml(site.siteName)}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff5e7"/><stop offset="100%" stop-color="#efe0bf"/></linearGradient></defs>`
    + `<rect width="1200" height="630" fill="url(#g)"/>`
    + `<circle cx="1020" cy="140" r="160" fill="rgba(138,46,29,0.08)"/>`
    + `<circle cx="180" cy="520" r="200" fill="rgba(215,182,118,0.22)"/>`
    + `<text x="88" y="220" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="34" fill="#8a2e1d">燃灯寺公墓</text>`
    + `<text x="88" y="320" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="74" font-weight="700" fill="#1f1b17">${escapeHtml(site.siteName)}</text>`
    + `<text x="88" y="392" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="30" fill="#6f6459">${escapeHtml(site.tagline)}</text>`
    + `<text x="88" y="482" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="32" fill="#642014">咨询电话 ${escapeHtml(site.phone)}</text>`
    + `</svg>`;
}

function writeGeneratedIcons() {
  const icons = {
    'section-location.svg': renderGeneratedIcon({
      shape: 'pin',
      label: '园',
      accent: '#8a2e1d',
      soft: '#f6dfcf'
    }),
    'section-landscape.svg': renderGeneratedIcon({
      shape: 'mountain',
      label: '景',
      accent: '#6c7d43',
      soft: '#e9efd2'
    }),
    'section-pricing.svg': renderGeneratedIcon({
      shape: 'coin',
      label: '价',
      accent: '#a56a18',
      soft: '#f6e7c8'
    }),
    'section-process.svg': renderGeneratedIcon({
      shape: 'path',
      label: '程',
      accent: '#475f8f',
      soft: '#dde7fb'
    }),
    'section-service.svg': renderGeneratedIcon({
      shape: 'shield',
      label: '服',
      accent: '#7a4a74',
      soft: '#f0dff1'
    }),
    'section-faq.svg': renderGeneratedIcon({
      shape: 'bubble',
      label: '问',
      accent: '#2f6f71',
      soft: '#d9efef'
    }),
    'section-contact.svg': renderGeneratedIcon({
      shape: 'phone',
      label: '约',
      accent: '#8a2e1d',
      soft: '#f7e3d5'
    }),
    'quick-visit.svg': renderGeneratedIcon({
      shape: 'compass',
      label: '访',
      accent: '#8a2e1d',
      soft: '#f7e3d5'
    }),
    'quick-guide.svg': renderGeneratedIcon({
      shape: 'guide',
      label: '陪',
      accent: '#5f6e37',
      soft: '#ebf1d8'
    }),
    'quick-offer.svg': renderGeneratedIcon({
      shape: 'ribbon',
      label: '惠',
      accent: '#9a6221',
      soft: '#f7e8cb'
    }),
    'quick-service.svg': renderGeneratedIcon({
      shape: 'star',
      label: '专',
      accent: '#51688b',
      soft: '#e2ebfb'
    }),
    'quick-answer.svg': renderGeneratedIcon({
      shape: 'lamp',
      label: '答',
      accent: '#7d4f2d',
      soft: '#f2e4d4'
    })
  };

  for (const [file, content] of Object.entries(icons)) {
    writeFile(path.join(dist, 'assets', file), content);
  }
}

function renderGeneratedIcon({ shape, label, accent, soft }) {
  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${escapeHtml(label)}图标">`
    + `<rect x="6" y="6" width="84" height="84" rx="28" fill="${soft}"/>`
    + `<circle cx="48" cy="48" r="24" fill="${accent}" opacity="0.12"/>`;
  const mark = renderIconShape(shape, accent);
  return `${base}${mark}</svg>`;
}

function renderIconShape(shape, accent) {
  switch (shape) {
    case 'pin':
      return `<path d="M48 21c-8.1 0-14.5 5.9-14.5 13.8C33.5 46 48 60 48 60s14.5-14 14.5-25.2C62.5 26.9 56.1 21 48 21Zm0 18.4a4.7 4.7 0 1 1 0-9.4 4.7 4.7 0 0 1 0 9.4Z" fill="${accent}" opacity="0.88"/>`;
    case 'mountain':
      return `<path d="M24 58 39 34l10 15 7-10 16 19H24Z" fill="${accent}" opacity="0.84"/><path d="M29 62h38" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`;
    case 'coin':
      return `<circle cx="48" cy="41" r="15" fill="${accent}" opacity="0.88"/><path d="M41 41h14M48 34v14" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M33 59h30" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`;
    case 'path':
      return `<path d="M31 61c14-15 20-15 34-30" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 10"/><circle cx="31" cy="61" r="6" fill="${accent}"/><circle cx="65" cy="31" r="6" fill="${accent}"/>`;
    case 'shield':
      return `<path d="M48 22 66 29v14c0 12-8.5 20-18 24-9.5-4-18-12-18-24V29l18-7Z" fill="${accent}" opacity="0.88"/><path d="m41 44 5 5 10-11" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'bubble':
      return `<path d="M28 30c0-6.6 5.4-12 12-12h16c6.6 0 12 5.4 12 12v11c0 6.6-5.4 12-12 12H45l-11 9v-9h-2c-2.2 0-4-1.8-4-4V30Z" fill="${accent}" opacity="0.88"/>`;
    case 'phone':
      return `<path d="M39 28h18a5 5 0 0 1 5 5v30a5 5 0 0 1-5 5H39a5 5 0 0 1-5-5V33a5 5 0 0 1 5-5Z" fill="${accent}" opacity="0.88"/><circle cx="48" cy="60" r="2.5" fill="#fff"/><path d="M42 35h12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    case 'compass':
      return `<circle cx="48" cy="43" r="16" fill="none" stroke="${accent}" stroke-width="4"/><path d="m55 36-4 12-12 4 4-12 12-4Z" fill="${accent}" opacity="0.9"/>`;
    case 'guide':
      return `<circle cx="48" cy="31" r="8" fill="${accent}" opacity="0.9"/><path d="M36 58c2-8 6-13 12-13s10 5 12 13" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><path d="M28 44h14M54 44h14" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`;
    case 'ribbon':
      return `<path d="M48 24c9 0 16 7 16 16s-7 16-16 16-16-7-16-16 7-16 16-16Z" fill="${accent}" opacity="0.88"/><path d="m40 51-5 17 13-8 13 8-5-17" fill="${accent}" opacity="0.72"/>`;
    case 'star':
      return `<path d="m48 24 6.4 13 14.3 2.1-10.4 10.1 2.5 14.3L48 57l-12.8 6.7 2.5-14.3L27.3 39l14.3-2.1L48 24Z" fill="${accent}" opacity="0.88"/>`;
    case 'lamp':
      return `<path d="M48 24c-8.8 0-16 7-16 15.7 0 5.4 2.8 9.2 6.4 12H58c3.6-2.8 6.4-6.6 6.4-12C64.4 31 56.8 24 48 24Z" fill="${accent}" opacity="0.88"/><path d="M41 57h14M43 63h10" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`;
    default:
      return `<circle cx="48" cy="40" r="16" fill="${accent}" opacity="0.88"/>`;
  }
}

function renderRobots() {
  return `User-agent: *\nAllow: /\nSitemap: ${pageUrl('/sitemap.xml')}\n`;
}

function renderNotFound() {
  const title = `页面不存在_${site.siteName}`;
  const description = '访问的页面不存在，请返回首页或查看站内主要栏目。';
  return renderLayout({
    title,
    description,
    route: '/',
    keywords: buildKeywords('/', ['404']),
    canonicalUrl: pageUrl('/404.html'),
    ogUrl: pageUrl('/404.html'),
    robots: 'noindex,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    schemas: baseSchemas('/404.html', title, description, []),
    body: `
      <section class="page-hero">
        <div class="container">
          <div class="section-shell">
            <div class="eyebrow">404</div>
            <h1>页面不存在</h1>
            <p class="lead">你访问的页面可能已调整。可以先回到首页，或查看站内主要栏目。</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="./index.html">返回首页</a>
              <a class="btn btn-secondary" href="./about/">查看园区介绍</a>
            </div>
          </div>
        </div>
      </section>`
  });
}
