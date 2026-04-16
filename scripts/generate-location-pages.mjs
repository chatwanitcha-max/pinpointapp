import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const baseUrl = "https://pinpointaccountingservice.com";
const todayIso = new Date().toISOString().slice(0, 10);

const LOCATIONS = [
  { slug: "accounting-huai-khwang", areaTh: "ห้วยขวาง", areaEn: "Huai Khwang" },
  { slug: "accounting-ratchada", areaTh: "รัชดา", areaEn: "Ratchada" },
  { slug: "accounting-rama9", areaTh: "พระราม 9", areaEn: "Rama 9" },
  { slug: "accounting-asoke", areaTh: "อโศก", areaEn: "Asoke" },
  { slug: "accounting-sukhumvit", areaTh: "สุขุมวิท", areaEn: "Sukhumvit" },
  { slug: "accounting-ladprao", areaTh: "ลาดพร้าว", areaEn: "Ladprao" },
  { slug: "accounting-din-daeng", areaTh: "ดินแดง", areaEn: "Din Daeng" },
  { slug: "accounting-chatuchak", areaTh: "จตุจักร", areaEn: "Chatuchak" },
];

function htmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonLd(value) {
  // Keep JSON-LD compact and deterministic.
  return JSON.stringify(value, null, 2);
}

function renderLocationPage(loc) {
  const canonical = `${baseUrl}/${loc.slug}`;
  const titleTh = `สำนักงานบัญชี ${loc.areaTh} กรุงเทพ | บัญชีรายเดือน ภาษี และ DBD | Pinpoint`;
  const titleEn = `Accounting near ${loc.areaEn}, Bangkok | Bookkeeping, Tax, DBD | Pinpoint`;
  const descTh = `Pinpoint ให้บริการบัญชีรายเดือน ภาษี จดทะเบียนบริษัท และงาน DBD สำหรับธุรกิจใน${loc.areaTh} กรุงเทพ และพื้นที่ใกล้เคียง (สื่อสารไทย/อังกฤษ)`;
  const descEn = `Pinpoint supports bookkeeping, tax, company registration, and DBD compliance for businesses in ${loc.areaEn}, Bangkok (Thai-English communication).`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Bangkok Accounting", item: `${baseUrl}/bangkok-accounting` },
      {
        "@type": "ListItem",
        position: 3,
        name: `Accounting near ${loc.areaEn}`,
        item: canonical,
      },
    ],
  };

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "AccountingService",
    name: "Pinpoint Accounting & Service, Ltd.",
    url: baseUrl,
    telephone: "+66-92-749-7442",
    image: `${baseUrl}/assets/logo-original-large.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "294 Soi Yoo Charoen 29, Ratchadaphisek 18 Rd., Sam Sen Nok, Huai Khwang",
      addressLocality: "Bangkok",
      postalCode: "10310",
      addressCountry: "TH",
    },
    areaServed: [
      { "@type": "City", name: "Bangkok" },
      { "@type": "AdministrativeArea", name: loc.areaEn },
    ],
    sameAs: ["https://lin.ee/58aU8oE"],
  };

  const relatedAreas = LOCATIONS.filter((x) => x.slug !== loc.slug).slice(0, 6);
  const relatedAreaLinks = relatedAreas
    .map(
      (x) =>
        `<li><a href="/${htmlEscape(x.slug)}" data-th="สำนักงานบัญชี ${htmlEscape(
          x.areaTh
        )}" data-en="Accounting near ${htmlEscape(x.areaEn)}">สำนักงานบัญชี ${htmlEscape(
          x.areaTh
        )}</a></li>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="th" data-title-th="${htmlEscape(titleTh)}" data-title-en="${htmlEscape(titleEn)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <title>${htmlEscape(titleTh)}</title>
    <meta name="description" content="${htmlEscape(descTh)}" data-th="${htmlEscape(descTh)}" data-en="${htmlEscape(
    descEn
  )}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pinpoint Accounting &amp; Service, Ltd." />
    <meta property="og:title" content="${htmlEscape(titleEn)}" />
    <meta property="og:description" content="${htmlEscape(descEn)}" />
    <meta property="og:url" content="${htmlEscape(canonical)}" />
    <meta property="og:image" content="${baseUrl}/assets/logo-original-large.jpg" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="canonical" href="${htmlEscape(canonical)}" />
    <link rel="alternate" hreflang="th" href="${htmlEscape(canonical)}?lang=th" />
    <link rel="alternate" hreflang="en" href="${htmlEscape(canonical)}?lang=en" />
    <link rel="alternate" hreflang="x-default" href="${htmlEscape(canonical)}" />

    <link rel="alternate" type="application/rss+xml" title="Pinpoint Blog Feed" href="${baseUrl}/feed.xml" />
    <link rel="icon" type="image/jpeg" href="/assets/logo-original-large.jpg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sarabun:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css" />

    <script type="application/ld+json">
