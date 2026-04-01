import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const landingContentPath = path.join(projectRoot, "content", "service-landings.json");
const baseBlogPath = path.join(projectRoot, "content", "blog-posts.json");
const extraBlogPath = path.join(projectRoot, "content", "blog-cluster-expansion.json");
const baseUrl = "https://pinpointaccountingservice.com";
const siteName = "Pinpoint Accounting & Service, Ltd.";
const ogImage = `${baseUrl}/assets/images/services-office.jpg`;

function htmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function loadBlogPosts() {
  return [baseBlogPath, extraBlogPath]
    .filter((filePath) => fs.existsSync(filePath))
    .flatMap((filePath) => loadJson(filePath));
}

function renderHeader(subtitleTh, subtitleEn) {
  return `<header class="topbar">
      <a class="brand" href="/">
        <img class="brand-logo" src="/assets/logo-original-large.jpg" alt="Pinpoint logo" />
        <div class="brand-copy">
          <strong>Pinpoint Accounting &amp; Service, Ltd.</strong>
          <span data-th="${htmlEscape(subtitleTh)}" data-en="${htmlEscape(subtitleEn)}">${htmlEscape(subtitleTh)}</span>
        </div>
      </a>
      <nav class="nav" aria-label="Main navigation">
        <a href="/services" data-th="บริการ" data-en="Services">บริการ</a>
        <a href="/about" data-th="เกี่ยวกับเรา" data-en="About">เกี่ยวกับเรา</a>
        <a href="/resources" data-th="แหล่งอ้างอิง" data-en="Resources">แหล่งอ้างอิง</a>
        <a href="/faq" data-th="คำถามที่พบบ่อย" data-en="FAQ">คำถามที่พบบ่อย</a>
        <a href="/blog" data-th="บทความ" data-en="Blog">บทความ</a>
      </nav>
      <div class="nav-actions">
        <a class="btn btn-secondary" href="/#lead-form" data-th="ขอรับคำปรึกษา" data-en="Request consultation">ขอรับคำปรึกษา</a>
        <button class="lang-toggle" type="button" data-lang-toggle aria-label="Switch language">EN</button>
      </div>
    </header>`;
}

function renderFooter() {
  return `<footer class="footer">
      <div class="footer-grid">
        <section>
          <h3>Pinpoint Accounting &amp; Service, Ltd.</h3>
          <p
            data-th="ทีมงานบัญชี ภาษี และเอกสารธุรกิจที่เน้นความถูกต้อง ตรงเวลา และการดูแลอย่างมืออาชีพ เพื่อให้ธุรกิจของคุณเดินหน้าได้อย่างมั่นใจ"
            data-en="Trusted accounting, tax, and business-compliance support focused on accuracy, timeliness, and professional follow-through."
          >
            ทีมงานบัญชี ภาษี และเอกสารธุรกิจที่เน้นความถูกต้อง ตรงเวลา และการดูแลอย่างมืออาชีพ เพื่อให้ธุรกิจของคุณเดินหน้าได้อย่างมั่นใจ
          </p>
        </section>
        <section class="footer-links">
          <h3 data-th="บริการและข้อมูล" data-en="Services &amp; Info">บริการและข้อมูล</h3>
          <a href="/bangkok-accounting" data-th="สำนักงานบัญชีกรุงเทพ" data-en="Bangkok Accounting">สำนักงานบัญชีกรุงเทพ</a>
          <a href="/services">Services</a>
          <a href="/about">About</a>
          <a href="/resources">Resources</a>
          <a href="/faq">FAQ</a>
          <a href="/blog">Blog</a>
          <a href="/privacy">Privacy</a>
        </section>
        <section class="footer-meta">
          <h3 data-th="ติดต่อ" data-en="Contact">ติดต่อ</h3>
          <p>Mobile: 092-749-7442</p>
          <p>Website: pinpointaccountingservice.com</p>
          <p
            class="footer-address"
            data-th="ที่ตั้งบริษัท: 294 ซอยอยู่เจริญ29 ถนนรัชดาภิเษก18 แขวงสามเสนนอก เขตห้วยขวาง กรุงเทพฯ 10310"
            data-en="Office: 294 Soi Yoo Charoen 29, Ratchadaphisek 18 Rd., Sam Sen Nok, Huai Khwang, Bangkok 10310"
          >
            ที่ตั้งบริษัท: 294 ซอยอยู่เจริญ29 ถนนรัชดาภิเษก18 แขวงสามเสนนอก เขตห้วยขวาง กรุงเทพฯ 10310
          </p>
          <a
            class="map-pin-link"
            href="https://maps.app.goo.gl/ZgQJbSdcryvowz1K6"
            target="_blank"
            rel="noreferrer"
            data-th="Open Google Maps"
            data-en="Open Google Maps"
            >Open Google Maps</a
          >
          <p data-th="รองรับภาษาไทยและอังกฤษ" data-en="Thai and English support available">รองรับภาษาไทยและอังกฤษ</p>
        </section>
      </div>
      <p class="copyright">© <span data-current-year>2026</span> Pinpoint Accounting &amp; Service, Ltd.</p>
    </footer>`;
}

