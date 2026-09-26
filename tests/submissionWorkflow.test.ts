import {getSubmissionEditStatus} from '../src/utils/submissionUtils';
import {describe,it,expect} from 'vitest';
import {getSubmissionWorkflow} from '../src/utils/submissionWorkflow';
import type {DocumentSubmission,Appointment,FieldTrip} from '../src/types';
const sub={id:'letter1',schoolId:'s',status:'WAITING_APPOINTMENT'} as DocumentSubmission;
const appt={id:'a',submissionId:'letter1',schoolId:'s',status:'CONFIRMED',date:'2026-09-22'} as Appointment;
const trip={id:'t',appointmentId:'a',date:'2026-09-22'} as FieldTrip;
describe('per-letter workflow',()=>{
 it('shows waiting before scheduling',()=>expect(getSubmissionWorkflow(sub,[],[]).display.label).toBe('ยื่นหนังสือแล้ว'));
 it('shows linked appointment and date',()=>expect(getSubmissionWorkflow(sub,[appt],[]).appointment).toBe(appt));
 it('shows completed result by appointment link',()=>expect(getSubmissionWorkflow(sub,[appt],[trip]).result).toBe(trip));
 it('keeps completed appointments separate from guidance',()=>expect(getSubmissionWorkflow(sub,[{...appt,status:'COMPLETED'}],[]).display.label).toBe('ยื่นหนังสือแล้ว'));
 it('does not promote another round for the same school',()=>expect(getSubmissionWorkflow({...sub,id:'letter2'},[appt],[trip]).display.label).toBe('ยื่นหนังสือแล้ว'));
 it('ignores cancelled appointments',()=>expect(getSubmissionWorkflow(sub,[{...appt,status:'CANCELLED'}],[]).appointment).toBeUndefined());
 it('supports reverse reference',()=>expect(getSubmissionWorkflow({...sub,appointmentId:'a'},[{...appt,submissionId:undefined}],[]).appointment?.id).toBe('a'));
 it('rejects reverse reference that belongs to another letter',()=>expect(getSubmissionWorkflow({...sub,appointmentId:'a'},[{...appt,submissionId:'other'}],[]).appointment).toBeUndefined());
 it('accepts a result linked directly to letter',()=>expect(getSubmissionWorkflow(sub,[],[{...trip,submissionId:'letter1'}]).result?.id).toBe('t'));
 it('rejects a result with conflicting letter reference',()=>expect(getSubmissionWorkflow(sub,[appt],[{...trip,submissionId:'other'}]).result).toBeUndefined());
});

describe('legacy submission form status',()=>{
 it('opens normal guidance letters as submitted, preserving evidence and notes',()=>{const legacy={...sub,status:'OTHER_ACTIVITY',otherActivityDetails:'ยื่นหนังสือแนะแนว',note:'แนะแนวแล้ว',photos:[{url:'photo'}]} as DocumentSubmission;expect(getSubmissionEditStatus(legacy)).toBe('WAITING_APPOINTMENT');expect(legacy.note).toBe('แนะแนวแล้ว');expect(legacy.photos).toHaveLength(1);expect(legacy.status).toBe('OTHER_ACTIVITY');});
 it('keeps real other activities',()=>expect(getSubmissionEditStatus({...sub,status:'OTHER_ACTIVITY',otherActivityDetails:'Open House'})).toBe('OTHER_ACTIVITY'));
 it('recognizes the legacy activities array',()=>expect(getSubmissionEditStatus({...sub,status:'OTHER_ACTIVITY',activities:['ยื่นหนังสือแนะแนว']})).toBe('WAITING_APPOINTMENT'));
 it('does not infer a completed appointment from note text',()=>expect(getSubmissionEditStatus({...sub,note:'แนะแนวแล้ว'})).toBe('WAITING_APPOINTMENT'));
});
