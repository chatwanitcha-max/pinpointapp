# Smart FAQ and LINE Conversation Brain

ระบบนี้ทำให้ LINE OA ของ Pinpoint ตอบลูกค้าแบบมีบริบทมากขึ้น โดยไม่ตอบเป็น template ตายตัวอย่างเดียว

## What is included

1. `content/smart-faq-manual.json`
   - ชุดคำถามคำตอบหลักที่เขียนให้ตรงกับบริการจริงของ Pinpoint

2. `content/official-reference-links.json`
   - ลิงก์หน่วยงานทางการที่ควรอ้างอิงเมื่อจำเป็น

3. `scripts/build-smart-faq-kb.mjs`
   - รวม manual FAQ + FAQ page + service pages + blog summaries + official links
   - สร้างฐานความรู้ที่พร้อมให้ระบบค้นหาได้ที่ `content/smart-faq-kb.json`

4. `api/_lib/knowledge-base.js`
   - ค้นหาคำตอบที่เกี่ยวข้องจากฐานความรู้

5. `api/_lib/conversation-memory.js`
   - ดึงประวัติการคุยจาก Supabase table `public.leads`
   - สรุปบริบทที่คุยกันมาก่อน เช่น service bucket, language, company status, nationality, VAT, urgency

6. `api/_lib/line-intelligence.js`
   - ตรวจภาษา TH/EN
   - จับ intent
   - รวม memory + knowledge + next question ให้เป็นข้อความตอบกลับแบบมนุษย์

7. `api/line-webhook.js`
   - ใช้ smart reply engine ตัวใหม่
   - บันทึก `conversationSummary`, `knowledgeMatches`, `replyDraftText`, และ `lineReplyText` ลง Supabase ผ่าน `raw_payload`

## How it grows

ระบบนี้โตต่อได้ 3 ทาง

1. เพิ่มคำถามใหม่ใน `content/smart-faq-manual.json`
2. เพิ่มหน้า service / blog / FAQ ในเว็บ แล้วรัน `node scripts/build-smart-faq-kb.mjs`
3. ต่อ `OPENCLAW_WEBHOOK_URL` ในภายหลัง เพื่อให้ OpenClaw ใช้ memory + knowledge ช่วย draft คำตอบลึกขึ้นอีก

## Current official reference set

- DBD: `https://www.dbd.go.th`
- DBD Biz Regist: `https://edbr.dbd.go.th/`
- DBD e-Service: `https://ebiz.dbd.go.th/eservice-web/`
- Revenue Department: `https://www.rd.go.th`
- RD e-Filing: `https://efiling.rd.go.th`
- Social Security Office: `https://www.sso.go.th`
- Department of Employment: `https://www.doe.go.th`
- e-Workpermit: `https://eworkpermit.doe.go.th/`
- Biz Portal: `https://bizportal.go.th`

## Suggested maintenance

เมื่อมีการอัปเดตเนื้อหาในเว็บ ให้รัน:

```powershell
node scripts/build-smart-faq-kb.mjs
node scripts/check-text-integrity.mjs
```

ถ้าต้องการเช็กตัวอย่างคำตอบ:

```powershell
node scripts/test-smart-line-reply.mjs
```
