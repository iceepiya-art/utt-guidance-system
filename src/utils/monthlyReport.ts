import { getSubmissionDisplayStatus } from "./submissionUtils";
import type { DocumentSubmission, FieldTrip, School, TeamId } from "../types";
import { resolveSchoolRelation, formatSchoolDisplayName } from "./schoolStatus";
import {
  KNOWN_PERSONNEL_ALIASES,
  TARGET_PERSONNEL_CANONICAL_NAMES,
} from "./personnelSelector";
import { THAI_DAYS_FULL } from "./dateUtils";

export type ReportSourceType = "SUBMISSION" | "GUIDANCE";
export type ReportTeam = TeamId | "unknown";
export interface ReportPerson {
  id?: string;
  name: string;
}
export interface MonthlyReportRow {
  key: string;
  sourceType: ReportSourceType;
  sourceId: string;
  submissionId?: string;
  combinedSources?: MonthlyReportRow[];
  date: string;
  team: ReportTeam;
  schoolId?: string;
  schoolName: string;
  vehicleName: string;
  activityLabel: string;
  responsiblePeople: ReportPerson[];
}
export interface ReportFilters {
  year: number;
  month: number;
  team: ReportTeam | "all";
  work: ReportSourceType | "all";
}
export interface ReportIssue {
  sourceType: ReportSourceType;
  sourceId: string;
  date: string;
  team: ReportTeam;
  reason: "date" | "school" | "source";
}
export const reportTeamLabel = (team: ReportTeam | "all") =>
  ({
    all: "ทุกสาย",
    team1: "อุตรดิตถ์ (สาย 1)",
    team2: "สุโขทัย (สาย 2)",
    unknown: "ไม่ระบุสาย",
  })[team];
export const reportWorkLabel = (work: ReportSourceType | "all") =>
  ({ all: "งานทั้งหมด", SUBMISSION: "ยื่นหนังสือ", GUIDANCE: "ออกแนะแนว" })[
    work
  ];

// Date-only parsing uses UTC throughout, independent of the browser's timezone.
export function validReportDate(value: string): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function reportDateLabels(value: string) {
  if (!validReportDate(value)) return { weekday: "ไม่ระบุ", date: "ไม่ระบุ" };
  const d = new Date(`${value}T00:00:00Z`);
  return {
    weekday: THAI_DAYS_FULL[d.getUTCDay()],
    date: `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear() + 543}`,
  };
}

// Use only explicitly verified aliases. Do not call the selector's fuzzy fallback.
export function reportPeople(
  names: string[],
  primaryId?: string,
): ReportPerson[] {
  const people = names
    .flatMap((n, entryIndex) =>
      (n || "").split(/[,;+\n]/).map((name, partIndex) => ({
        name: name.trim().replace(/\s+/g, " "),
        isPrimary: entryIndex === 0 && partIndex === 0,
      })),
    )
    .filter((p) => p.name);
  const result = new Map<string, ReportPerson>();
  people.forEach(({ name, isPrimary }) => {
    const aliasId = KNOWN_PERSONNEL_ALIASES[name];
    const id = (isPrimary ? primaryId || undefined : undefined) || aliasId;
    const display = aliasId ? TARGET_PERSONNEL_CANONICAL_NAMES[aliasId] : name;
    const person = { ...(id ? { id } : {}), name: display || name };
    result.set(id ? `id:${id}` : `name:${person.name}`, person);
  });
  return [...result.values()];
}