${jsonLd(localBusiness)}
    </script>
    <script type="application/ld+json">
${jsonLd(breadcrumb)}
    </script>
  </head>
  <body data-title-th="${htmlEscape(titleTh)}" data-title-en="${htmlEscape(titleEn)}">
    <header class="topbar">
      <a class="brand" href="/">
        <img class="brand-logo" src="/assets/logo-original-large.jpg" alt="Pinpoint logo" />
        <div class="brand-copy">
          <strong>Pinpoint Accounting &amp; Service, Ltd.</strong>
          <span data-th="ที่ปรึกษาบัญชี ภาษี และจดทะเบียนธุรกิจ" data-en="Accounting, tax, and business compliance support">
            ที่ปรึกษาบัญชี ภาษี และจดทะเบียนธุรกิจ
          </span>
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
    </header>

    <main class="page-wrap">
      <section class="section page-hero page-intro">
        <p class="eyebrow" data-th="BANGKOK ACCOUNTING" data-en="BANGKOK ACCOUNTING">BANGKOK ACCOUNTING</p>
        <h1
          data-th="สำนักงานบัญชี ${htmlEscape(loc.areaTh)} สำหรับธุรกิจที่ต้องการทีมงานบัญชีและภาษีที่สื่อสารชัดเจน"
          data-en="Accounting near ${htmlEscape(loc.areaEn)} for businesses that need clear finance &amp; compliance support"
        >
          สำนักงานบัญชี ${htmlEscape(loc.areaTh)} สำหรับธุรกิจที่ต้องการทีมงานบัญชีและภาษีที่สื่อสารชัดเจน
        </h1>
        <p data-th="${htmlEscape(descTh)}" data-en="${htmlEscape(descEn)}">${htmlEscape(descTh)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/#lead-form" data-th="ขอประเมินเคส" data-en="Request a case review">ขอประเมินเคส</a>
          <a class="btn btn-secondary line-chat" href="https://lin.ee/58aU8oE" target="_blank" rel="noreferrer" data-th="คุยผ่าน LINE OA" data-en="Chat via LINE OA">คุยผ่าน LINE OA</a>
          <a class="btn btn-deep" href="tel:0927497442" data-th="โทร 092-749-7442" data-en="Call 092-749-7442">โทร 092-749-7442</a>
        </div>
      </section>

      <section class="section services-grid">
        <div class="section-head">
          <h2 data-th="บริการที่ลูกค้าใน${htmlEscape(loc.areaTh)}นิยมใช้" data-en="Most requested services in ${htmlEscape(
    loc.areaEn
  )}">
            บริการที่ลูกค้าใน${htmlEscape(loc.areaTh)}นิยมใช้
          </h2>
          <p data-th="เลือกเริ่มจากงานที่เร่งด่วนที่สุด แล้วค่อยขยาย scope เมื่อระบบเข้าที่" data-en="Start with the highest urgency, then expand scope once operations are stable.">
            เลือกเริ่มจากงานที่เร่งด่วนที่สุด แล้วค่อยขยาย scope เมื่อระบบเข้าที่
          </p>
        </div>
        <div class="grid two-col">
          <article class="service-card">
            <h3 data-th="บัญชีรายเดือนและภาษี" data-en="Monthly accounting &amp; tax">บัญชีรายเดือนและภาษี</h3>
            <p data-th="ปิดงบรายเดือน วางระบบเอกสาร ภ.พ.30 ภ.ง.ด. และการยื่นแบบที่จำเป็น" data-en="Monthly close, document flow, VAT and withholding filings.">
              ปิดงบรายเดือน วางระบบเอกสาร ภ.พ.30 ภ.ง.ด. และการยื่นแบบที่จำเป็น
            </p>
            <a class="resource-link" href="/monthly-accounting" data-th="ดูรายละเอียดบริการ" data-en="View service details">ดูรายละเอียดบริการ</a>
          </article>
          <article class="service-card">
            <h3 data-th="จดทะเบียน/แก้ไข DBD" data-en="Company registration &amp; DBD amendments">จดทะเบียน/แก้ไข DBD</h3>
            <p data-th="จดบริษัท เปลี่ยนที่อยู่ เปลี่ยนกรรมการ เพิ่มทุน และงาน DBD ที่ต้องทำให้ถูกต้อง" data-en="Registration, address/director changes, capital increases, and DBD compliance.">
              จดบริษัท เปลี่ยนที่อยู่ เปลี่ยนกรรมการ เพิ่มทุน และงาน DBD ที่ต้องทำให้ถูกต้อง
            </p>
            <a class="resource-link" href="/company-registration" data-th="ดูบริการจดทะเบียน" data-en="Company registration">ดูบริการจดทะเบียน</a>
          </article>
        </div>
      </section>

      <section class="section cta-band">
        <p class="kicker" data-th="AREAS" data-en="AREAS">AREAS</p>
        <h2 data-th="พื้นที่ใกล้เคียงที่เราดูแล" data-en="Nearby areas we cover">พื้นที่ใกล้เคียงที่เราดูแล</h2>
        <p data-th="เลือกพื้นที่เพื่อดูรายละเอียดการให้บริการแบบ local intent" data-en="Open a local-intent page for area-specific context.">
          เลือกพื้นที่เพื่อดูรายละเอียดการให้บริการแบบ local intent
        </p>
        <ul class="inline-links">