function renderList(items) {
  return `<ul class="checklist">\n${items.map((item) => `  <li>${htmlEscape(item)}</li>`).join("\n")}\n</ul>`;
}

function renderProcess(process) {
  return `<div class="service-grid">\n${process
    .map(
      (step) => `<article class="service-card">\n  <h3 data-th="${htmlEscape(step.title_th)}" data-en="${htmlEscape(step.title_en)}">${htmlEscape(step.title_th)}</h3>\n  <p data-th="${htmlEscape(step.body_th)}" data-en="${htmlEscape(step.body_en)}">${htmlEscape(step.body_th)}</p>\n</article>`
    )
    .join("\n")}\n</div>`;
}

function renderIdealFor(page) {
  return `<div class="article-grid">\n${page.ideal_for_th
    .map(
      (item, index) => `<article class="article-card">\n  <h3 data-th="${htmlEscape(item)}" data-en="${htmlEscape(page.ideal_for_en[index] || "")}">${htmlEscape(item)}</h3>\n  <p data-th="${htmlEscape(item)}" data-en="${htmlEscape(page.ideal_for_en[index] || "")}">${htmlEscape(item)}</p>\n</article>`
    )
    .join("\n")}\n</div>`;
}

function renderRelatedArticles(page, postsBySlug) {
  const cards = page.related_posts
    .map((slug) => postsBySlug.get(slug))
    .filter(Boolean)
    .map(
      (post) => `<article class="article-card">\n  <div class="service-meta">\n    <span class="chip" data-th="${htmlEscape(post.category_th)}" data-en="${htmlEscape(post.category_en)}">${htmlEscape(post.category_th)}</span>\n    <span class="chip gold" data-th="${htmlEscape(post.read_time_th)}" data-en="${htmlEscape(post.read_time_en)}">${htmlEscape(post.read_time_th)}</span>\n  </div>\n  <h3 data-th="${htmlEscape(post.title_th)}" data-en="${htmlEscape(post.title_en)}">${htmlEscape(post.title_th)}</h3>\n  <p data-th="${htmlEscape(post.description_th)}" data-en="${htmlEscape(post.description_en)}">${htmlEscape(post.description_th)}</p>\n  <a class="resource-link" href="/blog/${htmlEscape(post.slug)}" data-th="อ่านบทความ" data-en="Read article">อ่านบทความ</a>\n</article>`
    )
    .join("\n");

  return `<div class="article-grid">\n${cards}\n</div>`;
}

