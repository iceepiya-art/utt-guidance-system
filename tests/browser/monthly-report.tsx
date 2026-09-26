// Local-only synthetic fixture. Imports no Firebase/Auth modules and is not a production entrypoint.
import React from "react";
import { createRoot } from "react-dom/client";
import { MonthlyReportsView } from "../../src/components/reports/MonthlyReportsView";
import type { School, DocumentSubmission, FieldTrip } from "../../src/types";
import "../../src/index.css";

const schools = ["บ้านตัวอย่าง ก", "บ้านตัวอย่าง ข", "บ้านตัวอย่าง ค"].map(
  (schoolName, i) =>
    ({
      id: `qa-school-${i}`,
      schoolId: `QA-${i}`,
      schoolName: `โรงเรียน${schoolName}`,
    }) as School,
);
const photo = {
  id: "qa-photo",
  url:
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#bae6fd"/><text x="70" y="130" font-size="30">LOCAL QA EVIDENCE</text></svg>',
    ),
  fileName: "synthetic.svg",
  uploadedAt: "",
};
const submissions = [
  {
    id: "qa-sub-1",
    schoolId: schools[0].id,
    schoolName: schools[0].schoolName,
    submissionDate: "2026-09-07",
    submissionTime: "09:00",
    teamId: "team1",
    documentNumber: "QA-001",
    submittedByNames: ["อ.ประชา กัลปนารถ", "อ.ณิชชัยกุญช์ โลราช"],
    vehicleName: "VIGO กข 9914",
    photos: [photo],
    status: "DOCUMENT_SUBMITTED",
  },
  {
    id: "qa-sub-2",
    schoolId: schools[1].id,
    schoolName: schools[1].schoolName,
    submissionDate: "2026-09-08",
    teamId: "team2",
    documentNumber: "QA-002",
    submittedByName: "อ.ปิยะ สีตาชัย",
    vehicleName: "MITSU บน 6739",
    photos: [],
  },
  {
    id: "qa-sub-3",
    schoolId: schools[2].id,
    schoolName: schools[2].schoolName,
    submissionDate: "2026-09-08",
    teamId: "team1",
    documentNumber: "QA-003",
    photos: [],
  },
] as DocumentSubmission[];
const trips = [
  {
    id: "qa-trip-1",
    date: "2026-09-09",
    teamId: "team2",
    workType: "แนะแนว",
    vehicleName: "MITSU บน 6738",
    counselorId: "usr_staff2",
    counselorName: "อ.ปิยะ สีตาชัย",
    schools: schools.map((s) => ({
      schoolId: s.id,
      schoolName: s.schoolName,
      studentCount: 98765,
    })),
    photos: [photo],
    summary: "ผลกิจกรรมสมมติสำหรับทดสอบในเครื่อง",
  },
] as FieldTrip[];
const repeat = new URLSearchParams(location.search).has("many");
const data = repeat
  ? [
      ...submissions,
      ...Array.from({ length: 40 }, (_, i) => ({
        ...submissions[i % 3],
        id: `qa-extra-${i}`,
      })),
    ]
  : submissions;
createRoot(document.getElementById("root")!).render(
  <div style={{ display: "flex", minHeight: "100vh" }}>
    <aside
      className="hidden md:block"
      style={{ width: 256, flexShrink: 0, padding: 20, background: "white" }}
    >
      UTT · Local QA
      <br />
      ข้อมูลสมมติเท่านั้น
    </aside>
    <main style={{ minWidth: 0, flex: 1, padding: 24 }}>
      <MonthlyReportsView
        schools={schools}
        submissions={data}
        fieldTrips={trips}
      />
    </main>
  </div>,
);
