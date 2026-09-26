# Monthly Report — Local Implementation Review

วันที่ตรวจ: 21 กันยายน 2569

## Git และการรักษางานเดิม

- ก่อนแก้: branch `main`, HEAD `46a3c8a`; `origin/main` = `46a3c8a`; `origin/master` = `d393a4f`.
- ไม่มี tracked/staged diff ก่อนเริ่ม มี `.firebaserc` เป็น untracked ซึ่งรักษาไว้โดยไม่แก้ไข.
- หลังแก้: branch และ HEAD เดิม งานรอบนี้ยังอยู่ใน working tree.
- ไม่ reset, clean, checkout ทับงานเดิม, merge, rebase, commit, push หรือ deploy.

## Architecture

ก่อนแก้: หน้า MonthlyReportsView กรอง Submission/Appointment/FieldTrip แยกกัน มีสถิตินักเรียนและนับโรงเรียนด้วยชื่อ ส่วน Excel คำนวณข้อมูลอีกชุดหนึ่ง.

หลังแก้:

`documentSubmissions + fieldTrips + schools → buildMonthlyReportRows → filterMonthlyReportRows → calculateMonthlyReportSummary → Web / Print / Excel`

- Report model เป็น pure derived data ไม่มี collection ใหม่ ไม่มีการเขียนข้อมูลกลับ.
- App ส่ง raw submissions/fieldTrips เดิมเข้า report ไม่ส่ง appointments เข้ารายงาน.
- หนึ่ง FieldTrip หลายโรงเรียนถูกแยกเป็นหลายแถว โดย sourceId ยังเป็นทริปเดิม.
- มีตัวกรองเดือน ปี พ.ศ. สาย และประเภทงาน; ทุกช่องทางส่งออกใช้ dataset ที่ผ่านตัวกรองเดียวกัน.
- แยก Detail Modal เดิมจาก SubmissionsView และ FieldTripsView เป็น component ที่ทั้งหน้าเดิมและรายงานใช้ร่วมกัน.
- คลิกแถว/แตะการ์ด/Enter/Space เปิด sourceType + sourceId ตรงรายการจริง; ปิดแล้วกลับตำแหน่งเดิมในรายงาน.
- รูปและข้อมูลต้นทางอื่นอยู่ใน Source Detail เท่านั้น ไม่มีใน report dataset/ตาราง/Excel/PDF.
- Print ใช้ document แยกที่ derive จาก dataset เดียวกัน ซ่อน navigation, modal และปุ่มทั้งหมด; A4 landscape มีหัวตารางซ้ำเมื่อแบ่งหน้า.

## Files changed

ไฟล์เดิม:

- `package.json` — เพิ่มชุด unit tests รายงาน.
- `src/App.tsx` — เอา appointment prop ออกจากรายงาน.
- `src/components/reports/MonthlyReportsView.tsx` — หน้ารายงานใหม่ ตัวกรอง ยอดสรุป เปิดต้นทาง และ print document.
- `src/components/submissions/SubmissionsView.tsx` — reuse SubmissionDetailModal.
- `src/components/trips/FieldTripsView.tsx` — reuse FieldTripDetailModal.

ไฟล์ใหม่:

- `src/utils/monthlyReport.ts` — dataset, date/school/personnel resolution, filtering, counting และ source lookup.
- `src/utils/monthlyReportExport.ts` — workbook จาก dataset เดียวกับ UI.
- `src/components/reports/monthlyReports.css` — responsive และ print layout.
- `src/components/submissions/SubmissionDetailModal.tsx` — detail เดิมที่แยกเพื่อใช้ร่วมกัน.
- `src/components/trips/FieldTripDetailModal.tsx` — detail เดิมที่แยกเพื่อใช้ร่วมกัน และแสดงรถ/ผู้รับผิดชอบ.
- `tests/monthlyReport.test.ts` — 36 cases ครอบคลุม requirement และ edge cases.
- `tests/browser/monthly-report.html`, `monthly-report.tsx`, `monthly-report-qa.cjs` — local synthetic fixture และ browser QA.
- `docs/qa-monthly-report/` — ภาพตัวอย่าง ผล QA และไฟล์ export จากข้อมูลสมมติ.
- เอกสารฉบับนี้.

