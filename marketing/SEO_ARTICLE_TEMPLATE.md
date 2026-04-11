# Pinpoint SEO Article Template (Team Version)

อัปเดตล่าสุด: 2026-04-09
วิธีใช้: copy ทั้งไฟล์นี้ไปสร้างบทความใหม่ แล้วแทนที่ข้อความในวงเล็บ

---

## 1) Metadata

- Slug: `(example: vat-readiness-before-expansion)`
- Publish Date: `(YYYY-MM-DD)`
- Category TH: `(เช่น บัญชีและภาษี)`
- Category EN: `(เช่น Accounting & Tax)`
- Read Time TH: `(เช่น อ่าน 7 นาที)`
- Read Time EN: `(เช่น 7 min read)`
- Title TH: `(หัวข้อไทย)`
- Title EN: `(English title)`
- Meta Description TH: `(120-160 chars)`
- Meta Description EN: `(120-160 chars)`
- Primary Keyword: `(1 คำหลัก)`
- Secondary Keywords: `(3-5 คำรอง)`
- Target Service URL: `(เช่น /monthly-accounting)`

## 2) Search Intent

- ICP: `(ใครคือคนค้นหาบทความนี้)`
- Problem Stage: `(awareness/consideration/decision)`
- User Question: `(คำถามหลักที่ต้องตอบ)`
- Desired Action: `(อ่านต่อหน้าไหน / กรอกฟอร์ม / ทัก LINE)`

## 3) Article Structure (แนะนำ)

### H1
`(ใช้ Title TH/EN ตามภาษา)`

### Intro (2 ย่อหน้า)
- ย่อหน้า 1: สถานการณ์จริงของเจ้าของธุรกิจ
- ย่อหน้า 2: สรุปว่าบทความนี้จะช่วยตัดสินใจอะไร

### Section 1 (H2)
- หัวข้อ: `(อธิบายภาพรวมและกรอบตัดสินใจ)`
- เนื้อหา 2-3 ย่อหน้า
- Checklist 3 ข้อ

### Section 2 (H2)
- หัวข้อ: `(ขั้นตอน/เอกสาร/timeline)`
- เนื้อหา 2-3 ย่อหน้า
- Checklist 3 ข้อ

### Section 3 (H2)
- หัวข้อ: `(ข้อผิดพลาดที่พบบ่อย + วิธีป้องกัน)`
- เนื้อหา 2-3 ย่อหน้า
- Checklist 3 ข้อ

### FAQ (อย่างน้อย 3 ข้อ)
- Q1: `(คำถามยอดฮิต)`
- A1: `(คำตอบสั้น ชัด มีเงื่อนไข)`
- Q2:
- A2:
- Q3:
- A3:

### Conclusion + CTA
- สรุป actionable 3 ข้อ
- CTA หลัก: ลิงก์ไป target service
- CTA รอง: ลิงก์ไป /faq หรือ /resources

## 4) Internal Link Rules (บังคับ)

ใส่ internal links อย่างน้อย 5 จุด:
- 2 ลิงก์ไปหน้า service ที่เกี่ยวข้อง
- 2 ลิงก์ไปบทความอื่นใน cluster เดียวกัน
- 1 ลิงก์ไป /faq หรือ /resources

ตัวอย่าง anchor text:
- `บริการบัญชีรายเดือน`
- `เช็กลิสต์จดทะเบียนบริษัท`
- `คู่มือ VAT สำหรับธุรกิจโตเร็ว`

## 5) Quality Checklist ก่อน Publish

- [ ] มี Primary keyword ใน title, intro, และอย่างน้อย 1 heading
- [ ] Meta description อ่านรู้เรื่อง ไม่ยัดคีย์เวิร์ด
- [ ] มี official source links อย่างน้อย 2 แหล่ง
- [ ] มีตัวเลข/เงื่อนไข/timeline ที่นำไปใช้ได้จริง
- [ ] มี internal links ครบ 5 จุด
- [ ] มี CTA ชัด 1 primary + 1 secondary
- [ ] ภาษาไทยอ่านธรรมชาติ ไม่แปลตรงตัว

## 6) JSON Ready Block (สำหรับ content/blog-posts.json)

```json
{
  "slug": "(slug)",
  "date": "(YYYY-MM-DD)",
  "category_th": "(category TH)",
  "category_en": "(category EN)",
  "read_time_th": "(read time TH)",
  "read_time_en": "(read time EN)",
  "title_th": "(title TH)",
  "title_en": "(title EN)",
  "description_th": "(meta TH)",
  "description_en": "(meta EN)",
  "summary_th": [
    "(bullet 1)",
    "(bullet 2)",
    "(bullet 3)"
  ],
  "summary_en": [
    "(bullet 1)",
    "(bullet 2)",
    "(bullet 3)"
  ],
  "sections": [
    {
      "heading_th": "(h2 th)",
      "heading_en": "(h2 en)",
      "paragraphs_th": ["(p1)", "(p2)"],
      "paragraphs_en": ["(p1)", "(p2)"],
      "checklist_th": ["(c1)", "(c2)", "(c3)"],
      "checklist_en": ["(c1)", "(c2)", "(c3)"]
    }
  ],
  "sources": [
    {
      "label_th": "(source TH)",
      "label_en": "(source EN)",
      "url": "(https://...)"
    }
  ]
}
```
