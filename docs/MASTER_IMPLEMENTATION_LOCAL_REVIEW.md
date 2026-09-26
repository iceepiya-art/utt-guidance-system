# Master implementation — local review

วันที่ตรวจเสร็จ: 23 กันยายน 2569

## 1–2. Git ก่อนแก้ / branch / HEAD

Branch: `main`

HEAD: `46a3c8a68504be8a4e13cd64b2ae5491623fdd49`

ก่อนเริ่ม master request มี tracked modifications 16 ไฟล์: package.json, App.tsx, AppointmentDetailModal, AppointmentFormModal, DashboardView, MonthlyReportsView, SchoolDetailModal, SchoolFormModal, SchoolsView, SubmissionFormModal, SubmissionsView, FieldTripFormModal, FieldTripsView, excelExport, schoolStatus, submissionUtils

มี untracked งานเดิม: `.firebaserc`, เอกสาร Monthly Report/Timeline, QA directories, report CSS, DataReviewPanel, SchoolTimelineStep, SubmissionDetailModal, FieldTripDetailModal, helpers dataCompleteness/guidanceResults/monthlyReport/monthlyReportExport/schoolActivityHistory/schoolWorkflowCycle/sourceRecords/submissionWorkflow และ tests/browser กับ tests ที่เกี่ยวข้อง

เก็บงานเดิมทั้งหมดไว้ ไม่ reset/checkout/commit และไม่แก้ `.firebaserc` ตัวเลข git diff เทียบ HEAD จึงรวมงานก่อนรอบนี้ด้วย

## 3. สาเหตุที่พบ

- Dashboard นับ submitted จากสถานะที่ไม่ใช่ NOT_STARTED/CANCELLED จึงไม่พิสูจน์ว่ามีหนังสือแนะแนวจริง และผสมยอดสะสมกับสถานะล่าสุด
- กิจกรรมอื่นที่ใหม่กว่าอาจกลายเป็นรอบแนะแนวล่าสุด
- หน้านัดหมายจับคู่ข้อมูลติดต่อจากชื่อโรงเรียน และใช้รถจากหนังสือแทนค่าที่นัดหมายเก็บไว้
- หน้ายื่นหนังสือแสดงสถานะข้ามขั้นและใช้หมายเหตุเริ่มต้นรอนัดหมาย ซึ่งไม่ตรงข้อความใน master request
- Gallery ผูกทริปหลายโรงเรียนกับโรงเรียนแรก และตัด URL ซ้ำข้าม source จนหลักฐานของอีก source หายจากมุมมอง
- รายงานเลือกชื่อโรงเรียนปัจจุบันก่อนชื่อในประวัติ; หน้ายื่นหนังสือใช้ตัวช่วยจับคู่ชื่อบุคลากรกับรายชื่อปัจจุบัน

## 4–5. ไฟล์และ shared helpers ที่แก้ในรอบ master

- `src/utils/schoolStatus.ts`: แยก guidance submissions ออกจาก other activity สำหรับรอบปัจจุบัน; สถานะสุดท้ายใช้แนะแนวเรียบร้อยแล้ว; ไม่ใช้ school.currentStatus เก่าแทน source ที่ไม่มี
- `src/utils/dashboardSummary.ts` (ใหม่): ยอดสะสมและ pending ปัจจุบันจาก getSchoolWorkflow
- `src/utils/submissionUtils.ts`, `submissionWorkflow.ts`: badge ปกติ/หมายเหตุและประเภทกิจกรรม
- `src/utils/schoolActivityHistory.ts`: ชื่อกิจกรรมจริงในรายการเลือกขั้น 2
- `src/utils/gallerySources.ts` (ใหม่): รูปพร้อม source ID และ school membership ที่ resolve ได้จริง
- `src/utils/monthlyReport.ts`: ชื่อโรงเรียนตามประวัติก่อน, route label, ชื่อกิจกรรมอื่น
- `src/App.tsx`: เปิดสร้างนัดหมายจากหนังสือในรอบแนะแนวปัจจุบันและตรวจรายการที่มีนัดแล้ว
- `src/components/schools/SchoolDetailModal.tsx`
- `src/components/dashboard/DashboardView.tsx`
- `src/components/submissions/SubmissionsView.tsx`, `SubmissionDetailModal.tsx`, `SubmissionFormModal.tsx`, `SubmissionImportModal.tsx`
- `src/components/appointments/AppointmentsView.tsx`, `AppointmentImportModal.tsx`
- `src/components/trips/FieldTripsView.tsx`
- `src/components/gallery/ActivityGalleryView.tsx`
- `package.json`, `tests/masterWorkflow.test.ts`, `tests/submissionUIConsistency.test.ts`, `tests/submissionWorkflow.test.ts`, `tests/browser/school-hub.tsx`, `tests/browser/school-timeline-qa.cjs`
- เอกสารฉบับนี้และภาพ QA timeline ทั้งสามขนาด