ไม่มีการเปลี่ยน Firebase schema, database services, vehicle defaults, personnel selector, Gallery, Calendar หรือ Dashboard. Legacy export helper เดิมยังอยู่เพื่อ compatibility แต่หน้า Monthly Report ใหม่ไม่ได้เรียกใช้.

## การนับและข้อมูลประวัติ

| รายการ | กติกา |
| --- | --- |
| ยื่นหนังสือ | จำนวน unique Submission sourceId; โรงเรียนเดิมยื่นสองครั้ง = 2 รายการ |
| ออกแนะแนว | จำนวน unique FieldTrip sourceId; ทริปหนึ่งไปสามโรงเรียน = 1 ทริป |
| โรงเรียนออกแนะแนว | unique resolved school document ID ใน Guidance rows |
| โรงเรียนไม่ซ้ำรวม | union ของ school document ID จากทั้งสองประเภท |
| ผู้รับผิดชอบ | ชื่อที่บันทึกจริงทุกคน; dedupe stable ID เมื่อมี หรือ exact verified aliases เท่านั้น |

ตัวอย่าง QA: Submission 3 รายการ + FieldTrip 1 ทริปไป 3 โรงเรียน = 6 แถว, ยื่นหนังสือ 3, ออกแนะแนว 1, โรงเรียนออกแนะแนว 3, โรงเรียนไม่ซ้ำรวม 3. ยอดนี้ตรงทั้ง UI และ Excel ที่ดาวน์โหลดจริง.

ข้อยืนยัน:

- ไม่ใช้จำนวนนักเรียนในรายงาน/ยอดสรุป/Excel/Print. ข้อมูลนักเรียนใน source ไม่ถูกลบหรือแก้.
- ไม่ฝังรูปหรือ URL รูปลงรายงานและ Excel; ไม่ย้าย คัดลอก หรือลบรูป.
- Appointment COMPLETED อย่างเดียวไม่สร้างผลงานในรายงาน; ต้องมี FieldTrip จริง.
- รถใช้ vehicleName ที่บันทึกจริงเท่านั้น ไม่มีการเติม default หรือแก้ทะเบียน.
- ผู้รับผิดชอบใช้ชื่อเดิม ไม่มีการเติมผู้ยื่นย้อนหลังจากสายหรือบัญชีปัจจุบัน.
- submittedById ใน save flow ปัจจุบันหมายถึงผู้บันทึก จึงไม่ถือว่าเป็น ID ของทุกคนใน submittedByNames.
- school resolver ใช้ exact document ID แล้ว exact UNIQUE legacy code; ไม่ใช้ fuzzy name matching.
- ชื่อโรงเรียนแบบสั้นเป็น display only; ไม่เปลี่ยนต้นทาง.

## ข้อมูลเก่าที่ต้องแสดงข้อจำกัดอย่างตรงไปตรงมา

- ถ้า school relation resolve ไม่ได้: ยังแสดงชื่อที่บันทึกเดิมและรายการงาน แต่ไม่เดารวมกับโรงเรียนชื่อคล้ายกัน. จำนวนโรงเรียนไม่ซ้ำนับเฉพาะที่ยืนยันได้ พร้อมข้อความแจ้งจำนวนแถวที่ยังยืนยันไม่ได้ ทั้ง Web/Print/Excel.
- ไม่มีสาย: แสดงและกรอง “ไม่ระบุสาย”; ไม่เดาจากชื่อบุคลากร.
- ไม่มีรถหรือชื่อบุคลากร: แสดง “ไม่ระบุ”.
- วันที่ไม่ถูกต้อง/ไม่มี sourceId/ทริปไม่มีโรงเรียน: ไม่นำเข้าตารางและแสดง warning. Warning ตรวจทุกเดือนของสายและประเภทงานที่เลือก เพราะรายการที่ไม่มีวันที่ไม่สามารถระบุเดือนได้.
- การทดสอบ browser ใช้ข้อมูลสมมติและ shell ขนาด sidebar ตามแอป ไม่ใช่การยืนยันข้อมูลจริงหลัง login หรือทดสอบระบบ production ทั้งระบบ.