${relatedAreaLinks}
        </ul>
        <div class="hero-actions" style="justify-content:center;">
          <a class="btn btn-secondary" href="/bangkok-accounting" data-th="กลับหน้า Bangkok Accounting" data-en="Back to Bangkok Accounting">กลับหน้า Bangkok Accounting</a>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <section class="footer-meta">
          <p><strong>Pinpoint Accounting &amp; Service, Ltd.</strong></p>
          <p data-th="ที่อยู่: ห้วยขวาง กรุงเทพ" data-en="Based in Huai Khwang, Bangkok">ที่อยู่: ห้วยขวาง กรุงเทพ</p>
          <a class="resource-link" href="/privacy" data-th="นโยบายความเป็นส่วนตัว" data-en="Privacy policy">นโยบายความเป็นส่วนตัว</a>
        </section>
      </div>
      <p class="copyright">© <span data-current-year>2026</span> Pinpoint Accounting &amp; Service, Ltd.</p>
    </footer>

    <script src="/tracking.js"></script>
    <script src="/app.js"></script>
  </body>
</html>
`;
}

function main() {
  for (const loc of LOCATIONS) {
    const outDir = path.join(projectRoot, loc.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), renderLocationPage(loc), "utf8");
  }

  console.log(`Generated ${LOCATIONS.length} location pages on ${todayIso}.`);
}

main();

