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
import { SubmissionFormModal } from "../submissions/SubmissionFormModal";
import { FieldTripFormModal } from "../trips/FieldTripFormModal";
import { updateDocumentSubmission, updateFieldTrip } from "../../firebase/dbService";
import { useAuth } from "../../context/AuthContext";
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
    <div className="overflow-x-auto w-full">
      <table className="monthly-table">
        <caption className="monthly-caption">รวมออกปฏิบัติงาน {days.length} วัน ตามตัวกรองที่เลือก</caption>
        <thead>
          <tr>
            {[
              "ลำดับวัน",
              "วัน",
              "วัน/เดือน/ปี",
              "ชื่อโรงเรียน",
              "สาย",
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
            const dayNum = days.indexOf(row.date) + 1;
            const isFirstOfDay = index === 0 || data.rows[index - 1].date !== row.date;
            const prevRow = index > 0 ? data.rows[index - 1] : null;
            const isSameVehicle = prevRow && prevRow.date === row.date && prevRow.vehicleName === row.vehicleName;
            const isSamePeople = prevRow && prevRow.date === row.date && names(row).join(",") === names(prevRow).join(",");
            return (
              <tr
                key={row.key}
                tabIndex={onOpen ? 0 : undefined}
                className={isFirstOfDay ? "day-start-row" : "day-subsequent-row"}
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
                <td className="text-center">
                  {isFirstOfDay ? (
                    <span className="font-bold text-slate-700">{dayNum}</span>
                  ) : (
                    <span className="text-slate-300 font-serif select-none" title={`วันที่ ${dayNum}`}>”</span>
                  )}
                </td>
                <td>
                  {isFirstOfDay ? (
                    <span className="font-medium text-slate-700">{date.weekday}</span>
                  ) : (
                    <span className="text-slate-300 font-serif select-none" title={date.weekday}>”</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  {isFirstOfDay ? (
                    <span className="text-slate-600 font-medium">{date.date}</span>
                  ) : (
                    <span className="text-slate-300 font-serif select-none" title={date.date}>”</span>
                  )}
                </td>
                <td>
                  <span className="font-semibold text-slate-900 hover:text-[#087cc1] transition-colors">
                    {row.schoolName}
                  </span>
                </td>
                <td>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-sm text-xs font-semibold ${
                      row.team === "team1"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : row.team === "team2"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {reportTeamLabel(row.team)}
                  </span>
                </td>
                <td>
                  {isSameVehicle ? (
                    <span className="text-slate-300 font-serif select-none" title={row.vehicleName}>”</span>
                  ) : (
                    <span className="text-slate-700">{row.vehicleName}</span>
                  )}
                </td>
                <td>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-sm text-xs font-semibold ${
                      row.activityLabel.includes("แนะแนว") && row.activityLabel.includes("ยื่น")
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : row.activityLabel.includes("แนะแนว")
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}
                  >
                    {row.activityLabel}
                  </span>
                </td>
                <td>
                  {isSamePeople ? (
                    <span className="text-slate-300 font-serif select-none" title={names(row).join(", ")}>”</span>
                  ) : names(row).length ? (
                    names(row).map((name, i) => <div key={i} className="text-slate-700">{name}</div>)
                  ) : (
                    <span className="text-slate-400">ไม่ระบุ</span>
                  )}
                </td>
              </tr>
            );
          })}
          {!data.rows.length && (
            <tr>
              <td colSpan={8} className="monthly-empty">
                ไม่มีรายการปฏิบัติงานตามตัวกรองที่เลือก
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
  const { currentUser, canEdit } = useAuth();
  const now = new Date();
  const [filters, setFilters] = useState<ReportFilters>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    team: "all",
    work: "all",
  });
  const [selected, setSelected] = useState<MonthlyReportRow | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submissionToEdit, setSubmissionToEdit] = useState<DocumentSubmission | null>(null);
  const [tripToEdit, setTripToEdit] = useState<FieldTrip | null>(null);
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
              onEdit={(sub) => {
                close();
                setSubmissionToEdit(sub);
              }}
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
              onEdit={(trip) => {
                close();
                setTripToEdit(trip);
              }}
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

      {/* Direct Edit Modals preserving all linked relationships */}
      {submissionToEdit && (
        <SubmissionFormModal
          key={submissionToEdit.id}
          isOpen={!!submissionToEdit}
          submissionToEdit={submissionToEdit}
          schools={schools}
          onClose={() => setSubmissionToEdit(null)}
          onSave={async (data) => {
            await updateDocumentSubmission(submissionToEdit.id, data, currentUser);
            setSubmissionToEdit(null);
            return submissionToEdit.id;
          }}
          onOpenInstantAppointment={() => {}}
        />
      )}

      {tripToEdit && (
        <FieldTripFormModal
          key={tripToEdit.id}
          isOpen={!!tripToEdit}
          tripToEdit={tripToEdit}
          schools={schools}
          submissions={submissions}
          onClose={() => setTripToEdit(null)}
          onSave={async (tripData) => {
            await updateFieldTrip(tripToEdit.id, tripData, currentUser);
            setTripToEdit(null);
            return tripToEdit.id;
          }}
        />
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
