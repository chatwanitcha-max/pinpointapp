import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const raw = fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function readJsonIfExists(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  return readJson(relativePath);
}

function writeJson(relativePath, payload) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/^\uFEFF/, "");
}

function tokenise(text) {
  const value = String(text || "").toLowerCase();
  const matches = value.match(/[\u0E00-\u0E7F]{2,}|[a-z0-9][a-z0-9-]{1,}/gu) || [];
  return [...new Set(matches)];
}

function normaliseUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://pinpointaccountingservice.com${value.startsWith("/") ? value : `/${value}`}`;
}

function serviceBucketFromSlug(slug = "") {
  const value = String(slug).toLowerCase();
  if (
    [
      "monthly-accounting",
      "payroll-social-security",
      "corporate-tax-planning",
      "audit-preparation",
      "bangkok-accounting",
    ].includes(value)
  ) {
    return "accounting-tax";
  }

  if (
    [
      "company-registration",
      "dbd-amendments",
      "foreign-business-support",
    ].includes(value)
  ) {
    return "corporate-dbd";
  }

  if (
    [
      "visa-work-permit",
      "business-licenses",
    ].includes(value)
  ) {
    return "visa-license";
  }

  if (value === "company-dissolution") {
    return "company-dissolution";
  }

  return "general";
}

function extractFaqEntries() {
  const html = readText("faq/index.html");
  const pattern =
    /<details(?: open)?>\s*<summary data-th="([^"]+)" data-en="([^"]+)">[\s\S]*?<\/summary>\s*<p data-th="([^"]+)" data-en="([^"]+)">/g;
  const entries = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const [, questionTh, questionEn, answerTh, answerEn] = match;
    entries.push({
      id: `faq-page-${entries.length + 1}`,
      type: "faq_page",
      category: "faq",
      serviceBucket: "general",
      priority: 65,
      question_th: questionTh,
      question_en: questionEn,
      answer_th: answerTh,
      answer_en: answerEn,
      source_url: "/faq",
      keywords: tokenise(`${questionTh} ${questionEn} ${answerTh} ${answerEn}`),
    });
  }
  return entries;
}

function buildServiceEntries() {
  const items = readJson("content/service-landings.json");
  return items.map((item) => {
    const deliverablesTh = (item.deliverables_th || []).join(" / ");
    const deliverablesEn = (item.deliverables_en || []).join(" / ");
    const idealTh = (item.ideal_for_th || []).join(" / ");
    const idealEn = (item.ideal_for_en || []).join(" / ");
    const processFirstTh = item.process?.[0]?.body_th || "";
    const processFirstEn = item.process?.[0]?.body_en || "";

    return {
      id: `service-${item.slug}`,
      type: "service_page",
      category: "service",
      serviceBucket: serviceBucketFromSlug(item.slug),
      priority: 80,
      question_th: item.hero_title_th || item.subtitle_th,
      question_en: item.hero_title_en || item.subtitle_en,
      answer_th: [item.hero_description_th, deliverablesTh, idealTh, processFirstTh]
        .filter(Boolean)
        .join(" "),
      answer_en: [item.hero_description_en, deliverablesEn, idealEn, processFirstEn]
        .filter(Boolean)
        .join(" "),
      follow_up_th: item.cta_copy_th || "ถ้าต้องการให้ทีมช่วยประเมินขอบเขตงาน แจ้งรายละเอียดเบื้องต้นมาได้เลยค่ะ",
      follow_up_en: item.cta_copy_en || "If you want the team to review the scope, send the basic details and we will guide the next step.",
      source_url: `/${item.slug}`,
      keywords: tokenise(
        [
          item.slug,
          item.subtitle_th,
          item.subtitle_en,
          item.hero_title_th,
          item.hero_title_en,
          item.hero_description_th,
          item.hero_description_en,
          deliverablesTh,
          deliverablesEn,
          idealTh,
          idealEn,
        ]
          .filter(Boolean)
          .join(" ")
      ),
    };
  });
}

