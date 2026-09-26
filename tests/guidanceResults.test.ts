import {describe,it,expect} from 'vitest';
import {getGuidanceResults} from '../src/utils/guidanceResults';
import {getSchoolWorkflow} from '../src/utils/schoolStatus';
import type {School,Appointment,FieldTrip,DocumentSubmission} from '../src/types';
const school={id:'school-doc',schoolId:'1064620210',schoolName:'ไชยะวิทยา'} as School;
const appt={id:'a',schoolId:school.schoolId,schoolName:school.schoolName,date:'2026-08-10',status:'COMPLETED',startTime:'10:30',endTime:'12:00',counselorName:'อ.ปิยะ',vehicleName:'MITSU บน 6738',note:'แนะแนวแล้ว',photos:[{url:'/photo.jpg'}]} as Appointment;
describe('shared guidance results',()=>{
 it('school timeline sees the same completed result and evidence as guidance list',()=>{const results=getGuidanceResults([],[appt],[],[school]);const workflow=getSchoolWorkflow(school,[],[appt],results,[school]);expect(workflow.schoolTrips).toEqual(results);expect(results).toEqual([]);expect(workflow.status).toBe('APPOINTED');});
 it('does not duplicate a real linked result',()=>{const trip={id:'t',appointmentId:'a',date:appt.date,schools:[]} as FieldTrip;expect(getGuidanceResults([trip],[appt],[],[school])).toEqual([trip]);});
 it('deduplicates exact school code and date',()=>{const trip={id:'t',date:appt.date,schools:[{schoolId:school.id}]} as FieldTrip;expect(getGuidanceResults([trip],[appt],[],[school])).toHaveLength(1);});
 it('never borrows another school result by name',()=>{const trip={id:'t',date:appt.date,schools:[{schoolId:'other',schoolName:school.schoolName}]} as FieldTrip;expect(getGuidanceResults([trip],[appt],[],[school])).toHaveLength(1);});
 it('never substitutes letter evidence for guidance evidence',()=>{const sub={id:'s',photos:[{url:'/letter.jpg'}]} as DocumentSubmission;expect(getGuidanceResults([],[{...appt,submissionId:'s',photos:[]}],[sub],[school])).toEqual([]);});
 it('excludes appointments that have not completed',()=>expect(getGuidanceResults([],[{...appt,status:'CONFIRMED'}],[],[school])).toEqual([]));
 it('does not mutate source arrays',()=>{const trips:FieldTrip[]=[];getGuidanceResults(trips,[appt],[],[school]);expect(trips).toEqual([]);expect(appt.schoolId).toBe(school.schoolId);});
});