## 6. School Detail

คง Timeline 4 ขั้น ไม่มี Activity History section ซ้ำ ขั้น 2 เข้าถึงหนังสือทุกกิจกรรม ขั้น 3 เปิด Appointment จริง ขั้น 4 เปิด FieldTrip จริง

หนึ่งรายการเปิดตรง; หลายรายการมีตัวเลือกย้อนหลังเรียงวันที่ เปิดด้วย source ID รองรับ keyboard และคืน focus เมื่อปิด หลักฐานอยู่ใน Source Detail ไม่มีการ copy ไปเก็บในโรงเรียน

Other activity ยังปรากฏขั้น 2 แต่ไม่เริ่มรอบแนะแนวใหม่ สถานะสุดท้ายคือ “แนะแนวเรียบร้อยแล้ว” เมื่อมีผลจริงในรอบปัจจุบัน หนังสือแนะแนวรอบใหม่เปลี่ยนสถานะรอบปัจจุบันได้โดยรักษาประวัติเก่า

ปุ่มนัดหมายเปิดรายการเดิมเมื่อมีอยู่ รวมถึง completed appointment ที่ยังไม่มีผลจริง ปุ่มยื่นหนังสือรอบใหม่ยังเปิดสร้างรายการใหม่

## 7. Submission status / note

หนังสือแนะแนวปกติแสดง badge “ยื่นหนังสือแล้ว” ตาม master request แม้มีรายการนัดหมายหรือผลที่เชื่อมแล้ว ส่วนลิงก์ไป source เหล่านั้นยังใช้งานได้

หมายเหตุที่ว่างหรือเป็นข้อความทั่วไป “ยื่นหนังสือแนะแนว / ยื่นหนังสือ / รอนัดหมาย” แสดง “รอติดต่อกลับ” โดยไม่เขียนทับ source เดิม หมายเหตุเฉพาะที่ผู้ใช้เขียนเองยังแสดงตามเดิม กรณี CALL_LATER/NOT_READY รักษาความหมายไว้ในหมายเหตุ กิจกรรมอื่นใช้ activity/note จริง

ฟอร์มรายการใหม่ใช้ค่าเริ่มต้นรอติดต่อกลับและแก้ไขได้

## 8. Appointment / Calendar

Appointment Detail ที่ทำไว้ก่อนหน้าแสดงข้อมูลนัดหมาย ไม่มี gallery หรือผลแนะแนวปะปน ทบทวนและรักษาพฤติกรรมนี้ไว้ รอบนี้เอาการจับคู่ด้วยชื่อออกจาก AppointmentsView ใช้ exact source reference และ school resolver; รถใช้ค่าของ Appointment เท่านั้น จำนวนรูปไม่ดึงรูปหนังสือมาแทน

Calendar ยังคงใช้ Appointment เดิมและ source ID เดิม ตรวจ source พบใช้ safe time formatter และรถที่บันทึกไว้ ไม่สร้างผลแนะแนวจาก Calendar

createAppointment guard เดิมยังอยู่ ตรวจ submissionId ก่อนสร้าง ไม่ได้ bypass และไม่ได้เรียกเขียนข้อมูลจริงในการทดสอบ

## 9. FieldTrip / Guidance

ใช้ getGuidanceResults ที่คืนเฉพาะ FieldTrip จริง ไม่มี synthetic completed_appt record ขั้น 4 ไม่ complete จาก Appointment.COMPLETED เพียงอย่างเดียว รายชื่อผู้รับผิดชอบใน detail ใช้รายการที่เก็บไว้ครบผ่าน shared formatter

## 10. Dashboard — audit และผลกระทบ

ก่อนแก้: submitted คือสถานะที่ไม่ใช่ NOT_STARTED/CANCELLED; appointed/completed คือสถานะรอบปัจจุบัน จึงผสมความหมาย

หลังแก้: submitted = โรงเรียนที่มีหนังสือแนะแนวจริง, appointed = โรงเรียนที่เคยมีนัดที่ไม่ยกเลิก, completed = โรงเรียนที่มี FieldTrip แนะแนวจริง เป็นยอดสะสม distinct school ส่วน pending เป็นสถานะรอบปัจจุบันและรวมยกเลิกนัด

ทั้งภาพรวมและสาย 1/2 ใช้ helper เดียวกับ School Detail มีคำอธิบายว่ายอดแต่ละขั้นรวมกันอาจเกินจำนวนโรงเรียนได้ โรงเรียนที่เปิดรอบใหม่ยังนับในยอดเคยแนะแนวแล้ว ขณะที่ School Detail แสดงสถานะรอบปัจจุบัน การเปลี่ยนตัวเลขเป็นการคำนวณ local UI ไม่มีแก้ข้อมูลจริง ไม่มีการอ้างจำนวน production ที่ยังไม่ได้ audit