## Quality gates และ Local QA

- `npm run lint`: PASS.
- `npm test`: PASS — 305 Vitest tests (เพิ่มใหม่ 36) และ Functions 8 tests.
- `npm run build`: PASS; มีคำเตือน bundle ใหญ่กว่า 500 kB.
- 1366×768: PASS — 6 คอลัมน์ ไม่มี horizontal overflow.
- 1920×1080: PASS.
- Mobile 390×844: PASS — แตะการ์ดเปิดต้นทางได้.
- ตัวกรองเดือน/ปี/สาย 1/สาย 2/ทุกสาย/ประเภทงาน/เดือนว่าง: PASS.
- Submission Detail และ Guidance Detail: PASS รวมเปิดรูปต้นทาง.
- Keyboard Enter/Space, Escape, การคืน focus: เปิด/ปิดผ่าน; มี focus containment ในรายงาน.
- Print: PASS — ตรวจภาพ render ของ A4 landscape จริง; ตัวอย่าง 6 แถว 1 หน้า และ 46 แถว 4 หน้า หัวตารางซ้ำ ไม่มีแถวขาดกลางหน้า ไม่มีรูป/จำนวนนักเรียน/technical IDs.
- Excel: PASS — ดาวน์โหลดจริง อ่าน workbook ย้อนกลับ ตรวจจำนวนแถว 6 และ summary [3, 1, 3, 3]. ไม่ได้เปิดตรวจใน Microsoft Excel desktop.
- Browser page/console errors = 0. Fixture ไม่มี Firebase/Auth imports และปิดกั้น request ที่ไม่ใช่ localhost.

เปิด preview สมมติในเครื่อง: `http://127.0.0.1:3011/tests/browser/monthly-report.html` เมื่อ dev server port 3011 ทำงาน.

## Mutation counters (รอบงานนี้)

```text
PRODUCTION FIRESTORE WRITES = 0
PRODUCTION STORAGE WRITES = 0
AUTH CHANGES = 0
MIGRATION = 0
RECORD DELETIONS = 0
PHOTO DELETIONS = 0
COMMIT = 0
PUSH = 0
DEPLOYMENT = 0
```

MONTHLY REPORT LOCAL IMPLEMENTATION COMPLETE

SOURCE DATA PRESERVED

NO PRODUCTION MUTATION

WAITING FOR USER REVIEW

## ปรับตามคำขอล่าสุด 22 กันยายน 2569
Print/PDF เหลือเฉพาะหัวข้อเดือน/ปีและตาราง 6 คอลัมน์ตามภาพตัวอย่าง ไม่มีสรุปท้ายรายงาน ข้อความแนะนำ หรือส่วนอื่น ส่วนหน้าเว็บและ Excel ยังคงสรุปยอดตามเดิม


## School workflow status fix — 22 กันยายน 2569
Timeline และ Dashboard ใช้ getSchoolWorkflow ร่วมกัน รองรับ exact document ID, unique legacy code และ source relations ทั้งทิศทางตรง/ย้อนกลับ ไม่จับคู่ด้วยชื่อ ไม่ถือรูปหรือข้อความหมายเหตุเป็นหลักฐานจบงาน แยกสถานะยกเลิก และแสดง provenance ของ legacy completion โดยไม่สร้าง FieldTrip ย้อนหลัง
เพิ่ม tests/schoolWorkflowStatus.test.ts 17 cases; รวม 322 Vitest + 8 Functions ผ่าน; lint/build ผ่าน; browser local ตรวจการอัปเดตเมื่อข้อมูลทริปเปลี่ยน, legacy completed appointment และ cancellation ผ่าน
ไฟล์แก้เพิ่ม: src/utils/schoolStatus.ts, SchoolDetailModal.tsx, SchoolsView.tsx, DashboardView.tsx, package.json และ local fixture tests/browser/school-workflow.*. ไม่เขียน Production ไม่ commit/push/deploy. รายการที่ไม่มี stable relation ไม่ถูกเดาเชื่อมโยงด้วยชื่อ


