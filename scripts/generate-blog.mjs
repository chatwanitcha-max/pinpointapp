import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const blogDir = path.join(projectRoot, "blog");
const contentPaths = [
  path.join(projectRoot, "content", "blog-posts.json"),
  path.join(projectRoot, "content", "blog-cluster-expansion.json")
];
const sitemapPath = path.join(projectRoot, "sitemap.xml");
const feedPath = path.join(projectRoot, "feed.xml");
const baseUrl = (process.env.PINPOINT_BASE_URL || "https://pinpointaccountingservice.com").replace(/\/+$/, "");
const siteName = "Pinpoint Accounting & Service, Ltd.";
const defaultOgImage = `${baseUrl}/assets/images/hero-workspace.jpg`;

function htmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function xmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderJsonLd(data) {
  return JSON.stringify(data, null, 2);
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function loadPosts() {
  const existingFiles = contentPaths.filter((filePath) => fs.existsSync(filePath));
  if (!existingFiles.length) {
    throw new Error(`Missing blog content files: ${contentPaths.join(", ")}`);
  }

  const allPosts = existingFiles
    .flatMap((filePath) => JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const uniquePosts = new Map();
  for (const post of allPosts) {
    if (!uniquePosts.has(post.slug)) {
      uniquePosts.set(post.slug, post);
    }
  }

  return [...uniquePosts.values()];
}

function sectionParagraphs(list) {
  return asArray(list)
    .filter(Boolean)
    .map((item) => `<p>${htmlEscape(item)}</p>`)
    .join("\n");
}

function sectionChecklist(list) {
  const items = asArray(list).filter(Boolean);
  if (!items.length) return "";
  return `<ul class="checklist">\n${items.map((item) => `  <li>${htmlEscape(item)}</li>`).join("\n")}\n</ul>`;
}

function renderSections(sections, lang) {
  return asArray(sections)
    .map((section) => {
      const heading = lang === "th" ? section.heading_th : section.heading_en;
      const paragraphs = lang === "th" ? section.paragraphs_th : section.paragraphs_en;
      const checklist = lang === "th" ? section.checklist_th : section.checklist_en;
      return `<section class="article-section">
  <h3>${htmlEscape(heading)}</h3>
  ${sectionParagraphs(paragraphs)}
  ${sectionChecklist(checklist)}
</section>`;
    })
    .join("\n");
}

function renderSummary(items) {
  const list = asArray(items).filter(Boolean);
  if (!list.length) return "";
  return `<ul class="checklist">\n${list.map((item) => `  <li>${htmlEscape(item)}</li>`).join("\n")}\n</ul>`;
}

function renderSources(sources, lang) {
  return asArray(sources)
    .map((source) => {
      const label = lang === "th" ? source.label_th : source.label_en;
      const url = htmlEscape(source.url || "");
      return `<article class="source-item">
  <a href="${url}" target="_blank" rel="noreferrer">${htmlEscape(label)}</a>
  <p>${url}</p>
</article>`;
    })
    .join("\n");
}

function buildBlogSchema(posts) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Pinpoint Blog",
    description: "Practical accounting, tax, corporate compliance, and business operations articles for Thailand-based businesses.",
    url: `${baseUrl}/blog`,
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/assets/logo-original-large.jpg`
      }
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title_en,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.date,
      dateModified: post.date,
      articleSection: post.category_en,
      inLanguage: ["th", "en"]
    }))
  };
}

function buildPostSchema(post, postUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title_en,
    alternativeHeadline: post.title_th,
    description: post.description_en,
    datePublished: post.date,
    dateModified: post.date,
    url: postUrl,
    mainEntityOfPage: postUrl,
    articleSection: post.category_en,
    inLanguage: ["th", "en"],
    author: {
      "@type": "Organization",
      name: siteName
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/assets/logo-original-large.jpg`
      }
    },
    image: defaultOgImage
  };
}

