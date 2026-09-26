import { describe, it, expect } from 'vitest';
import { readSourceRecord } from '../src/utils/sourceRecords';
import { auditDataCompleteness, getSchoolContactSuggestion } from '../src/utils/dataCompleteness';
import type { School, DocumentSubmission, Appointment } from '../src/types';
const school = { id:'s', schoolId:'001', schoolName:'School', teamId:'team1', teacherName:'Teacher', teacherPhone:'123', schoolPhone:'456', province:'P', district:'D', studentM6:0 } as School;
const sub = { id:'letter', schoolId:'s', schoolName:'School', teamId:'team1', submissionDate:'2026-09-01', documentNumber:'1', submittedByName:'Teacher', vehicleName:'Recorded car', photos:[{url:'photo'}], teacherName:'Teacher', teacherPhone:'123' } as DocumentSubmission;
describe('data completeness and safe source reading', () => {
 it('uses document identity without mutating source', () => { const raw={id:'wrong'}; expect(readSourceRecord('schools','real',raw).id).toBe('real'); expect(raw.id).toBe('wrong'); });
 it('keeps absent historical facts empty', () => { const result=readSourceRecord('fieldTrips','t',{}); expect(result.date).toBe(''); expect(result.vehicleName).toBe(''); expect(result.schools).toEqual([]); });
 it('accepts zero M6 and unfinished workflows', () => expect(auditDataCompleteness([school],[],[],[])).toEqual([]));
 it('does not invent missing report facts', () => { const result=auditDataCompleteness([school],[{...sub,vehicleName:'',photos:[]}],[],[]); expect(result).toHaveLength(1); expect(result[0].missing).toHaveLength(2); expect(result[0].links).toEqual([]); });
 it('rejects matching names without stable school identity', () => expect(auditDataCompleteness([school],[{...sub,schoolId:'absent'}],[],[])[0].links.length).toBeGreaterThan(0));
 it('flags dangling source references', () => expect(auditDataCompleteness([school],[{...sub,appointmentId:'missing'}],[],[])[0].links).toHaveLength(1));
 it('flags completed appointments without results', () => { const appt={id:'a',schoolId:'s',teamId:'team1',date:'2026-09-02',startTime:'09:00',endTime:'10:00',counselorName:'Teacher',vehicleName:'car',status:'COMPLETED'} as Appointment; expect(auditDataCompleteness([school],[sub],[appt],[])[0].links).toHaveLength(1); });
 it('reuses latest verified contact pair', () => expect(getSchoolContactSuggestion({...school,teacherPhone:''},[school],[sub,{...sub,id:'new',submissionDate:'2026-09-20',teacherPhone:'789'}])?.teacherPhone).toBe('789'));
 it('never attaches another teachers phone', () => expect(getSchoolContactSuggestion(school,[school],[{...sub,teacherName:'Other'}])).toBeUndefined());
 it('ignores contact from same name but another school', () => expect(getSchoolContactSuggestion(school,[school],[{...sub,schoolId:'other'}])).toBeUndefined());
});
