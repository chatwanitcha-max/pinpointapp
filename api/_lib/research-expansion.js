const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { toText } = require("./analytics");

function readJsonIfExists(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, ""));
}

function normaliseAlias(value) {
  return toText(value)
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/[!?.,;:()[\]{}<>\"'`~@#$%^&*_+=\\/|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyDraft(value, fallback = "candidate") {
  const normalized = normaliseAlias(value);
  if (!normalized) return fallback;
  const slug = normalized
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

function buildIntentIndexes() {
  const payloads = [
    readJsonIfExists(path.join("content", "accounting-intent-database.json")),
    readJsonIfExists(path.join("content", "business-intent-database.json")),
  ].filter(Boolean);

  const aliasSet = new Set();
  const faqToIntent = new Map();

  for (const payload of payloads) {
    for (const entry of payload.entries || []) {
      for (const alias of entry.aliases || []) {
        const normalized = normaliseAlias(alias);
        if (normalized) aliasSet.add(normalized);
      }

      for (const faqId of entry.faqIds || []) {
        faqToIntent.set(toText(faqId), {
          intentId: toText(entry.id),
          subIntentKey: toText(entry.subIntentKey),
          intentKey: toText(entry.intentKey),
          serviceBucket: toText(entry.serviceBucket),
          officialSourceUrls: Array.isArray(entry.officialSourceUrls)
            ? entry.officialSourceUrls
            : [],
        });
      }
    }
  }

  return { aliasSet, faqToIntent };
}

function buildReviewReason(entry) {
  const hasMatches = Array.isArray(entry.topMatchIds) && entry.topMatchIds.length > 0;
  if (!hasMatches && Number(entry.needsReviewCount || 0) > 0) {
    return "unmatched_and_low_confidence";
  }
  if (!hasMatches) return "unmatched_question";
  if (Number(entry.needsReviewCount || 0) > 0) return "low_confidence_match";
  return "coverage_gap";
}

function isPhoneLike(value) {
  const compact = toText(value).replace(/\s+/g, "");
  return /^[+()\-0-9]{7,}$/.test(compact) && /\d{7,}/.test(compact);
}

function hasBusinessSignal(normalizedQuestion) {
  return /(บัญชี|ภาษี|vat|ภ\.?พ\.?30|ภ\.?พ\.?36|ภงด|หัก\s*ณ\s*ที่จ่าย|ปิดงบ|สรรพากร|บริษัท|จด|จดทะเบียน|dbd|นิติบุคคล|กรรมการ|เพิ่มทุน|ย้ายที่ตั้ง|visa|work permit|permit|license|licen[sc]e|ใบอนุญาต|ประกันสังคม|payroll|เงินเดือน|social security|เอกสาร|งบ|ผู้ถือหุ้น|ต่างชาติ|เลิกบริษัท|ปิดบริษัท|ชำระบัญชี|audit|ร้านอาหาร|restaurant|คาเฟ่|cafe|อาหารและเครื่องดื่ม)/i.test(
    normalizedQuestion
  );
}

function isNoiseQuestion(question, normalizedQuestion) {
  const rawExample = toText(question.exampleQuestion);
  const normalized = normalizedQuestion || normaliseAlias(rawExample);
  const topMatchIds = Array.isArray(question.topMatchIds) ? question.topMatchIds : [];

  if (!normalized) return true;
  if (normalized.length < 3) return true;
  if (isPhoneLike(rawExample) || isPhoneLike(normalized)) return true;
  if (/^(hi|hello|hey|new chat|reset|start over)$/i.test(normalized)) return true;
  if (/^(สวัสดี|สวัสดีครับ|สวัสดีค่ะ|เริ่มใหม่|ขอเริ่มใหม่|อีกเรื่อง|สนใจบริการ|หิวข้าว|มั่วละ)$/i.test(normalized)) {
    return true;
  }

  const isGeneralOnly =
    toText(question.serviceBucket) === "general" &&
    toText(question.intentKey) === "general" &&
    topMatchIds.length === 0;

  if (isGeneralOnly && !hasBusinessSignal(normalized)) return true;

  return false;
}

function inferDraftIntent(entry, primaryIntent) {
  return (
    toText(primaryIntent?.intentKey) ||
    toText(entry.intentKey) ||
    (toText(entry.serviceBucket) === "pricing" ? "pricing" : "general")
  );
}

function inferDraftServiceBucket(entry, primaryIntent) {
  return (
    toText(primaryIntent?.serviceBucket) ||
    toText(entry.serviceBucket) ||
    "general"
  );
}

function buildResearchExpansionArtifacts(report) {
  const indexes = buildIntentIndexes();
  const topQuestions = Array.isArray(report?.topQuestions) ? report.topQuestions : [];
  const faqCandidates = [];
  const intentCandidates = [];
  const seenFaqCandidates = new Set();
  const seenIntentCandidates = new Set();

  for (const question of topQuestions) {
    const normalizedQuestion =
      normaliseAlias(question.normalizedQuestion) ||
      normaliseAlias(question.exampleQuestion);
    if (!normalizedQuestion) continue;
    if (isNoiseQuestion(question, normalizedQuestion)) continue;

    const topMatchIds = Array.isArray(question.topMatchIds) ? question.topMatchIds : [];
    const primaryIntent = topMatchIds
      .map((faqId) => indexes.faqToIntent.get(toText(faqId)))
      .find(Boolean);
    const draftIntentKey = inferDraftIntent(question, primaryIntent);
    const draftServiceBucket = inferDraftServiceBucket(question, primaryIntent);
    const needsReview = Number(question.needsReviewCount || 0) > 0 || !topMatchIds.length;

    if (needsReview) {
      const faqKey = `${draftServiceBucket}::${normalizedQuestion}`;
      if (!seenFaqCandidates.has(faqKey)) {
        seenFaqCandidates.add(faqKey);
        faqCandidates.push({
          candidateId: `faq-${slugifyDraft(question.exampleQuestion, draftServiceBucket)}`,
          reviewReason: buildReviewReason(question),
          askCount: Number(question.askCount || 0),
          needsReviewCount: Number(question.needsReviewCount || 0),
          latestAt: toText(question.latestAt),
          latestLeadId: toText(question.latestLeadId),
          serviceBucket: draftServiceBucket,
          intentKey: draftIntentKey,
          normalizedQuestion,
          exampleQuestion: toText(question.exampleQuestion),
          topMatchIds,
          suggestedQuestionTh:
            toText(question.language) === "th" ? toText(question.exampleQuestion) : "",
          suggestedQuestionEn:
            toText(question.language) === "en" ? toText(question.exampleQuestion) : "",
          draftAnswerNotes:
            "Use this real customer question to create a reviewed FAQ answer, add official links if needed, and confirm whether the current playbook is sufficient.",
        });
      }
    }

    if (primaryIntent && !indexes.aliasSet.has(normalizedQuestion)) {
      const intentKey = `${toText(primaryIntent.intentId)}::${normalizedQuestion}`;
      if (!seenIntentCandidates.has(intentKey)) {
        seenIntentCandidates.add(intentKey);
        intentCandidates.push({
          candidateId: `intent-${slugifyDraft(question.exampleQuestion, toText(primaryIntent.subIntentKey) || "intent")}`,
          targetIntentId: toText(primaryIntent.intentId),
          targetSubIntentKey: toText(primaryIntent.subIntentKey),
          targetIntentKey: toText(primaryIntent.intentKey),
          targetServiceBucket: toText(primaryIntent.serviceBucket),
          normalizedAlias: normalizedQuestion,
          suggestedAlias: toText(question.exampleQuestion),
          askCount: Number(question.askCount || 0),
          needsReviewCount: Number(question.needsReviewCount || 0),
          supportingFaqIds: topMatchIds,
          latestAt: toText(question.latestAt),
          latestLeadId: toText(question.latestLeadId),
          officialSourceUrls: primaryIntent.officialSourceUrls || [],
        });
      }
    }
  }

  const byServiceBucket = report?.byServiceBucket || {};
  const recommendedActions = [];
  if (faqCandidates.length > 0) {
    recommendedActions.push(
      "Review faq-expansion-candidates.json and convert the highest-frequency questions into approved Smart FAQ entries."
    );
  }
  if (intentCandidates.length > 0) {
    recommendedActions.push(
      "Review intent-expansion-candidates.json and add validated aliases to the intent database to improve matching."
    );
  }
  if (Object.keys(byServiceBucket).length > 0) {
    const hotBucket = Object.entries(byServiceBucket).sort((a, b) => b[1] - a[1])[0];
    if (hotBucket) {
      recommendedActions.push(
        `Prioritise new FAQ/playbook coverage for ${hotBucket[0]} because it currently has the highest recent question volume.`
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceDigestGeneratedAt: toText(report?.generatedAt),
    sourceTotals: {
      totalMessages: Number(report?.totalMessages || 0),
      uniqueQuestions: Number(report?.uniqueQuestions || 0),
      reviewCandidates: Number(report?.reviewCandidates || 0),
    },
    byServiceBucket,
    summary: {
      faqCandidateCount: faqCandidates.length,
      intentCandidateCount: intentCandidates.length,
    },
    faqCandidates,
    intentCandidates,
    recommendedActions,
  };
}

function saveResearchExpansionRuntime(artifacts) {
  const runtimeCandidates = [
    path.join(process.cwd(), "operations", "runtime"),
    path.join(os.tmpdir(), "pinpoint-runtime"),
  ];

  for (const runtimeDir of runtimeCandidates) {
    try {
      fs.mkdirSync(runtimeDir, { recursive: true });

      const reportPath = path.join(runtimeDir, "research-expansion-report.json");
      const faqPath = path.join(runtimeDir, "faq-expansion-candidates.json");
      const intentPath = path.join(runtimeDir, "intent-expansion-candidates.json");

      fs.writeFileSync(reportPath, JSON.stringify(artifacts, null, 2) + "\n", "utf8");
      fs.writeFileSync(
        faqPath,
        JSON.stringify(
          {
            generatedAt: artifacts.generatedAt,
            sourceDigestGeneratedAt: artifacts.sourceDigestGeneratedAt,
            items: artifacts.faqCandidates,
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
      fs.writeFileSync(
        intentPath,
        JSON.stringify(
          {
            generatedAt: artifacts.generatedAt,
            sourceDigestGeneratedAt: artifacts.sourceDigestGeneratedAt,
            items: artifacts.intentCandidates,
          },
          null,
          2
        ) + "\n",
        "utf8"
      );

      return {
        reportPath,
        faqPath,
        intentPath,
      };
    } catch {
      continue;
    }
  }

  return {
    reportPath: "",
    faqPath: "",
    intentPath: "",
  };
}

module.exports = {
  buildResearchExpansionArtifacts,
  saveResearchExpansionRuntime,
};
