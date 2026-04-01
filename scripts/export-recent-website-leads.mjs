import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return index >= 0 ? [line.slice(0, index), line.slice(index + 1)] : [line, ""];
      })
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isRealLead(row) {
  const name = String(row.full_name || "").toLowerCase();
  const email = String(row.email || "").toLowerCase();
  const notes = String(row.notes || "").toLowerCase();

  return !(
    name.includes("test from me") ||
    email === "test" ||
    email === "audit@example.com" ||
    notes.includes("audit") ||
    notes === "test"
  );
}

function formatThaiDate(isoString) {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function buildMarkdown(leads, generatedAt) {
  const lines = ["# Recent Website Leads", "", `Generated: ${generatedAt}`, ""];

  if (leads.length === 0) {
    lines.push("- ยังไม่มีลีดจากหน้าเว็บในตอนนี้");
    return lines.join("\n");
  }

  for (const row of leads) {
    lines.push(
      `- ${row.received_at} | ${row.full_name || "-"} | ${row.phone || "-"} | ${row.email || "-"} | ${row.service || "-"} | ${row.lead_id}`
    );
    if (row.notes) {
      lines.push(`  Notes: ${row.notes}`);
    }
  }

  return lines.join("\n");
}

function buildHtml(leads, generatedAt) {
  const rows =
    leads.length > 0
      ? leads
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(formatThaiDate(row.received_at))}</td>
                <td>${escapeHtml(row.full_name || "-")}</td>
                <td><a href="tel:${escapeHtml(row.phone || "")}">${escapeHtml(row.phone || "-")}</a></td>
                <td><a href="mailto:${escapeHtml(row.email || "")}">${escapeHtml(row.email || "-")}</a></td>
                <td>${escapeHtml(row.service || "-")}</td>
                <td>${escapeHtml(row.preferred_contact || "-")}</td>
                <td>${escapeHtml(row.notes || "-")}</td>
                <td><code>${escapeHtml(row.lead_id || "-")}</code></td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="8" class="empty">ยังไม่มีลีดจากหน้าเว็บในตอนนี้</td></tr>`;

  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pinpoint Lead Report</title>
    <style>
      :root {
        --bg: #f6f1e6;
        --card: #fffdfa;
        --line: #d9c7a2;
        --text: #16315c;
        --muted: #6f6c66;
        --accent: #103a78;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, sans-serif;
        background: linear-gradient(180deg, #f9f5ec 0%, #f1eadb 100%);
        color: var(--text);
      }
      .wrap {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 20px;
        box-shadow: 0 12px 28px rgba(30, 42, 70, 0.08);
        overflow: hidden;
      }
      .head {
        padding: 24px 24px 12px;
        border-bottom: 1px solid rgba(217, 199, 162, 0.55);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 30px;
        line-height: 1.2;
      }
      .meta {
        margin: 0;
        color: var(--muted);
        font-size: 14px;
      }
      .notice {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #fff5db;
        color: #6c4d00;
        font-size: 14px;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 14px 16px;
        vertical-align: top;
        border-bottom: 1px solid rgba(217, 199, 162, 0.45);
        font-size: 14px;
        line-height: 1.5;
      }
      th {
        text-align: left;
        background: rgba(16, 58, 120, 0.04);
        white-space: nowrap;
      }
      td code {
        font-size: 12px;
        color: #704e09;
        background: #fff4d3;
        padding: 3px 6px;
        border-radius: 8px;
      }
      a {
        color: var(--accent);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .empty {
        color: var(--muted);
        text-align: center;
        padding: 26px;
      }
      @media (max-width: 800px) {
        h1 { font-size: 24px; }
        th, td { font-size: 13px; padding: 12px; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <div class="head">
          <h1>Pinpoint Lead Report</h1>
          <p class="meta">อัปเดตล่าสุด: ${escapeHtml(generatedAt)}</p>
          <div class="notice">
            ตอนนี้รายงานนี้เป็นวิธีที่เร็วที่สุดในการดูเบอร์และอีเมลลูกค้าจากหน้าเว็บ
            ระหว่างที่ระบบอีเมลอัตโนมัติของบริษัทกำลังรอการตั้งค่าให้ครบ
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เวลาที่เข้า</th>
                <th>ชื่อลูกค้า</th>
                <th>เบอร์โทร</th>
                <th>อีเมล</th>
                <th>บริการ</th>
                <th>ช่องทางที่ลูกค้าต้องการ</th>
                <th>รายละเอียด</th>
                <th>Lead ID</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

async function main() {
  const envPath = path.resolve(".env.local.txt");
  const env = parseEnvFile(envPath);
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.Supabse_Servicerolekey ||
    env.supabde_servicerole_key ||
    env.SUPABASE_SERVICE_KEY;

  if (!env.SUPABASE_URL || !key) {
    throw new Error("Missing SUPABASE_URL or service role key in .env.local.txt");
  }

  const url = `${env.SUPABASE_URL}/rest/v1/leads?select=lead_id,full_name,phone,email,business,service,preferred_contact,source,notes,received_at&source=eq.website_form&order=received_at.desc&limit=20`;
  const response = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()).filter(isRealLead);
  const generatedAt = new Date().toISOString();
  const outDir = path.resolve("operations", "runtime");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "recent-website-leads.json"), JSON.stringify(data, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "recent-website-leads.md"), buildMarkdown(data, generatedAt), "utf8");
  fs.writeFileSync(path.join(outDir, "recent-website-leads.html"), buildHtml(data, generatedAt), "utf8");

  console.log(
    JSON.stringify(
      {
        count: data.length,
        html: path.join("operations", "runtime", "recent-website-leads.html"),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
