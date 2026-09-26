import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
import type { DocumentSubmission, FieldTrip, School } from "../../types";
import { THAI_MONTHS } from "../../utils/dateUtils";
import {
  buildMonthlyReportRows,
  buildMonthlyReportDataset,
  findMonthlyReportSource,
  reportDateLabels,
  reportPeople,
  reportTeamLabel,
  reportWorkLabel,
} from "../../utils/monthlyReport";
import type {
  MonthlyReportDataset,
  MonthlyReportRow,
  ReportFilters,
} from "../../utils/monthlyReport";
import {
  downloadMonthlyReport,
  monthlyReportTitle,
} from "../../utils/monthlyReportExport";
import { SubmissionDetailModal } from "../submissions/SubmissionDetailModal";
import { FieldTripDetailModal } from "../trips/FieldTripDetailModal";
import "./monthlyReports.css";

interface Props {
  schools: School[];
  submissions: DocumentSubmission[];
  fieldTrips: FieldTrip[];
}
const names = (row: MonthlyReportRow) =>
  row.responsiblePeople.map((p) => p.name);

function ReportTable({
  data,
  onOpen,
}: {
  data: MonthlyReportDataset;
  onOpen?: (row: MonthlyReportRow) => void;
}) {
  const days = [...new Set(data.rows.map(row => row.date))];
  return (
    <table className="monthly-table">
      <caption className="text-left p-3">รวมออกปฏิบัติงาน {days.length} วัน ตามตัวกรองที่เลือก</caption>
      <thead>
        <tr>
          {[
            "ลำดับวัน",
            "วัน",
            "วัน/เดือน/ปี",
            "ชื่อโรงเรียน",
            "รถที่ใช้",
            "งานที่ปฏิบัติ",
            "อาจารย์แนะแนว",
          ].map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, index) => {
          const date = reportDateLabels(row.date);
          const firstOfDay = index === 0 || data.rows[index - 1].date !== row.date;
          const dayRows = data.rows.filter(r => r.date === row.date).length;
          return (
            <tr
              key={row.key}
              tabIndex={onOpen ? 0 : undefined}
              aria-label={
                onOpen
                  ? `ตรวจสอบ ${row.schoolName} ${row.activityLabel} ${date.date}`
                  : undefined
              }
              onClick={onOpen ? () => onOpen(row) : undefined}
              onKeyDown={
                onOpen
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpen(row);
                      }
                    }
                  : undefined
              }
            >
              {firstOfDay && <td rowSpan={dayRows}>{days.indexOf(row.date) + 1}</td>}
              {firstOfDay && <td rowSpan={dayRows}>{date.weekday}</td>}
              {firstOfDay && <td rowSpan={dayRows}>{date.date}</td>}
              <td>{row.schoolName}</td>
              <td>{row.vehicleName}</td>
              <td>{row.activityLabel}</td>
              <td>
                {names(row).length
                  ? names(row).map((name, i) => <div key={i}>{name}</div>)
                  : "ไม่ระบุ"}
              </td>
            </tr>
          );
        })}
        {!data.rows.length && (
          <tr>
            <td colSpan={7} className="monthly-empty">
              ไม่มีรายการปฏิบัติงานตามตัวกรองที่เลือก
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
function ReportSummary({ data }: { data: MonthlyReportDataset }) {
  const entries = [
    ...data.teams.map((t) => ({
      label: reportTeamLabel(t.team),
      summary: t.summary,
    })),
    { label: "รวมตามตัวกรอง", summary: data.summary },
  ];
  return (
    <section className="monthly-summary">
      <h2>สรุปผลการปฏิบัติงานตามตัวกรอง</h2>
      {entries.map(({ label, summary: s }) => (
        <div className="monthly-team-summary" key={label}>
          <h3>{label}</h3>
          <p>
            ยื่นหนังสือ <b>{s.submissions}</b> รายการ · ออกแนะแนว{" "}
            <b>{s.trips}</b> ทริป · โรงเรียนออกแนะแนว <b>{s.guidanceSchools}</b>{" "}
            โรงเรียน · โรงเรียนไม่ซ้ำรวม <b>{s.uniqueSchools}</b> โรงเรียน
          </p>
          <p>
            ผู้รับผิดชอบ: {s.people.map((p) => p.name).join(", ") || "ไม่ระบุ"}
          </p>
        </div>
      ))}
      <p className="monthly-count-note">
        จำนวนโรงเรียนนับเฉพาะความเชื่อมโยงที่ยืนยันได้
        ไม่นับซ้ำระหว่างยื่นหนังสือกับออกแนะแนว
      </p>
      {!!data.summary.unresolvedSchools && (
        <p role="status">
          ยังยืนยันโรงเรียนไม่ได้ {data.summary.unresolvedSchools} รายการ —
          แสดงรายการงานไว้ แต่ไม่นำมาคำนวณจำนวนโรงเรียนไม่ซ้ำ
        </p>
      )}
    </section>
  );
}
export function MonthlyReportsView({
  schools,
  submissions,
  fieldTrips,
}: Props) {
  const now = new Date();
  const [filters, setFilters] = useState<ReportFilters>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    team: "all",
    work: "all",
  });
  const [selected, setSelected] = useState<MonthlyReportRow | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");
  const previousFocus = useRef<HTMLElement | null>(null);
  const built = useMemo(
    () => buildMonthlyReportRows(submissions, fieldTrips, schools),
    [submissions, fieldTrips, schools],
  );
  const data = useMemo(
    () => buildMonthlyReportDataset(built.rows, filters),
    [built.rows, filters],
  );
  const source = selected
    ? findMonthlyReportSource(selected, submissions, fieldTrips)
    : null;
  const years = [
    ...new Set([
      now.getFullYear(),
      filters.year,
      ...built.rows.map((r) => Number(r.date.slice(0, 4))),
    ]),
  ].sort((a, b) => b - a);
  const excluded = built.issues.filter(
    (i) =>
      (filters.team === "all" || i.team === filters.team) &&
      (filters.work === "all" || i.sourceType === filters.work),
  );
  const open = (row: MonthlyReportRow) => {
    previousFocus.current = document.activeElement as HTMLElement;
    setSelected(row);
  };
  const close = () => {
    setPhoto(null);
    setSelected(null);
    previousFocus.current?.focus();
  };
  useEffect(() => {
    if (!selected) return;
    const dialog = document.querySelector<HTMLElement>(
      photo ? ".monthly-lightbox" : '.monthly-source-detail [role="dialog"]',
    );
    const first = dialog?.querySelector<HTMLElement>("button");
    first?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (photo) setPhoto(null);
        else close();
      }
      if (e.key === "Tab") {
        const activeDialog = document.querySelector<HTMLElement>(
          photo
            ? ".monthly-lightbox"
            : '.monthly-source-detail [role="dialog"]',
        );
        const controls = activeDialog?.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex="0"]',
        );
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [selected, photo]);
  const summary = data.summary;
  return (
    <div className="monthly-report space-y-5">
      <header className="monthly-header">
        <div>
          <h1>
            <FileSpreadsheet size={25} /> รายงานประจำเดือน
          </h1>
          <p>ยื่นหนังสือและออกแนะแนว · วิทยาลัยเทคโนโลยีอุตรดิตถ์</p>
        </div>
        <div className="monthly-actions">
          <button
            type="button"
            onClick={() => {
              try {
                downloadMonthlyReport(data);
                setExportError("");
              } catch {
                setExportError("ส่งออกไม่สำเร็จ กรุณาลองอีกครั้ง");
              }
            }}
          >
            <Download size={17} /> Excel
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={17} /> พิมพ์ / PDF
          </button>
        </div>
      </header>
      <div className="monthly-filters">
        <label>
          เดือน
          <select
            aria-label="เดือน"
            value={filters.month}
            onChange={(e) =>
              setFilters({ ...filters, month: Number(e.target.value) })
            }
          >
            {THAI_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          ปี พ.ศ.
          <select
            aria-label="ปี พ.ศ."
            value={filters.year}
            onChange={(e) =>
              setFilters({ ...filters, year: Number(e.target.value) })
            }
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y + 543}
              </option>
            ))}
          </select>
        </label>
        <label>
          สายงาน
          <select
            aria-label="สายงาน"
            value={filters.team}
            onChange={(e) =>
              setFilters({
                ...filters,
                team: e.target.value as ReportFilters["team"],
              })
            }
          >
            {(["all", "team1", "team2", "unknown"] as const).map((t) => (
              <option key={t} value={t}>
                {reportTeamLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          ประเภทงาน
          <select
            aria-label="ประเภทงาน"
            value={filters.work}
            onChange={(e) =>
              setFilters({
                ...filters,
                work: e.target.value as ReportFilters["work"],
              })
            }
          >
            {(["all", "SUBMISSION", "GUIDANCE"] as const).map((t) => (
              <option key={t} value={t}>
                {reportWorkLabel(t)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {exportError && <p role="alert">{exportError}</p>}
      {!!excluded.length && (
        <p className="monthly-warning" role="status">
          มีข้อมูลต้นทาง {excluded.length}{" "}
          รายการที่วันที่/โรงเรียน/ข้อมูลอ้างอิงไม่ครบ จึงไม่นำเข้าตาราง
          (ตรวจจากข้อมูลทุกเดือนของสายและประเภทที่เลือก ไม่เดาวันที่)
        </p>
      )}
      <div className="monthly-counters">
        {[
          [summary.submissions, "ยื่นหนังสือ", "รายการ"],
          [summary.trips, "ออกแนะแนว", "ทริป"],
          [summary.guidanceSchools, "โรงเรียนออกแนะแนว", "โรงเรียน"],
          [summary.uniqueSchools, "โรงเรียนไม่ซ้ำรวม", "โรงเรียน"],
        ].map(([count, title, unit]) => (
          <div key={title}>
            <span>{title}</span>
            <p>
              <strong>{count}</strong> {unit}
            </p>
          </div>
        ))}
      </div>
      <section className="monthly-list">
        <div className="monthly-list-title">
          <h2>{monthlyReportTitle(data)}</h2>
          <p>คลิกหรือแตะรายการเพื่อดูข้อมูลต้นทางและรูปหลักฐาน</p>
        </div>
        <div className="monthly-desktop">
          <ReportTable data={data} onOpen={open} />
        </div>
        <div className="monthly-mobile">
          {data.rows.map((row) => (
            <button
              type="button"
              key={row.key}
              onClick={() => open(row)}
              className="monthly-card"
            >
              <span>
                {reportDateLabels(row.date).weekday}{" "}
                {reportDateLabels(row.date).date}
              </span>
              <strong>{row.schoolName}</strong>
              <span>
                {row.activityLabel} · {reportTeamLabel(row.team)}
              </span>
              <span>รถ: {row.vehicleName}</span>
              <span>อาจารย์แนะแนว: {names(row).join(", ") || "ไม่ระบุ"}</span>
            </button>
          ))}
          {!data.rows.length && (
            <p className="monthly-empty">
              ไม่มีรายการปฏิบัติงานตามตัวกรองที่เลือก
            </p>
          )}
        </div>
      </section>
      <ReportSummary data={data} />
      {source && (
        <div className="monthly-source-detail">
          {source.type === "SUBMISSION" && source.record && (
            <SubmissionDetailModal
              detail={source.record}
              submitterNames={reportPeople(
                source.record.submittedByNames?.length
                  ? source.record.submittedByNames
                  : [source.record.submittedByName],
              ).map((p) => p.name)}
              onClose={close}
              onPhoto={setPhoto}
            />
          )}
          {source.type === "GUIDANCE" && source.record && (
            <FieldTripDetailModal
              selectedTrip={source.record}
              responsibleNames={reportPeople(
                [
                  source.record.counselorName,
                  source.record.teamMemberNames || "",
                ],
                source.record.counselorId,
              ).map((p) => p.name)}
              onClose={close}
              onPhoto={setPhoto}
            />
          )}
          {!source.record && (
            <div
              role="dialog"
              aria-label="ไม่พบรายการต้นทาง"
              className="monthly-missing-source"
            >
              <p>ไม่พบรายการต้นทาง ข้อมูลอาจเปลี่ยนแปลงแล้ว</p>
              <button onClick={close}>ปิด</button>
            </div>
          )}
        </div>
      )}
      {photo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="รูปหลักฐานต้นทาง"
          className="monthly-lightbox"
          onClick={() => setPhoto(null)}
        >
          <button autoFocus type="button" onClick={() => setPhoto(null)}>
            ปิดรูป
          </button>
          <img
            src={photo}
            alt="รูปหลักฐานต้นทาง"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {createPortal(
        <article className="monthly-print-document">
          <header>
            <h1>{monthlyReportTitle(data)}</h1>
          </header>
          <ReportTable data={data} />
        </article>,
        document.body,
      )}
    </div>
  );
}
