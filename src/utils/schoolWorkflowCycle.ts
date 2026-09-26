import type {DocumentSubmission, Appointment, FieldTrip} from '../types';

/** Select a current connected component, without inventing a cycle by name/date. */
export function selectCurrentSchoolCycle(submissions: DocumentSubmission[], appointments: Appointment[], trips: FieldTrip[]) {
  const nodes = [
    ...submissions.map(record => ({key:`SUBMISSION:${record.id}`,date:record.submissionDate || '',type:'SUBMISSION' as const,record})),
    ...appointments.map(record => ({key:`APPOINTMENT:${record.id}`,date:record.date || '',type:'APPOINTMENT' as const,record})),
    ...trips.map(record => ({key:`GUIDANCE:${record.id}`,date:record.date || '',type:'GUIDANCE' as const,record})),
  ].sort((a,b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
  const edges = new Map(nodes.map(n => [n.key,new Set<string>()]));
  const join=(a:string,b:string)=>{if(edges.has(a)&&edges.has(b)){edges.get(a)!.add(b);edges.get(b)!.add(a);}};
  for(const a of appointments){if(a.submissionId)join(`APPOINTMENT:${a.id}`,`SUBMISSION:${a.submissionId}`);}
  for(const s of submissions){
    if(s.appointmentId && !appointments.find(a=>a.id===s.appointmentId)?.submissionId)join(`SUBMISSION:${s.id}`,`APPOINTMENT:${s.appointmentId}`);
    if(s.fieldTripId && !trips.find(t=>t.id===s.fieldTripId)?.submissionId)join(`SUBMISSION:${s.id}`,`GUIDANCE:${s.fieldTripId}`);
  }
  for(const t of trips){
    if(t.submissionId)join(`GUIDANCE:${t.id}`,`SUBMISSION:${t.submissionId}`);
    const a=appointments.find(a=>a.id===t.appointmentId);
    if(t.appointmentId && !(t.submissionId && a?.submissionId && t.submissionId!==a.submissionId))join(`GUIDANCE:${t.id}`,`APPOINTMENT:${t.appointmentId}`);
  }
  const visited=new Set<string>();const pending=nodes[0]?[nodes[0].key]:[];
  while(pending.length){const key=pending.pop()!;if(visited.has(key))continue;visited.add(key);pending.push(...(edges.get(key)||[]));}
  return {
    submissions:submissions.filter(s=>visited.has(`SUBMISSION:${s.id}`)),
    appointments:appointments.filter(a=>visited.has(`APPOINTMENT:${a.id}`)),
    trips:trips.filter(t=>visited.has(`GUIDANCE:${t.id}`)),
    hasUnlinkedHistory: nodes.some(n=>!visited.has(n.key)),
  };
}