function buildBreadcrumbSchema(post) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${baseUrl}/blog`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title_en,
        item: `${baseUrl}/blog/${post.slug}`
      }
    ]
  };
}

function renderFeed(posts) {
  const items = posts
    .map((post) => {
      const url = `${baseUrl}/blog/${post.slug}`;
      return `  <item>
    <title>${xmlEscape(post.title_en)}</title>
    <link>${xmlEscape(url)}</link>
    <guid>${xmlEscape(url)}</guid>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <description>${xmlEscape(post.description_en)}</description>
    <category>${xmlEscape(post.category_en)}</category>
  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Pinpoint Blog</title>
    <link>${xmlEscape(`${baseUrl}/blog`)}</link>
    <description>Practical accounting, tax, corporate compliance, and business operations articles for Thailand-based businesses.</description>
    <language>th</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function pickRelatedPosts(posts, currentPost, limit = 3) {
  const sameCategory = posts.filter(
    (post) => post.slug !== currentPost.slug && post.category_en === currentPost.category_en
  );
  const fallback = posts.filter((post) => post.slug !== currentPost.slug && post.category_en !== currentPost.category_en);
  return [...sameCategory, ...fallback].slice(0, limit);
}

function renderArticleRecommendations(post, posts) {
  const relatedPosts = pickRelatedPosts(posts, post);
  const relatedCards = relatedPosts
    .map(
      (item) => `<article class="article-card">
  <div class="service-meta">
    <span class="chip" data-th="${htmlEscape(item.category_th)}" data-en="${htmlEscape(item.category_en)}">${htmlEscape(item.category_th)}</span>
    <span class="chip gold" data-th="${htmlEscape(item.read_time_th)}" data-en="${htmlEscape(item.read_time_en)}">${htmlEscape(item.read_time_th)}</span>
  </div>
  <h3 data-th="${htmlEscape(item.title_th)}" data-en="${htmlEscape(item.title_en)}">${htmlEscape(item.title_th)}</h3>
  <p data-th="${htmlEscape(item.description_th)}" data-en="${htmlEscape(item.description_en)}">${htmlEscape(item.description_th)}</p>
  <a class="resource-link" href="/blog/${htmlEscape(item.slug)}" data-th="อ่านบทความนี้" data-en="Read this article">อ่านบทความนี้</a>
</article>`
    )
    .join("\n");

  return `<section class="section">
  <div class="section-header">
    <p class="kicker" data-th="RELATED GUIDES" data-en="RELATED GUIDES">RELATED GUIDES</p>
    <h2
      data-th="อ่านต่อจากหัวข้อที่เกี่ยวข้องและไปยังหน้าบริการที่ช่วยให้เริ่มงานได้เร็วขึ้น"
      data-en="Continue with related articles and service pages that help move your case forward"
    >
      อ่านต่อจากหัวข้อที่เกี่ยวข้องและไปยังหน้าบริการที่ช่วยให้เริ่มงานได้เร็วขึ้น
    </h2>
  </div>
  <div class="article-grid">
${relatedCards}
  </div>
  <div class="service-grid" style="margin-top: 1.5rem;">
    <article class="service-card">
      <span class="chip" data-th="SERVICE PAGE" data-en="SERVICE PAGE">SERVICE PAGE</span>
      <h3 data-th="ดูขอบเขตบริการทั้งหมด" data-en="Review full service scope">ดูขอบเขตบริการทั้งหมด</h3>
      <p data-th="เหมาะสำหรับลูกค้าที่ต้องการเห็นขอบเขตงานจริงก่อนคุยเคส" data-en="Best for clients who want a clear review of scope before discussing their case.">เหมาะสำหรับลูกค้าที่ต้องการเห็นขอบเขตงานจริงก่อนคุยเคส</p>
      <a class="resource-link" href="/services" data-th="ไปที่หน้าบริการ" data-en="Go to services">ไปที่หน้าบริการ</a>
    </article>
    <article class="service-card">
      <span class="chip" data-th="FAQ" data-en="FAQ">FAQ</span>
      <h3 data-th="ดูคำถามที่ลูกค้ามักถามก่อนเริ่มงาน" data-en="Read common pre-engagement questions">ดูคำถามที่ลูกค้ามักถามก่อนเริ่มงาน</h3>
      <p data-th="ช่วยลดความไม่แน่ใจเรื่องขอบเขต เอกสาร และการเริ่มงาน" data-en="Useful for clarifying scope, document readiness, and onboarding questions.">ช่วยลดความไม่แน่ใจเรื่องขอบเขต เอกสาร และการเริ่มงาน</p>
      <a class="resource-link" href="/faq" data-th="ไปที่ FAQ" data-en="Go to FAQ">ไปที่ FAQ</a>
    </article>
    <article class="service-card">
      <span class="chip" data-th="OFFICIAL SOURCES" data-en="OFFICIAL SOURCES">OFFICIAL SOURCES</span>
      <h3 data-th="ดูแหล่งอ้างอิงและลิงก์หน่วยงานทางการ" data-en="Open official references and authority links">ดูแหล่งอ้างอิงและลิงก์หน่วยงานทางการ</h3>
      <p data-th="เหมาะสำหรับผู้อ่านที่ต้องการตรวจสอบข้อมูลต่อด้วยตนเอง" data-en="Best for readers who want to verify public information directly.">เหมาะสำหรับผู้อ่านที่ต้องการตรวจสอบข้อมูลต่อด้วยตนเอง</p>
      <a class="resource-link" href="/resources" data-th="ไปที่ Resources" data-en="Go to Resources">ไปที่ Resources</a>
    </article>
  </div>
</section>`;
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

function renderFooter(descriptionTh, descriptionEn) {
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

function renderBlogIndex(posts) {
  const blogUrl = `${baseUrl}/blog`;
  const blogDescriptionTh = "คลังบทความด้านบัญชี ภาษี จดทะเบียนบริษัท DBD วีซ่า Work Permit และใบอนุญาตธุรกิจ สำหรับผู้ประกอบการในประเทศไทย";
  const blogDescriptionEn = "Accounting, tax, DBD, visa/work permit, and business-compliance articles for business owners operating in Thailand.";
  const blogSchema = renderJsonLd(buildBlogSchema(posts));
  const cards = posts
    .map((post) => {
      return `<article class="article-card">
  <div class="service-meta">
    <span class="chip" data-th="${htmlEscape(post.category_th)}" data-en="${htmlEscape(post.category_en)}">${htmlEscape(post.category_th)}</span>
    <span class="chip gold" data-th="${htmlEscape(post.read_time_th)}" data-en="${htmlEscape(post.read_time_en)}">${htmlEscape(post.read_time_th)}</span>
  </div>
  <h3 data-th="${htmlEscape(post.title_th)}" data-en="${htmlEscape(post.title_en)}">${htmlEscape(post.title_th)}</h3>
  <p data-th="${htmlEscape(post.description_th)}" data-en="${htmlEscape(post.description_en)}">${htmlEscape(post.description_th)}</p>
  <a class="resource-link" href="/blog/${htmlEscape(post.slug)}" data-th="อ่านบทความ" data-en="Read article">อ่านบทความ</a>
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html
  lang="th"
  data-title-th="Pinpoint Blog | บทความบัญชี ภาษี และงานจดทะเบียนธุรกิจ"
  data-title-en="Pinpoint Blog | Accounting, Tax, and Corporate Compliance Articles"
>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pinpoint Blog | บทความบัญชี ภาษี และงานจดทะเบียนธุรกิจ</title>
    <meta
      name="description"
      content="ศูนย์รวมบทความด้านบัญชี ภาษี จดทะเบียนบริษัท DBD วีซ่า Work Permit และใบอนุญาตธุรกิจ สำหรับผู้ประกอบการในประเทศไทย"
      data-th="ศูนย์รวมบทความด้านบัญชี ภาษี จดทะเบียนบริษัท DBD วีซ่า Work Permit และใบอนุญาตธุรกิจ สำหรับผู้ประกอบการในประเทศไทย"
      data-en="Accounting, tax, DBD, visa/work permit, and business-compliance articles for business owners operating in Thailand."
    />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="Pinpoint Blog | Accounting, Tax, and Corporate Compliance Articles" />
    <meta property="og:description" content="${htmlEscape(blogDescriptionEn)}" />
    <meta property="og:url" content="${blogUrl}" />
    <meta property="og:image" content="${defaultOgImage}" />
    <meta property="og:locale" content="th_TH" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Pinpoint Blog | Accounting, Tax, and Corporate Compliance Articles" />
    <meta name="twitter:description" content="${htmlEscape(blogDescriptionEn)}" />
    <meta name="twitter:image" content="${defaultOgImage}" />
    <link rel="canonical" href="${blogUrl}" />
    <link rel="alternate" hreflang="th" href="${blogUrl}?lang=th" />
    <link rel="alternate" hreflang="en" href="${blogUrl}?lang=en" />
    <link rel="alternate" hreflang="x-default" href="${blogUrl}" />
    <link rel="alternate" type="application/rss+xml" title="Pinpoint Blog Feed" href="${baseUrl}/feed.xml" />
    <link rel="icon" type="image/jpeg" href="/assets/logo-original-large.jpg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sarabun:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
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
${blogSchema}
    </script>
  </head>
  <body
    data-title-th="Pinpoint Blog | บทความบัญชี ภาษี และงานจดทะเบียนธุรกิจ"
    data-title-en="Pinpoint Blog | Accounting, Tax, and Corporate Compliance Articles"
  >
    ${renderHeader(
      "บทความสำหรับเจ้าของธุรกิจที่ต้องการข้อมูลก่อนเริ่มใช้บริการ",
      "Articles for business owners preparing to use accounting and compliance services"
    )}

    <main class="page-wrap">
      <section class="section page-hero">
        <div class="hero-grid">
          <div class="hero-copy">
            <p class="eyebrow" data-th="PINPOINT BUSINESS ARTICLES" data-en="PINPOINT BUSINESS ARTICLES">PINPOINT BUSINESS ARTICLES</p>
            <h1
              data-th="บทความบัญชี ภาษี และเอกสารธุรกิจที่อ่านแล้วเอาไปใช้ต่อได้"
              data-en="Accounting, tax, and business-document articles you can use right away"
            >
              บทความบัญชี ภาษี และเอกสารธุรกิจที่อ่านแล้วเอาไปใช้ต่อได้
            </h1>
            <p
              data-th="เราเขียนจากคำถามที่ลูกค้าถามจริงในการทำบัญชี ภาษี จดทะเบียนบริษัท วีซ่า และใบอนุญาต เพื่อให้คุณอ่านแล้วเห็นภาพก่อนเริ่มงาน"
              data-en="These articles are based on the real questions clients ask about accounting, tax, company registration, visa, and licensing before starting work with us."
            >
              เราเขียนจากคำถามที่ลูกค้าถามจริงในการทำบัญชี ภาษี จดทะเบียนบริษัท วีซ่า และใบอนุญาต เพื่อให้คุณอ่านแล้วเห็นภาพก่อนเริ่มงาน
            </p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="/#lead-form" data-th="ให้ทีมประเมินเคสของคุณ" data-en="Get your case assessed">ให้ทีมประเมินเคสของคุณ</a>
              <a class="btn btn-secondary line-chat" href="#" target="_blank" rel="noreferrer" data-th="คุยผ่าน LINE OA" data-en="Chat via LINE OA">คุยผ่าน LINE OA</a>
            </div>
          </div>
          <aside class="hero-aside">
            <h3 data-th="สิ่งที่คุณจะได้จากบทความ" data-en="What you will get from these articles">สิ่งที่คุณจะได้จากบทความ</h3>
            <ul class="checklist">
              <li data-th="อธิบายตามสถานการณ์จริงของผู้ประกอบการ ไม่ใช่ข้อความโฆษณาทั่วไป" data-en="Built for real business situations, not generic ad copy">อธิบายตามสถานการณ์จริงของผู้ประกอบการ ไม่ใช่ข้อความโฆษณาทั่วไป</li>
              <li data-th="เชื่อมโยงเอกสารอ้างอิงทางการ เช่น DBD กรมสรรพากร และหน่วยงานที่เกี่ยวข้อง" data-en="Linked to official references such as DBD, Revenue Department, and related authorities">เชื่อมโยงเอกสารอ้างอิงทางการ เช่น DBD กรมสรรพากร และหน่วยงานที่เกี่ยวข้อง</li>
              <li data-th="รองรับภาษาไทย/อังกฤษ สำหรับทีมไทยและผู้บริหารต่างชาติ" data-en="Thai/English support for local teams and international stakeholders">รองรับภาษาไทย/อังกฤษ สำหรับทีมไทยและผู้บริหารต่างชาติ</li>
            </ul>
          </aside>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <p class="kicker" data-th="ALL ARTICLES" data-en="ALL ARTICLES">ALL ARTICLES</p>
          <h2 data-th="เลือกหัวข้อที่ตรงกับช่วงการเติบโตของธุรกิจคุณ" data-en="Choose the topic that matches your current business stage">
            เลือกหัวข้อที่ตรงกับช่วงการเติบโตของธุรกิจคุณ
          </h2>
        </div>
        <div class="article-grid">
${cards}
        </div>
      </section>
    </main>

    ${renderFooter(
      "บทความที่ช่วยให้เจ้าของธุรกิจเข้าใจขั้นตอน เตรียมเอกสาร และคุยกับทีมงานได้ง่ายขึ้นก่อนเริ่มงาน",
      "Articles that help business owners understand the process, prepare documents, and speak with the team more easily before starting."
    )}

    <script src="/tracking.js"></script>
    <script src="/app.js"></script>
  </body>
</html>`;
}

function renderPost(post, posts) {
  const slug = htmlEscape(post.slug);
  const titleTh = htmlEscape(post.title_th);
  const titleEn = htmlEscape(post.title_en);
  const descTh = htmlEscape(post.description_th);
  const descEn = htmlEscape(post.description_en);
  const categoryTh = htmlEscape(post.category_th);
  const categoryEn = htmlEscape(post.category_en);
  const readTh = htmlEscape(post.read_time_th);
  const readEn = htmlEscape(post.read_time_en);
  const date = htmlEscape(post.date);
  const postUrl = `${baseUrl}/blog/${slug}`;
  const postSchema = renderJsonLd(buildPostSchema(post, postUrl));
  const breadcrumbSchema = renderJsonLd(buildBreadcrumbSchema(post));

  return `<!doctype html>
<html
  lang="th"
  data-title-th="${titleTh} | Pinpoint Blog"
  data-title-en="${titleEn} | Pinpoint Blog"
>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${titleTh} | Pinpoint Blog</title>
    <meta name="description" content="${descTh}" data-th="${descTh}" data-en="${descEn}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="${titleEn} | Pinpoint Blog" />
    <meta property="og:description" content="${descEn}" />
    <meta property="og:url" content="${postUrl}" />
    <meta property="og:image" content="${defaultOgImage}" />
    <meta property="article:published_time" content="${date}" />
    <meta property="article:modified_time" content="${date}" />
    <meta property="article:section" content="${categoryEn}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titleEn} | Pinpoint Blog" />
    <meta name="twitter:description" content="${descEn}" />
    <meta name="twitter:image" content="${defaultOgImage}" />
    <link rel="canonical" href="${postUrl}" />
    <link rel="alternate" hreflang="th" href="${postUrl}?lang=th" />
    <link rel="alternate" hreflang="en" href="${postUrl}?lang=en" />
    <link rel="alternate" hreflang="x-default" href="${postUrl}" />
    <link rel="alternate" type="application/rss+xml" title="Pinpoint Blog Feed" href="${baseUrl}/feed.xml" />
    <link rel="icon" type="image/jpeg" href="/assets/logo-original-large.jpg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sarabun:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
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
${postSchema}
    </script>
    <script type="application/ld+json">
${breadcrumbSchema}
    </script>
  </head>
  <body
    data-title-th="${titleTh} | Pinpoint Blog"
    data-title-en="${titleEn} | Pinpoint Blog"
  >
    ${renderHeader(
      "บทความสำหรับเจ้าของธุรกิจที่ต้องการข้อมูลก่อนเริ่มใช้บริการ",
      "Articles for business owners preparing to use accounting and compliance services"
    )}

    <main class="page-wrap">
      <section class="section article-shell">
        <div class="article-head">
          <p class="kicker" data-th="PINPOINT BUSINESS ARTICLE" data-en="PINPOINT BUSINESS ARTICLE">PINPOINT BUSINESS ARTICLE</p>
          <div class="service-meta">
            <span class="chip" data-th="${categoryTh}" data-en="${categoryEn}">${categoryTh}</span>
            <span class="chip gold" data-th="${readTh}" data-en="${readEn}">${readTh}</span>
          </div>
          <h1 data-th="${titleTh}" data-en="${titleEn}">${titleTh}</h1>
          <p data-th="${descTh}" data-en="${descEn}">${descTh}</p>
          <div class="article-meta-grid">
            <article class="article-meta-card">
              <strong data-th="วันที่เผยแพร่" data-en="Published date">วันที่เผยแพร่</strong>
              <span>${date}</span>
            </article>
            <article class="article-meta-card">
              <strong data-th="หมวดบทความ" data-en="Category">หมวดบทความ</strong>
              <span data-th="${categoryTh}" data-en="${categoryEn}">${categoryTh}</span>
            </article>
            <article class="article-meta-card">
              <strong data-th="เวลาอ่านโดยประมาณ" data-en="Estimated read time">เวลาอ่านโดยประมาณ</strong>
              <span data-th="${readTh}" data-en="${readEn}">${readTh}</span>
            </article>
          </div>
        </div>

        <div class="article-layout">
          <article class="article-body">
            <div class="lang-panel is-active" data-lang-panel="th">
${renderSections(post.sections, "th")}
            </div>
            <div class="lang-panel" data-lang-panel="en">
${renderSections(post.sections, "en")}
            </div>
          </article>

          <aside class="article-sidebar">
            <section class="note-box">
              <h3 data-th="สรุปประเด็นสำคัญ" data-en="Key takeaways">สรุปประเด็นสำคัญ</h3>
              <div class="lang-panel is-active" data-lang-panel="th">
${renderSummary(post.summary_th)}
              </div>
              <div class="lang-panel" data-lang-panel="en">
${renderSummary(post.summary_en)}
              </div>
            </section>

            <section class="note-box">
              <h3 data-th="แหล่งข้อมูลอ้างอิง" data-en="Reference sources">แหล่งข้อมูลอ้างอิง</h3>
              <p
                class="micro-copy"
                data-th="บทความนี้จัดทำโดยอ้างอิงข้อมูลสาธารณะ โปรดตรวจสอบเงื่อนไขล่าสุดกับหน่วยงานที่เกี่ยวข้องก่อนดำเนินการจริงทุกครั้ง"
                data-en="This article is based on public references. Always verify the latest requirements with official authorities before execution."
              >
                บทความนี้จัดทำโดยอ้างอิงข้อมูลสาธารณะ โปรดตรวจสอบเงื่อนไขล่าสุดกับหน่วยงานที่เกี่ยวข้องก่อนดำเนินการจริงทุกครั้ง
              </p>
              <div class="source-list lang-panel is-active" data-lang-panel="th">
${renderSources(post.sources, "th")}
              </div>
              <div class="source-list lang-panel" data-lang-panel="en">
${renderSources(post.sources, "en")}
              </div>
            </section>
          </aside>
        </div>

        ${renderArticleRecommendations(post, posts)}

        <div class="article-nav">
          <a class="btn btn-primary" href="/#lead-form" data-th="ขอให้ทีมช่วยดูเคสนี้" data-en="Ask the team to review this case">ขอให้ทีมช่วยดูเคสนี้</a>
          <a class="btn btn-secondary" href="/blog" data-th="กลับไปดูบทความทั้งหมด" data-en="Back to all articles">กลับไปดูบทความทั้งหมด</a>
          <a class="btn btn-soft line-chat" href="#" target="_blank" rel="noreferrer" data-th="คุยผ่าน LINE OA" data-en="Chat via LINE OA">คุยผ่าน LINE OA</a>
        </div>
      </section>
    </main>

    ${renderFooter(
      "บทความเชิงปฏิบัติสำหรับผู้ประกอบการที่ต้องการข้อมูลตรวจสอบได้และนำไปใช้ต่อได้จริง",
      "Practical, verifiable content for business owners and operations teams."
    )}

    <script src="/tracking.js"></script>
    <script src="/app.js"></script>
  </body>
</html>`;
}

function renderSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const staticPaths = [
    { path: "/", lastmod: today },
    { path: "/bangkok-accounting", lastmod: today },
    { path: "/monthly-accounting", lastmod: today },
    { path: "/company-registration", lastmod: today },
    { path: "/dbd-amendments", lastmod: today },
    { path: "/visa-work-permit", lastmod: today },
    { path: "/business-licenses", lastmod: today },
    { path: "/payroll-social-security", lastmod: today },
    { path: "/corporate-tax-planning", lastmod: today },
    { path: "/audit-preparation", lastmod: today },
    { path: "/foreign-business-support", lastmod: today },
    { path: "/company-dissolution", lastmod: today },
    { path: "/services", lastmod: today },
    { path: "/about", lastmod: today },
    { path: "/resources", lastmod: today },
    { path: "/faq", lastmod: today },
    { path: "/privacy", lastmod: today },
    { path: "/terms", lastmod: today },
    { path: "/blog", lastmod: today },
    { path: "/thank-you", lastmod: today }
  ];

  const blogPaths = posts.map((post) => ({
    path: `/blog/${post.slug}`,
    lastmod: post.date || today
  }));

  const all = [...staticPaths, ...blogPaths].filter((item, index, array) => {
    return array.findIndex((candidate) => candidate.path === item.path) === index;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (item) => `  <url>
    <loc>${baseUrl}${item.path}</loc>
    <lastmod>${item.lastmod}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>
`;
}

const posts = loadPosts();

fs.mkdirSync(blogDir, { recursive: true });
for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    fs.rmSync(path.join(blogDir, entry.name), { recursive: true, force: true });
  }
}

for (const post of posts) {
  const postDir = path.join(blogDir, post.slug);
  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(path.join(postDir, "index.html"), renderPost(post, posts), "utf8");
}

fs.writeFileSync(path.join(blogDir, "index.html"), renderBlogIndex(posts), "utf8");
fs.writeFileSync(sitemapPath, renderSitemap(posts), "utf8");
fs.writeFileSync(feedPath, renderFeed(posts), "utf8");

console.log(`Generated blog index, ${posts.length} article pages, sitemap.xml, and feed.xml.`);