## 11. Monthly Report

Source = documentSubmissions + fieldTrips; Appointment ไม่สร้าง report row ตารางและพิมพ์มีวัน, วัน/เดือน/ปี, โรงเรียน, รถ, งานที่ปฏิบัติ, อาจารย์แนะแนว ไม่มี student count/รูปในรายงานหลัก คลิกแถวเปิด source detail ตรง ID

ชื่อโรงเรียนใช้ค่าประวัติก่อน ค่าว่างรถไม่เติม mapping ปัจจุบัน หลายคนแสดงครบ กิจกรรมอื่นมีชื่อกิจกรรมตามที่บันทึก มีตัวกรองเดือน/ปี/สาย และ one row per school สำหรับทริปหลายโรงเรียนโดย source ID ยังเป็นทริปเดียว

## 12. Gallery impact

ใช้ buildGallerySources จัดหมวด Submission / Guidance / Legacy Appointment ชัดเจน รูปไม่ถูก copy หรือย้าย URL ซ้ำในคนละ source ยังคงเจ้าของแต่ละ source ได้ จึงอาจเห็นจำนวนเพิ่มจากการไม่ซ่อนรายการข้าม source

ตัวกรองโรงเรียนรองรับรหัสโรงเรียนเก่าที่ unique และทริปหลายโรงเรียน รูปที่ระบุโรงเรียนเฉพาะไม่กระจายไปโรงเรียนอื่น รูปทริปที่ไม่ได้ระบุโรงเรียนแสดงตาม membership จริงของทริป ไม่เดาจากชื่อ

## 13. Legacy findings / limits

- COMPLETED Appointment ที่ไม่มี FieldTrip ไม่ถือเป็นแนะแนวเรียบร้อยแล้ว ไม่ได้ migrate
- source ที่ขาด relation ID ไม่จับคู่ด้วยชื่อโรงเรียน; ข้อมูลคล้ายกันไม่เป็นเหตุให้เชื่อมกัน
- ตัวนำเข้า legacy เดิมเคยจับคู่โรงเรียนจากชื่อ รอบนี้ไม่สร้าง relation แบบนั้นอีก หากไม่มี stable schoolId จะไม่นำเข้าและต้องตรวจการจับคู่ก่อน ไม่ได้เพิ่มหน้าจอ migration หรือสร้าง mapping เอง
- ค่าบุคลากรและเวลาที่ขาดใน import ไม่เติมค่าบุคคลหรือเวลาที่เดาเอง
- ทริปที่ไม่มี schools ใน source ยังถูกระบุเป็นปัญหาข้อมูลใน report helper ไม่สร้างแถวโรงเรียนที่เดาขึ้นมา
- ไม่ได้ตรวจ/ซ่อมทุก record ใน production และไม่ได้ทดสอบ save จริง เพื่อรักษาขอบเขต no writes

## 14. Regression tests

เพิ่ม masterWorkflow 16 cases: other activity, current versus cumulative cycles, stale stored status, completed appointment without trip, status/note wording, historical name/vehicle/people, multi-school gallery/report/timeline parity และ source ownership

ปรับ expected wording ของ tests เดิมตาม master request ไม่ลบ tests เพื่อให้ผ่าน Browser เพิ่ม school-only, other activity และ print 6 columns/no images/no student count พร้อมกรณี single/multiple source, keyboard, focus, legacy incomplete

## 15–20. ผลตรวจสุดท้าย

| รายการ | ผล |
|---|---|
| npm run lint | PASS |
| npm test | PASS: 397 Vitest + 8 Functions = 405 tests |
| npm run build | PASS; มีคำเตือน bundle ใหญ่กว่า 500 kB เดิม |
| 1366×768 | PASS: timeline/navigation/evidence/overflow |
| 1920×1080 | PASS: timeline/navigation/evidence/overflow |
| Mobile 390×844 | PASS: footer/scroll/navigation/keyboard/overflow |
| Print CSS | PASS: 6 headers, no images, no student count |
| Browser page errors / external requests | 0 / 0 ใน fixture ที่บล็อก network ภายนอก |

Browser command: `node tests/browser/school-timeline-qa.cjs`

ภาพ: `docs/qa-school-hub/timeline-1366.png`, `timeline-1920.png`, `timeline-mobile.png`

เปิดระบบ local: http://localhost:3000/ แล้วรีเฟรชเพื่อรับโค้ดล่าสุด

## Safety counters

PRODUCTION FIRESTORE WRITES = 0

PRODUCTION STORAGE WRITES = 0

AUTH CHANGES = 0

MIGRATION = 0

DELETE RECORDS / PHOTOS = 0

COMMIT = 0 / PUSH = 0 / DEPLOYMENT = 0

ไม่ได้ทำ hosted smoke test เพราะไม่มีการ deploy รอบนี้ หยุดหลังรายงานผลตามคำสั่ง