## Local data completeness review — 2026-09-22
- Schools page now includes a searchable review panel covering schools, submissions, appointments and field trips. Missing fields and broken references are listed separately, with entry points to edit the original record.
- Firestore reads no longer exclude records missing the ordered date/name field. Document IDs take precedence over an embedded legacy `id`. Read adapters leave unknown facts blank.
- Review stays pending until all four collections load. No data migrations or production writes were performed.
- School contacts can be copied from a dated submission with an exact school relationship and compatible contact name into the school edit form; saving remains explicit.
- Historical appointment/trip edits preserve recorded vehicles and leave missing times blank. Missing submission personnel are not filled using current team defaults.
- Global source editing updates existing IDs, including appointment edits opened from detail views.
- Verification: TypeScript passed; 332 Vitest tests plus 8 Functions tests passed; production build passed (existing large-bundle warning). Local browser fixture verified mobile filtering, search, exact source target and no page errors. Screenshot: `qa-monthly-report/data-review-mobile.png`.
- Limitations: this is structural completeness checking, not verification of phone ownership or photo contents/availability. Actual missing facts require real information. No live database completeness count was independently verified. No commit, push or deployment.
- Preview: http://localhost:3000/ → school information → expand the data review panel.

Follow-up: Historical school edits now preserve blank province, district and education level instead of inserting new-school defaults. Province/district selectors show explicit empty placeholders. TypeScript and all 340 tests passed again. Local server responds HTTP 200.

## Readiness follow-up — legacy school identity
- Existing submission, appointment and field-trip edit forms now resolve exact unique legacy school codes to the current document ID before displaying selected schools. Unknown or ambiguous codes are never matched by school name.
- Opening appointment creation from a school also finds submissions stored using that school's unique legacy code.
- Restarted the local Vite server at port 3000 after detecting it had stopped.
- Verification: TypeScript passed; 332 Vitest + 8 Functions tests passed. Browser test `node tests/browser/school-edit-qa.cjs` passed on a 390px mobile viewport: missing historical fields remain blank, save is reachable, existing contact data preserved, local mocked save succeeds. No database writes during this QA.
- This verification uses local fixtures. Missing real-world information and unresolved ambiguous relationships still require an authorized user to supply or confirm facts; no production deployment performed.

## School timeline guidance result correction — 2026-09-22
The guidance list already displayed completed appointments as historical guidance results, while the school timeline only read field-trip records. Both displays now share `getGuidanceResults`. Step 4 shows the same recorded date, responsible teacher, vehicle, result and guidance photos, with a button opening the existing result detail modal and full-size photos. No new database records are created.
Deduplication prefers appointment/submission references and exact resolved school/date. No school-name guessing and no letter photos reused as guidance evidence. Monthly-report source rules remain unchanged.
Validation: TypeScript passed; 339 Vitest + 8 Functions tests passed. `node tests/browser/school-linked-guidance-qa.cjs` verified the completed-appointment result in the school timeline, its vehicle/summary, photo detail opening and no browser page errors. Screenshot: `qa-monthly-report/school-linked-guidance.png`. Tests used local fixtures; no production writes or deployment.