function buildBlogEntries() {
  const uniqueItems = new Map();
  const items = [
    ...readJson("content/blog-posts.json"),
    ...readJson("content/blog-cluster-expansion.json"),
  ];
  for (const item of items) {
    if (!uniqueItems.has(item.slug)) {
      uniqueItems.set(item.slug, item);
    }
  }

  return [...uniqueItems.values()].map((item) => {
    const summaryTh = (item.summary_th || []).join(" / ");
    const summaryEn = (item.summary_en || []).join(" / ");
    const sources = (item.sources || []).map((source) => ({
      label_th: source.label_th,
      label_en: source.label_en,
      url: source.url,
    }));

    return {
      id: `blog-${item.slug}`,
      type: "blog_article",
      category: item.category_en || item.category_th || "Blog",
      serviceBucket: serviceBucketFromSlug(
        item.slug.includes("registration")
          ? "company-registration"
          : item.slug.includes("permit") || item.slug.includes("license")
            ? "visa-work-permit"
            : item.slug.includes("dissolution") || item.slug.includes("closing")
              ? "company-dissolution"
              : item.slug.includes("dbd") || item.slug.includes("director") || item.slug.includes("address")
                ? "dbd-amendments"
                : item.slug.includes("payroll") || item.slug.includes("tax") || item.slug.includes("vat") || item.slug.includes("accounting")
                  ? "monthly-accounting"
                  : ""
      ),
      priority: 55,
      question_th: item.title_th,
      question_en: item.title_en,
      answer_th: [item.description_th, summaryTh].filter(Boolean).join(" "),
      answer_en: [item.description_en, summaryEn].filter(Boolean).join(" "),
      follow_up_th: "ถ้าต้องการให้ทีมช่วยดูว่าบทความนี้เกี่ยวข้องกับเคสของคุณอย่างไร แจ้งรายละเอียดเบื้องต้นมาได้เลยค่ะ",
      follow_up_en: "If you want the team to relate this article to your case, send us the basics and we will map the next step.",
      source_url: `/blog/${item.slug}`,
      official_links: sources,
      keywords: tokenise(
        [
          item.category_th,
          item.category_en,
          item.title_th,
          item.title_en,
          item.description_th,
          item.description_en,
          summaryTh,
          summaryEn,
        ]
          .filter(Boolean)
          .join(" ")
      ),
    };
  });
}

function buildReferenceEntries() {
  const officialLinks = readJson("content/official-reference-links.json");
  return officialLinks.map((item) => ({
    id: `reference-${item.id}`,
    type: "official_reference",
    category: "reference",
    serviceBucket:
      item.id.startsWith("dbd") ? "corporate-dbd" :
      item.id.startsWith("rd") || item.id.startsWith("sso") ? "accounting-tax" :
      item.id.startsWith("doe") || item.id === "bizportal" ? "visa-license" :
      "general",
    priority: 50,
    question_th: `ลิงก์ทางการ: ${item.label_th}`,
    question_en: `Official link: ${item.label_en}`,
    answer_th: `ใช้ลิงก์นี้เพื่อตรวจสอบข้อมูลทางการของ ${item.label_th} โดยตรงก่อนเริ่มงานหรือก่อนยื่นเอกสารจริง`,
    answer_en: `Use this official link to verify current information directly from ${item.label_en} before starting work or submitting documents.`,
    source_url: item.url,
    official_links: [
      {
        label_th: item.label_th,
        label_en: item.label_en,
        url: item.url,
      },
    ],
    keywords: tokenise(`${item.label_th} ${item.label_en} ${(item.topics || []).join(" ")}`),
  }));
}

function withSearchMetadata(entry) {
  const searchTextTh = [entry.question_th, entry.answer_th, entry.follow_up_th, ...(entry.keywords || [])]
    .filter(Boolean)
    .join(" ");
  const searchTextEn = [entry.question_en, entry.answer_en, entry.follow_up_en, ...(entry.keywords || [])]
    .filter(Boolean)
    .join(" ");

  return {
    ...entry,
    source_url: normaliseUrl(entry.source_url),
    search_text_th: searchTextTh,
    search_text_en: searchTextEn,
    search_terms: tokenise(`${searchTextTh} ${searchTextEn}`),
  };
}

const manualEntries = [
  ...readJson("content/smart-faq-manual.json"),
  ...readJsonIfExists("content/smart-faq-advanced.json"),
  ...readJsonIfExists("content/accounting-faq-research.json"),
  ...readJsonIfExists("content/business-faq-research.json"),
];
const faqEntries = extractFaqEntries();
const serviceEntries = buildServiceEntries();
const blogEntries = buildBlogEntries();
const referenceEntries = buildReferenceEntries();

const entries = [
  ...manualEntries,
  ...faqEntries,
  ...serviceEntries,
  ...blogEntries,
  ...referenceEntries,
]
  .map(withSearchMetadata)
  .filter((entry, index, all) => {
    const key = entry.id || `${entry.type}::${entry.source_url}::${entry.question_th || entry.question_en}`;
    return all.findIndex((candidate) => {
      const candidateKey =
        candidate.id || `${candidate.type}::${candidate.source_url}::${candidate.question_th || candidate.question_en}`;
      return candidateKey === key;
    }) === index;
  });

writeJson("content/smart-faq-kb.json", {
  generatedAt: new Date().toISOString(),
  entryCount: entries.length,
  entries,
});

console.log(
  JSON.stringify(
    {
      output: "content/smart-faq-kb.json",
      entryCount: entries.length,
      categories: [...new Set(entries.map((entry) => entry.category))].sort(),
    },
    null,
    2
  )
);
