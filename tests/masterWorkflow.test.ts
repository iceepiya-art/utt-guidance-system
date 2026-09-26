import {describe, it, expect} from 'vitest';
import {hasActualGuidance} from '../src/utils/actualGuidance';
import {visibleSubmissions} from '../src/utils/sourceRecords';
import type {School, DocumentSubmission, Appointment, FieldTrip} from '../src/types';
import {getSchoolWorkflow, SCHOOL_STATUS_LABELS} from '../src/utils/schoolStatus';
import {getDashboardSummary} from '../src/utils/dashboardSummary';
import {getSchoolActivityHistory} from '../src/utils/schoolActivityHistory';
import {getSubmissionWorkflow, getSubmissionWorkflowNote} from '../src/utils/submissionWorkflow';
import {buildGallerySources} from '../src/utils/gallerySources';
import {buildMonthlyReportRows} from '../src/utils/monthlyReport';
const school = {id:'s', schoolId:'1064620210', schoolName:'โรงเรียนชื่อปัจจุบัน', teamId:'team2',currentStatus:'NOT_STARTED'} as School;
const other = {...school,id:'other',schoolId:'1064620211'};
const sub = {id:'sub',schoolId:'1064620210',schoolName:'โรงเรียนชื่อในอดีต',submissionDate:'2026-09-01',status:'WAITING_APPOINTMENT',teamId:'team2',submittedByNames:['ครูหนึ่ง','ครูสอง']} as DocumentSubmission;
const appt = {id:'a',schoolId:'s',submissionId:'sub',date:'2026-09-02',status:'COMPLETED'} as Appointment;
const trip = {id:'t',appointmentId:'a',date:'2026-09-03',schools:[{schoolId:'s',schoolName:'โรงเรียนชื่อในอดีต'},{schoolId:'other',schoolName:'โรงเรียนชื่อปัจจุบัน'}],photos:[{url:'photo'}],teamId:'team2'} as FieldTrip;
const activity = {...sub,id:'open',status:'OTHER_ACTIVITY',otherActivityDetails:'Open House',submissionDate:'2026-10-01'} as DocumentSubmission;
describe('Master school workflow integration',()=>{
  it('hides only explicitly consolidated duplicates with a matching canonical school',()=>{
    const canonical={...sub,id:'canonical'};
    const duplicate={...sub,id:'duplicate',mergedIntoId:'canonical'};
    expect(visibleSubmissions([canonical,duplicate])).toEqual([canonical]);
    expect(visibleSubmissions([duplicate])).toEqual([duplicate]);
    expect(visibleSubmissions([{...canonical,schoolId:'another'},duplicate])).toHaveLength(2);
    expect(visibleSubmissions([canonical,{...sub,id:'unreviewed'}])).toHaveLength(2);
  });
  it('allows recording results for completed legacy appointments without real trips',()=>expect(hasActualGuidance(appt,[])).toBe(false));
  it('recognizes an actual appointment result',()=>expect(hasActualGuidance(appt,[trip])).toBe(true));
  it('does not use another appointment result sharing the same submission',()=>expect(hasActualGuidance(appt,[{...trip,appointmentId:'different',submissionId:sub.id}])).toBe(false));
  it('school only has no derived progress even if stored status is stale',()=>expect(getSchoolWorkflow({...school,currentStatus:'WAITING_APPOINTMENT'},[],[],[],[school]).status).toBe('NOT_STARTED'));
  it('other activity is selectable in step 2 without guidance progress',()=>{
    const w=getSchoolWorkflow(school,[activity],[],[],[school]);
    expect(w.schoolSubmissions).toHaveLength(1);expect(w.status).toBe('NOT_STARTED');expect(w.schoolAppointments).toHaveLength(0);expect(w.schoolTrips).toHaveLength(0);
    expect(getSchoolActivityHistory(school,[school],[activity],[],[])[0]).toMatchObject({sourceId:'open',activityLabel:'Open House'});
  });
  it('new other activity does not reset completed guidance cycle',()=>expect(getSchoolWorkflow(school,[sub,activity],[appt],[trip],[school,other]).status).toBe('GUIDANCE_COMPLETED'));
  it('new guidance letter starts a new current cycle but retains cumulative completion',()=>{
    const next={...sub,id:'next',submissionDate:'2026-10-01'};
    expect(getSchoolWorkflow(school,[sub,next],[appt],[trip],[school,other]).status).toBe('WAITING_APPOINTMENT');
    expect(getDashboardSummary([school,other],[sub,next],[appt],[trip]).all).toMatchObject({submitted:1,appointed:0,completed:2,pending:1});
  });
  it('completed appointment alone is not dashboard guidance',()=>expect(getDashboardSummary([school],[sub],[appt],[]).all).toMatchObject({submitted:1,appointed:1,completed:0}));
  it.each(['CONFIRMED','COMPLETED'] as const)('excludes actual guidance from total and team appointment counts even with %s appointment status',status=>{
    const result=getDashboardSummary([school],[sub],[{...appt,status}],[trip]);
    expect(result.all).toMatchObject({appointed:0,completed:1});
    expect(result.team2).toMatchObject({appointed:0,completed:1});
  });
  it('counts a new appointment after an earlier completed round',()=>{
    const next={...sub,id:'next',submissionDate:'2026-10-01'};
    const nextAppointment={...appt,id:'next-a',submissionId:'next',date:'2026-10-02',status:'CONFIRMED' as const};
    expect(getDashboardSummary([school],[sub,next],[appt,nextAppointment],[trip]).all).toMatchObject({appointed:1,completed:1});
  });
  it('other activity alone does not inflate dashboard submitted count',()=>expect(getDashboardSummary([school],[activity],[],[]).team2).toMatchObject({submitted:0,appointed:0,completed:0,pending:1}));
  it('final school wording matches requirement',()=>expect(SCHOOL_STATUS_LABELS.GUIDANCE_COMPLETED).toBe('แนะแนวเรียบร้อยแล้ว'));
  it.each(['WAITING_APPOINTMENT','WAITING_CONTACT','APPOINTED'] as const)('keeps normal badge and note separate for %s',status=>{
    const s={...sub,status,note:'ยื่นหนังสือแนะแนว'};
    expect(getSubmissionWorkflow(s,[appt],[trip]).display.label).toBe('ยื่นหนังสือแล้ว');expect(getSubmissionWorkflowNote(s,[appt],[trip])).toBe('แนะแนวเรียบร้อยแล้ว');
    expect(s.note).toBe('ยื่นหนังสือแนะแนว');
  });
  it('preserves a user-written note',()=>expect(getSubmissionWorkflowNote({...sub,note:'โทรหลัง 15:00'},[],[])).toBe('โทรหลัง 15:00'));
  it('shows the confirmed appointment instead of an old waiting note',()=>{
    const a={...appt,status:'CONFIRMED' as const,date:'2026-11-17',startTime:'13:54',endTime:''};
    const note=getSubmissionWorkflowNote({...sub,note:'รอติดต่อกลับ'},[a],[]);
    expect(note).toContain('นัดหมายแล้ว');expect(note).toContain('13:54');expect(note).not.toContain('รอติดต่อกลับ');
    expect(getSubmissionWorkflowNote({...sub,note:'นำเครื่องฉายไปด้วย'},[a],[])).toContain('นำเครื่องฉายไปด้วย');
  });
  it('preserves other activity note or source activity',()=>{
    expect(getSubmissionWorkflowNote(activity,[],[])).toBe('Open House');
    expect(getSubmissionWorkflowNote({...activity,note:'ส่งกำหนดการแล้ว'},[],[])).toBe('ส่งกำหนดการแล้ว');
  });
  it('source IDs stay identical across timeline, report and gallery for multi-school trips',()=>{
    for(const s of [school,other]){
      expect(getSchoolActivityHistory(s,[school,other],[sub],[appt],[trip]).find(x=>x.sourceType==='GUIDANCE')?.sourceId).toBe('t');
      expect(buildMonthlyReportRows([sub],[trip],[school,other]).rows.find(x=>x.sourceType==='GUIDANCE'&&x.schoolId===s.id)?.sourceId).toBe('t');
      expect(buildGallerySources([school,other],[sub],[appt],[trip]).find(x=>x.sourceType==='GUIDANCE')?.schoolIds).toContain(s.id);
    }
  });
  it('gallery resolves legacy code and retains separate source ownership of same URL',()=>{
    const rows=buildGallerySources([school,other],[{...sub,photos:trip.photos}],[{...appt,photos:trip.photos}],[trip]);
    expect(rows).toHaveLength(3);expect(rows.find(p=>p.sourceType==='SUBMISSION')?.schoolIds).toEqual(['s']);
    expect(rows.find(p=>p.sourceType==='LEGACY_APPOINTMENT')?.category).toBe('legacy');
  });
  it('school-specific photo is not attributed to every trip member',()=>expect(buildGallerySources([school,other],[],[],[{...trip,photos:[{url:'photo',schoolId:'1064620211'} as any]}])[0].schoolIds).toEqual(['other']));
  it('report preserves historical school name and missing vehicle and all people',()=>{
    const row=buildMonthlyReportRows([sub],[],[school]).rows[0];expect(row.schoolName).toBe('ชื่อในอดีต');expect(row.vehicleName).toBe('ไม่ระบุ');expect(row.responsiblePeople.map(p=>p.name)).toEqual(['ครูหนึ่ง','ครูสอง']);
    expect(row).not.toHaveProperty('studentCount');expect(row).not.toHaveProperty('photos');
  });
});
