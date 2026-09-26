import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { DocumentSubmission, FieldTrip, School } from "../src/types";
import {
  buildMonthlyReportRows,
  buildMonthlyReportDataset,
  calculateMonthlyReportSummary,
  filterMonthlyReportRows,
  findMonthlyReportSource,
  reportDateLabels,
  reportPeople,
} from "../src/utils/monthlyReport";
import { buildMonthlyReportWorkbook } from "../src/utils/monthlyReportExport";

const schools = ["a", "b", "c", "d"].map(
  (id) =>
    ({ id, schoolId: `code-${id}`, schoolName: `โรงเรียน${id}` }) as School,
);
const sub = (id = "s1", props: Partial<DocumentSubmission> = {}) =>
  ({
    id,
    schoolId: "a",
    schoolName: "โรงเรียนa",
    submissionDate: "2026-09-07",
    teamId: "team1",
    submittedByName: "อ.ประชา",
    ...props,
  }) as DocumentSubmission;
const trip = (id = "t1", ids = ["a"], props: Partial<FieldTrip> = {}) =>
  ({
    id,
    date: "2026-09-09",
    teamId: "team2",
    counselorName: "อ.ปิยะ",
    schools: ids.map((schoolId) => ({
      schoolId,
      schoolName: `โรงเรียน${schoolId}`,
    })),
    ...props,
  }) as FieldTrip;
const filters = {
  year: 2026,
  month: 9,
  team: "all" as const,
  work: "all" as const,
};
const build = (s: DocumentSubmission[] = [], t: FieldTrip[] = []) =>
  buildMonthlyReportRows(s, t, schools).rows;
