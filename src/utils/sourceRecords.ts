// Read-only shape adaptation. Missing text stays empty; never manufacture dates,
// personnel, vehicles or relations. Firestore document identity is authoritative.
export type SourceCollection = 'schools' | 'documentSubmissions' | 'appointments' | 'fieldTrips';
/** Hide only explicitly consolidated records whose canonical record still exists. */
export function visibleSubmissions<T extends {id:string; schoolId:string; mergedIntoId?:string}>(records:T[]):T[] {
  return records.filter(r => !r.mergedIntoId || !records.some(c => c.id === r.mergedIntoId && c.id !== r.id && !c.mergedIntoId && c.schoolId === r.schoolId));
}
const textFields: Record<SourceCollection, string[]> = {
  schools: ['schoolName', 'schoolId', 'district', 'province', 'teacherName', 'teacherPhone', 'schoolPhone', 'educationLevels'],
  documentSubmissions: ['schoolId', 'schoolName', 'submissionDate', 'submissionTime', 'documentNumber', 'submittedByName', 'teacherName', 'teacherPhone'],
  appointments: ['schoolId', 'schoolName', 'date', 'startTime', 'endTime', 'counselorName', 'teacherName', 'teacherPhone', 'note'],
  fieldTrips: ['date', 'workType', 'counselorName', 'vehicleName'],
};
export function readSourceRecord(collection: SourceCollection, id: string, raw: Record<string, unknown>) {
  const value: Record<string, any> = { ...raw, id };
  for (const field of textFields[collection]) {
    if (typeof value[field] !== 'string') value[field] = '';
  }
  if (collection !== 'schools') value.photos = Array.isArray(raw.photos) ? raw.photos : [];
  if (collection === 'fieldTrips') value.schools = Array.isArray(raw.schools)
    ? raw.schools.filter(s => s && typeof s === 'object').map(s => ({ ...s,
      schoolId: typeof s.schoolId === 'string' ? s.schoolId : '', schoolName: typeof s.schoolName === 'string' ? s.schoolName : '' })) : [];
  return value;
}