function renderPage(page, postsBySlug) {
  const canonicalUrl = `${baseUrl}/${page.slug}`;
  return `<!doctype html>
<html lang="th" data-title-th="${htmlEscape(page.meta_title_th)}" data-title-en="${htmlEscape(page.meta_title_en)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${htmlEscape(page.meta_title_th)}</title>
    <meta name="description" content="${htmlEscape(page.meta_description_th)}" data-th="${htmlEscape(page.meta_description_th)}" data-en="${htmlEscape(page.meta_description_en)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="${htmlEscape(page.meta_title_en)}" />
    <meta property="og:description" content="${htmlEscape(page.meta_description_en)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${htmlEscape(page.meta_title_en)}" />
    <meta name="twitter:description" content="${htmlEscape(page.meta_description_en)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="th" href="${canonicalUrl}?lang=th" />
    <link rel="alternate" hreflang="en" href="${canonicalUrl}?lang=en" />
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />
    <link rel="alternate" type="application/rss+xml" title="Pinpoint Blog Feed" href="${baseUrl}/feed.xml" />
    <link rel="icon" type="image/jpeg" href="/assets/logo-original-large.jpg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    <script>
      window.PINPOINT_CONFIG = {
        lineOaUrl: "https://lin.ee/58aU8oE",
        ga4MeasurementId: "",
        googleAdsId: "",
        googleAdsLeadLabel: "",
        metaPixelId: ""
      };
    </script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": ["Service", "ProfessionalService"],
        "name": ${JSON.stringify(page.meta_title_en)},
        "provider": {
          "@type": "ProfessionalService",
          "name": ${JSON.stringify(siteName)},
          "url": ${JSON.stringify(baseUrl)},
          "telephone": "+66-92-749-7442"
        },
        "serviceType": ${JSON.stringify(page.meta_title_en)},
        "areaServed": "Bangkok and greater Bangkok",
        "url": ${JSON.stringify(canonicalUrl)}
      }
    </script>
  </head>
  <body data-title-th="${htmlEscape(page.meta_title_th)}" data-title-en="${htmlEscape(page.meta_title_en)}">
    ${renderHeader(page.subtitle_th, page.subtitle_en)}
    <main class="page-wrap">
      <section class="section page-hero page-intro">
        <p class="eyebrow" data-th="${htmlEscape(page.eyebrow_th)}" data-en="${htmlEscape(page.eyebrow_en)}">${htmlEscape(page.eyebrow_th)}</p>
        <h1 data-th="${htmlEscape(page.hero_title_th)}" data-en="${htmlEscape(page.hero_title_en)}">${htmlEscape(page.hero_title_th)}</h1>
        <p data-th="${htmlEscape(page.hero_description_th)}" data-en="${htmlEscape(page.hero_description_en)}">${htmlEscape(page.hero_description_th)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/#lead-form" data-th="ส่งรายละเอียดให้ทีม" data-en="Send your case details">ส่งรายละเอียดให้ทีม</a>
          <a class="btn btn-secondary line-chat" href="#" target="_blank" rel="noreferrer" data-th="คุยผ่าน LINE OA" data-en="Chat via LINE OA">คุยผ่าน LINE OA</a>
          <a class="btn btn-deep" href="tel:0927497442" data-th="โทรคุยกับทีม" data-en="Call the team">โทรคุยกับทีม</a>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <p class="kicker" data-th="KEY REASONS" data-en="KEY REASONS">KEY REASONS</p>
          <h2 data-th="${htmlEscape(page.deliverables_title_th)}" data-en="${htmlEscape(page.deliverables_title_en)}">${htmlEscape(page.deliverables_title_th)}</h2>
        </div>
        <div class="service-grid">
          <article class="service-card">
            <h3 data-th="จุดที่ลูกค้ามักต้องการ" data-en="Common client needs">จุดที่ลูกค้ามักต้องการ</h3>
            ${renderList(page.highlights_th)}
          </article>
          <article class="service-card">
            <h3 data-th="${htmlEscape(page.deliverables_title_th)}" data-en="${htmlEscape(page.deliverables_title_en)}">${htmlEscape(page.deliverables_title_th)}</h3>
            ${renderList(page.deliverables_th)}
          </article>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <p class="kicker" data-th="WORKFLOW" data-en="WORKFLOW">WORKFLOW</p>
          <h2 data-th="${htmlEscape(page.process_title_th)}" data-en="${htmlEscape(page.process_title_en)}">${htmlEscape(page.process_title_th)}</h2>
        </div>
        ${renderProcess(page.process)}
      </section>

      <section class="section">
        <div class="section-header">
          <p class="kicker" data-th="BEST FIT" data-en="BEST FIT">BEST FIT</p>
          <h2 data-th="${htmlEscape(page.ideal_title_th)}" data-en="${htmlEscape(page.ideal_title_en)}">${htmlEscape(page.ideal_title_th)}</h2>
        </div>
        ${renderIdealFor(page)}
      </section>

      <section class="section">
        <div class="section-header">
          <p class="kicker" data-th="RELATED ARTICLES" data-en="RELATED ARTICLES">RELATED ARTICLES</p>
          <h2 data-th="บทความที่ช่วยให้ลูกค้าเตรียมข้อมูลก่อนเริ่มงาน" data-en="Articles that help clients prepare before starting">บทความที่ช่วยให้ลูกค้าเตรียมข้อมูลก่อนเริ่มงาน</h2>
        </div>
        ${renderRelatedArticles(page, postsBySlug)}
      </section>

      <section class="section cta-band">
        <p class="kicker" data-th="NEXT STEP" data-en="NEXT STEP">NEXT STEP</p>
        <h2 data-th="${htmlEscape(page.cta_title_th)}" data-en="${htmlEscape(page.cta_title_en)}">${htmlEscape(page.cta_title_th)}</h2>
        <div class="hero-actions" style="justify-content:center;">
          <a class="btn btn-primary" href="/#lead-form" data-th="เปิดฟอร์มปรึกษา" data-en="Open consultation form">เปิดฟอร์มปรึกษา</a>
          <a class="btn btn-secondary line-chat" href="#" target="_blank" rel="noreferrer" data-th="ทัก LINE OA" data-en="Open LINE OA">ทัก LINE OA</a>
          <a class="btn btn-deep" href="/services" data-th="ดูบริการทั้งหมด" data-en="See all services">ดูบริการทั้งหมด</a>
        </div>
      </section>
    </main>
    ${renderFooter()}
    <script src="/tracking.js"></script>
    <script src="/app.js"></script>
  </body>
</html>`;
}

const landingPages = loadJson(landingContentPath);
const postsBySlug = new Map(loadBlogPosts().map((post) => [post.slug, post]));

for (const page of landingPages) {
  const dir = path.join(projectRoot, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderPage(page, postsBySlug), "utf8");
}

console.log(`Generated ${landingPages.length} service landing pages.`);