describe("Monthly report derived data", () => {
  it("combines linked same-day work while retaining both evidence sources and counts", () => {
    const rows = build([sub()], [trip("t1", ["a"], {
      submissionId: "s1", date: "2026-09-07", teamId: "team1", vehicleName: "MITSU บน 6738",
    })]);
    const data = buildMonthlyReportDataset(rows, filters);
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0].activityLabel).toBe("ยื่นหนังสือ / ออกแนะแนว");
    expect(data.rows[0].vehicleName).toBe("MITSU บน 6738");
    expect(data.rows[0].combinedSources?.map(r => findMonthlyReportSource(r, [sub()], [trip()]).type))
      .toEqual(["SUBMISSION", "GUIDANCE"]);
    expect(data.summary.submissions).toBe(1);
    expect(data.summary.trips).toBe(1);
    expect(buildMonthlyReportDataset(rows, {...filters, work: "SUBMISSION"}).rows[0].activityLabel).toBe("ยื่นหนังสือ");
    expect(buildMonthlyReportDataset(rows.map(r => ({...r, submissionId: undefined})), filters).rows).toHaveLength(2);
    expect(buildMonthlyReportDataset(rows.map(r => r.sourceType === "GUIDANCE" ? {...r, date: "2026-09-08"} : r), filters).rows).toHaveLength(2);
  });
  it("labels receipt delivery accurately while retaining its source record", () => {
    const [row] = build([sub("receipt", {status: "OTHER_ACTIVITY", otherActivityDetails: "ยื่นใบเสร็จ"})]);
    expect(row.activityLabel).toBe("ยื่นใบเสร็จ");
    expect(row.sourceId).toBe("receipt");
    expect(row.sourceType).toBe("SUBMISSION");
  });
  it("never assigns an absent lead's ID to a team member", () => {
    expect(reportPeople(["", "อาจารย์ผู้ร่วมงาน"], "lead-id")).toEqual([
      { name: "อาจารย์ผู้ร่วมงาน" },
    ]);
  });
  it("uses a stored responsible ID before a legacy name alias", () => {
    expect(reportPeople(["อ.ประชา"], "auth-uid")[0].id).toBe("auth-uid");
  });
  it("1 submissions only", () =>
    expect(calculateMonthlyReportSummary(build([sub()])).submissions).toBe(1));
  it("2 trips only", () =>
    expect(calculateMonthlyReportSummary(build([], [trip()])).trips).toBe(1));
  it("3 both sources", () => expect(build([sub()], [trip()])).toHaveLength(2));
  it("4 separate work rows on same date", () =>
    expect(
      build([sub()], [trip("t1", ["b"], { date: "2026-09-07" })]),
    ).toHaveLength(2));
  it("5 same school in both sources counts once", () =>
    expect(
      calculateMonthlyReportSummary(build([sub()], [trip()])),
    ).toMatchObject({ submissions: 1, trips: 1, uniqueSchools: 1 }));
  it("6 three schools in one trip", () => {
    const r = build([], [trip("t", ["a", "b", "c"])]);
    expect(r).toHaveLength(3);
    expect(calculateMonthlyReportSummary(r)).toMatchObject({
      trips: 1,
      guidanceSchools: 3,
    });
  });
  it("7 overlapping trips deduplicate schools only", () =>
    expect(
      calculateMonthlyReportSummary(
        build([], [trip("t1", ["a", "b", "c"]), trip("t2", ["a", "d"])]),
      ),
    ).toMatchObject({ trips: 2, guidanceSchools: 4 }));
  it("8 preserves both submitters", () =>
    expect(
      build([
        sub("s", { submittedByNames: ["อ.ประชา", "อ.ณิชชัยกุญช์"] }),
      ])[0].responsiblePeople.map((p) => p.name),
    ).toEqual(["อ.ประชา กัลปนารถ", "อ.ณิชชัยกุญช์ โลราช"]));
  it("9 never fills historical vehicle", () =>
    expect(build([sub()])[0].vehicleName).toBe("ไม่ระบุ"));
  it("10 never fills missing personnel from an account ID", () =>
    expect(
      build([sub("s", { submittedByName: "", submittedById: "usr_admin" })])[0]
        .responsiblePeople,
    ).toEqual([]));
  it("11 short school display does not mutate source", () => {
    const s = sub();
    expect(build([s])[0]).toMatchObject({ schoolId: "a", schoolName: "a" });
    expect(s.schoolName).toBe("โรงเรียนa");
  });
  it("12 never fuzzy matches similar or identical school names", () => {
    const r = build([
      sub("x", { schoolId: "", schoolName: "โรงเรียนa" }),
      sub("y", { schoolId: "missing", schoolName: "โรงเรียนa" }),
    ]);
    expect(r.every((s) => !s.schoolId)).toBe(true);
    expect(calculateMonthlyReportSummary(r)).toMatchObject({
      uniqueSchools: 0,
      unresolvedSchools: 2,
    });
  });
  it.each(["team1", "team2"] as const)("13/14 route filter %s", (team) => {
    const r = filterMonthlyReportRows(build([sub()], [trip()]), {
      ...filters,
      team,
    });
    expect(r).toHaveLength(1);
    expect(r[0].team).toBe(team);
  });
  it("15 all routes summary", () =>
    expect(
      buildMonthlyReportDataset(build([sub()], [trip()]), filters).teams,
    ).toHaveLength(2));
  it.each(["SUBMISSION", "GUIDANCE"] as const)(
    "16/17 work filter %s",
    (work) => {
      const d = buildMonthlyReportDataset(build([sub()], [trip()]), {
        ...filters,
        work,
      });
      expect(d.rows).toHaveLength(1);
      expect(d.rows[0].sourceType).toBe(work);
    },
  );
  it("18 current partial month has no end-of-month gate", () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    expect(
      filterMonthlyReportRows(build([sub("s", { submissionDate: date })]), {
        ...filters,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }),
    ).toHaveLength(1);
  });
  it("19 empty month", () =>
    expect(
      buildMonthlyReportDataset(build([sub()]), { ...filters, month: 10 })
        .summary,
    ).toMatchObject({ submissions: 0, trips: 0, uniqueSchools: 0 }));
  it("20 no student counts or photos in dataset/workbook", () => {
    const t = trip("t", ["a"]);
    t.schools[0].studentCount = 98765;
    t.photos = [{ id: "p", url: "https://example.invalid/secret.jpg" } as any];
    const d = buildMonthlyReportDataset(build([], [t]), filters);
    const content = JSON.stringify([d, buildMonthlyReportWorkbook(d)]);
    expect(content).not.toMatch(
      /98765|studentCount|secret.jpg|จำนวน นร.|จำนวนนักเรียน/,
    );
  });
  it("21 completed appointment alone never generates rows", () => {
    const input = {
      submissions: [],
      trips: [],
      appointments: [{ status: "COMPLETED" }],
    };
    expect(build(input.submissions, input.trips)).toEqual([]);
  });
  it("22 linked trip counted once regardless of appointment", () =>
    expect(
      calculateMonthlyReportSummary(
        build([], [trip("t", ["a", "b"], { appointmentId: "appt" })]),
      ).trips,
    ).toBe(1));
  it("23 submission row resolves exact original record", () => {
    const s = sub();
    expect(findMonthlyReportSource(build([s])[0], [s], []).record).toBe(s);
  });
  it("24 all guidance rows resolve same original trip", () => {
    const t = trip("t", ["a", "b"]);
    build([], [t]).forEach((r) =>
      expect(findMonthlyReportSource(r, [], [t]).record).toBe(t),
    );
  });
  it("same school submitted twice counts two submissions", () =>
    expect(
      calculateMonthlyReportSummary(build([sub("s1"), sub("s2")])),
    ).toMatchObject({ submissions: 2, uniqueSchools: 1 }));
  it("legacy code must be exact and unique", () => {
    expect(build([sub("s", { schoolId: "code-a" })])[0].schoolId).toBe("a");
    const r = buildMonthlyReportRows(
      [sub("s", { schoolId: "code-a" })],
      [],
      [...schools, { ...schools[0], id: "other" }],
    ).rows;
    expect(r[0].schoolId).toBeUndefined();
  });
  it("invalid dates excluded with warning and no guessing", () => {
    const result = buildMonthlyReportRows(
      [sub("s", { submissionDate: "2026-02-30" })],
      [],
      schools,
    );
    expect(result.rows).toEqual([]);
    expect(result.issues[0].reason).toBe("date");
  });
  it("unknown route is preserved and included in total", () =>
    expect(
      buildMonthlyReportDataset(
        build([sub("s", { teamId: undefined })]),
        filters,
      ).teams.at(-1)?.team,
    ).toBe("unknown"));
  it("weekday derived from actual date", () =>
    expect(reportDateLabels("2026-09-07")).toEqual({
      weekday: "จันทร์",
      date: "7/9/2569",
    }));
  it("deterministic sort", () =>
    expect(build([sub("z"), sub("a")])).toEqual(build([sub("a"), sub("z")])));
  it("retains stored registration even if different from default", () =>
    expect(
      build([sub("s", { vehicleName: "MITSU บน 6739" })])[0].vehicleName,
    ).toBe("MITSU บน 6739"));
  it("does not collapse people with similar names", () =>
    expect(reportPeople(["อ.ประชาชัย ทดสอบ", "อ.ประชา"])).toHaveLength(2));
  it("includes trip team members and deduplicates verified aliases", () =>
    expect(
      build(
        [],
        [
          trip("t", ["a"], {
            counselorName: "อ.ประชา",
            teamMemberNames: "อ.ประชา กัลปนารถ, อ.ณิชชัยกุญช์",
          }),
        ],
      )[0].responsiblePeople,
    ).toHaveLength(2));
  it("Excel uses exactly the filtered dataset and summary", () => {
    const d = buildMonthlyReportDataset(
      build([sub()], [trip("t", ["b", "c"])]),
      filters,
    );
    const book = buildMonthlyReportWorkbook(d);
    const rows = XLSX.utils.sheet_to_json<any[]>(
      book.Sheets["รายงานประจำเดือน"],
      { header: 1 },
    );
    expect(rows.slice(6)).toHaveLength(d.rows.length);
    expect(rows[5]).toHaveLength(8);
    const s = XLSX.utils.sheet_to_json<any[]>(book.Sheets["สรุปผล"], {
      header: 1,
    });
    expect(s[4].slice(1, 5)).toEqual([1, 1, 2, 3]);
  });
});