export function buildMonthlyReportRows(
  submissions: DocumentSubmission[],
  trips: FieldTrip[],
  schools: School[],
) {
  const rows: MonthlyReportRow[] = [];
  const issues: ReportIssue[] = [];
  const resolveSchool = (id: string, name: string) => {
    const school = resolveSchoolRelation(id, schools);
    // Unresolved relations are not deduplicated by a name or an ambiguous code.
    return {
      ...(school ? { schoolId: school.id } : {}),
      schoolName:
        formatSchoolDisplayName(name || school?.schoolName) ||
        "ไม่ระบุโรงเรียน",
    };
  };
  const teamOf = (team: string): ReportTeam =>
    team === "team1" || team === "team2" ? team : "unknown";
  const check = (
    sourceType: ReportSourceType,
    sourceId: string,
    date: string,
    team: ReportTeam,
    hasSchools = true,
  ) => {
    const reason = !sourceId
      ? "source"
      : !validReportDate(date)
        ? "date"
        : !hasSchools
          ? "school"
          : null;
    if (reason) issues.push({ sourceType, sourceId, date, team, reason });
    return !reason;
  };
  submissions.forEach((s) => {
    const team = teamOf(s.teamId);
    if (!check("SUBMISSION", s.id, s.submissionDate, team)) return;
    const activityDetails = (s.otherActivityDetails || s.activities?.join(", ") || "กิจกรรมอื่นๆ").trim();
    // submittedById is the logged-in recorder in the existing save flow, not a
    // reliable ID for each submittedByNames entry. Keep the stored people only.
    rows.push({
      key: `SUBMISSION:${s.id}`,
      sourceType: "SUBMISSION",
      sourceId: s.id,
      date: s.submissionDate,
      team,
      ...resolveSchool(s.schoolId, s.schoolName),
      vehicleName: s.vehicleName?.trim() || "ไม่ระบุ",
      activityLabel: getSubmissionDisplayStatus(s).isOtherActivity
        ? activityDetails === "ยื่นใบเสร็จ" ? activityDetails : `ยื่นหนังสือ — ${activityDetails}`
        : "ยื่นหนังสือ",
      responsiblePeople: reportPeople(
        s.submittedByNames?.length ? s.submittedByNames : [s.submittedByName],
      ),
    });
  });
  trips.forEach((t) => {
    const team = teamOf(t.teamId);
    if (!check("GUIDANCE", t.id, t.date, team, !!t.schools?.length)) return;
    const responsiblePeople = reportPeople(
      [t.counselorName, t.teamMemberNames || ""],
      t.counselorId,
    );
    t.schools.forEach((s, index) =>
      rows.push({
        key: `GUIDANCE:${t.id}:${index}`,
        sourceType: "GUIDANCE",
        sourceId: t.id,
        submissionId: t.submissionId,
        date: t.date,
        team,
        ...resolveSchool(s.schoolId, s.schoolName),
        vehicleName: t.vehicleName?.trim() || "ไม่ระบุ",
        activityLabel: "ออกแนะแนว",
        responsiblePeople,
      }),
    );
  });
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  rows.sort(
    (a, b) =>
      compare(a.date, b.date) ||
      compare(a.sourceType, b.sourceType) ||
      compare(a.sourceId, b.sourceId) ||
      compare(a.key, b.key),
  );
  return { rows, issues };
}
export function filterMonthlyReportRows(
  rows: MonthlyReportRow[],
  filters: ReportFilters,
) {
  const prefix = `${filters.year}-${String(filters.month).padStart(2, "0")}`;
  return rows.filter(
    (r) =>
      r.date.slice(0, 7) === prefix &&
      (filters.team === "all" || r.team === filters.team) &&
      (filters.work === "all" || r.sourceType === filters.work),
  );
}
export function calculateMonthlyReportSummary(rows: MonthlyReportRow[]) {
  const guidance = rows.filter((r) => r.sourceType === "GUIDANCE");
  const people = new Map<string, ReportPerson>();
  rows.forEach((r) =>
    r.responsiblePeople.forEach((p) =>
      people.set(p.id ? `id:${p.id}` : `name:${p.name}`, p),
    ),
  );
  return {
    submissions: new Set(
      rows.filter((r) => r.sourceType === "SUBMISSION").map((r) => r.sourceId),
    ).size,
    trips: new Set(guidance.map((r) => r.sourceId)).size,
    guidanceSchools: new Set(guidance.map((r) => r.schoolId).filter(Boolean))
      .size,
    uniqueSchools: new Set(rows.map((r) => r.schoolId).filter(Boolean)).size,
    unresolvedSchools: rows.filter((r) => !r.schoolId).length,
    people: [...people.values()],
  };
}
export function buildMonthlyReportDataset(
  rows: MonthlyReportRow[],
  filters: ReportFilters,
) {
  const filtered = filterMonthlyReportRows(rows, filters);
  const teams: ReportTeam[] =
    filters.team === "all"
      ? [
          "team1",
          "team2",
          ...(filtered.some((r) => r.team === "unknown")
            ? ["unknown" as const]
            : []),
        ]
      : [filters.team];
  return {
    rows: combineSameVisitRows(filtered),
    filters,
    summary: calculateMonthlyReportSummary(filtered),
    teams: teams.map((team) => ({
      team,
      summary: calculateMonthlyReportSummary(
        filtered.filter((r) => r.team === team),
      ),
    })),
  };
}
export type MonthlyReportDataset = ReturnType<typeof buildMonthlyReportDataset>;

// Combine only explicitly linked work on the same day, school and team.
// Original rows still supply counts, work filters and evidence navigation.
export function combineSameVisitRows(rows: MonthlyReportRow[]): MonthlyReportRow[] {
  const consumed = new Set<string>();
  const combined = new Map<string, MonthlyReportRow>();
  for (const guidance of rows.filter(r => r.sourceType === "GUIDANCE")) {
    const matches = rows.filter(r => r.sourceType === "SUBMISSION" &&
      r.sourceId === guidance.submissionId && r.schoolId && r.schoolId === guidance.schoolId &&
      r.date === guidance.date && r.team === guidance.team && r.activityLabel === "ยื่นหนังสือ");
    if (matches.length !== 1) continue;
    const letter = matches[0];
    if (consumed.has(letter.key) || rows.filter(r => r.sourceType === "GUIDANCE" &&
      r.submissionId === letter.sourceId && r.schoolId === letter.schoolId &&
      r.date === letter.date && r.team === letter.team).length !== 1) continue;
    if (letter.vehicleName !== "ไม่ระบุ" && guidance.vehicleName !== "ไม่ระบุ" &&
      letter.vehicleName !== guidance.vehicleName) continue;
    consumed.add(letter.key);
    const people = new Map([...letter.responsiblePeople, ...guidance.responsiblePeople]
      .map(p => [p.id || p.name, p]));
    combined.set(guidance.key, {...guidance,
      activityLabel: "ยื่นหนังสือ / ออกแนะแนว",
      vehicleName: guidance.vehicleName === "ไม่ระบุ" ? letter.vehicleName : guidance.vehicleName,
      responsiblePeople: [...people.values()], combinedSources: [letter, guidance]});
  }
  return rows.filter(r => !consumed.has(r.key)).map(r => combined.get(r.key) || r);
}
export function findMonthlyReportSource(
  row: MonthlyReportRow,
  submissions: DocumentSubmission[],
  trips: FieldTrip[],
) {
  return row.sourceType === "SUBMISSION"
    ? {
        type: "SUBMISSION" as const,
        record: submissions.find((s) => s.id === row.sourceId),
      }
    : {
        type: "GUIDANCE" as const,
        record: trips.find((t) => t.id === row.sourceId),
      };
}
