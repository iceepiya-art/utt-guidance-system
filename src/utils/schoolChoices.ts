import type { School, TeamId } from '../types';
export function filterSchoolChoices(schools:School[], team:TeamId|'all', query:string):School[] {
  const clean=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('th').replace(/\s+/g,'');
  const words=query.trim().split(/\s+/).filter(Boolean).map(clean);
  return schools.filter(s=>(team==='all'||s.teamId===team)&&words.every(w=>clean([s.schoolName,s.schoolId,s.district,s.province].join(' ')).includes(w)));
}