## Per-letter workflow status — 2026-09-22
- Submission desktop/mobile badges now derive current progress from explicit submission/appointment/result references: waiting, appointed (date/time), or guidance completed (open result/photos).
- Completed legacy appointments are supported through the shared guidance projection. Same-school and same-date matches alone do not promote another letter's status. Conflicting explicit letter references and cancelled appointments are excluded.
- Historical submission fields and evidence are preserved; display-only calculation, no production writes.
- Verification: TypeScript passed, 349 Vitest + 8 Functions tests passed, including 10 per-letter linkage cases. No deployment.

## Status and note wording consistency
- Submission table, mobile cards and detail modal share the per-letter display status and note. A blank note displays รอนัดหมาย only while the letter is waiting; existing notes are preserved.
- Submission badge no longer wraps across two lines. School stored-status labels and Excel DOCUMENT_SUBMITTED label use ยื่นหนังสือแล้ว without the waiting suffix.
- No bulk database updates. Existing nonempty notes remain unchanged. TypeScript and 349 Vitest + 8 Functions tests passed.
## School Detail workflow hub — local implementation

- Branch / HEAD: `main` / `46a3c8a68504be8a4e13cd64b2ae5491623fdd49`.
- The pre-change dirty-worktree snapshot is preserved at `docs/qa-school-hub/git-status-before.txt`. Existing uncommitted work and `.firebaserc` were preserved.
- School Detail derives from the four realtime arrays already loaded by `App.tsx`; it performs no additional Firestore reads.
- Stable relationship priority is exact Firestore school document ID, then exact unique legacy school code through `resolveSchoolRelation`. Stored names are display-only fallbacks; no fuzzy or partial school-name relation is used.
- Current Timeline uses the newest connected workflow component through explicit `submissionId`, `appointmentId`, `fieldTripId`, and stable school membership. A newer unlinked submission starts a new current cycle instead of inheriting an older completion.
- Activity History includes all matching submissions, appointments and guidance results, sorted newest to oldest. Each item retains its real source type and source ID and opens the existing source detail UI.
- Multi-school FieldTrips appear in every member school's history with the same FieldTrip source ID; no database copies are created.
- Source displays use stored personnel and vehicles. Missing historical vehicles display `ไม่ระบุ`; current defaults are not backfilled. All stored submitters are displayed without `+1` summaries.
- Submission evidence, appointment legacy evidence and guidance photos retain their source and URL. No image is copied, moved, uploaded, deleted, or relabeled as another source.
- School Detail, Dashboard, and Monthly Report now share the stable school resolver. Monthly Report and School History open the same source IDs.
- Appointment detail removed school-name fallback association and external archive lookup. Linked submissions are resolved only by explicit record references; counselor identity uses exact user ID only.
- Action buttons follow the current workflow: first letter, new letter cycle, create appointment only when appropriate, open an existing active appointment, or open the completed guidance result.
- Limitation: when legacy records have no explicit cycle relation, they remain visible in Activity History but are not guessed into one cycle by name or date.

Local QA:

- `1366x768`: passed; screenshot `docs/qa-school-hub/1366.png`.
- `1920x1080`: passed; screenshot `docs/qa-school-hub/1920.png`.
- `390x844`: passed; screenshot `docs/qa-school-hub/mobile.png`.
- Timeline, full history, multiple cycles, existing-appointment action, keyboard Enter/Space, close/focus return, Submission detail, Appointment detail, Guidance detail, and Monthly Report source parity: passed.
- External network requests during isolated browser QA: 0. Browser page errors: 0.

Mutation counters:

- PRODUCTION FIRESTORE WRITES = 0
- PRODUCTION STORAGE WRITES = 0
- AUTH CHANGES = 0
- MIGRATION = 0
- RECORD DELETIONS = 0
- PHOTO DELETIONS = 0
- COMMIT = 0
- PUSH = 0
- DEPLOYMENT = 0

SCHOOL DETAIL HUB LOCAL IMPLEMENTATION COMPLETE  
WORKFLOW SOURCES REMAIN SOURCE OF TRUTH  
NO PRODUCTION DATA MUTATION  
WAITING FOR USER REVIEW
