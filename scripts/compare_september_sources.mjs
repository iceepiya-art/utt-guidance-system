import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('backup/utt-source-2026-09-26.json');
const target=read('backup/target-after-utt-fill-2026-09-25T02-23-44-693Z.json');
const expected=['TEAM1','TEAM2'].flatMap(team=>read(`docs/SEPTEMBER_2026_${team}_CONFIRMED.json`).rows);
const norm=s=>(s||'').normalize('NFKC').replace(/^(โรงเรียน)+/,'').replace(/[\s()."“”]/g,'');
const value=(r,k)=>r.fields[k]?.value??r.fields[k]??'';
const entries=[];
for(const [kind,dateKey,teamKey]of [['letters','submission_date','lines_guide'],['guidance','guidance_date','line1']]){
 for(const r of source[kind]){
  const date=value(r,dateKey).slice(0,10);if(!date.startsWith('2026-09'))continue;
  const old=target[kind==='letters'?'documentSubmissions':'fieldTrips'].find(t=>t.sourceRecordId===r.idGuide&&!t.mergedIntoId);
  const schoolId=old?.schoolId||old?.schools?.[0]?.schoolId;
  const school=target.schools.find(s=>s.id===schoolId);
  const schoolName=school?.schoolName||value(r,'s_name');
  entries.push({kind,id:r.idGuide,date,schoolName,sourceName:value(r,'s_name'),team:value(r,teamKey),activity:kind==='guidance'?'แนะแนว':value(r,'note_letter').trim()==='ยื่นใบเสร็จ'?'ยื่นใบเสร็จ':'ยื่นหนังสือ',note:value(r,kind==='guidance'?'note_letter1':'note_letter'),person:value(r,kind==='guidance'?'s_guide1':'s_guide'),photos:r.photos.length,url:r.sourceUrl});
 }
}
const comparisons=expected.map(row=>{
 const matches=entries.filter(e=>e.date===row.date&&norm(e.schoolName)===norm(row.schoolName)&&e.activity===row.activity);
 return {...row,matches,teamMismatch:matches.filter(e=>e.team!==row.teamId.slice(-1)).map(e=>e.id)};
});
const matchedIds=new Set(comparisons.flatMap(c=>c.matches.map(e=>`${e.kind}:${e.id}`)));
const extra=entries.filter(e=>!matchedIds.has(`${e.kind}:${e.id}`));
const result={readAt:source.retrievedAt,period:'2026-09',targetComparison:'Snapshot 2026-09-25 only; current target authentication unavailable',sourceCounts:{letters:entries.filter(e=>e.kind==='letters').length,guidance:entries.filter(e=>e.kind==='guidance').length},expectedCounts:{total:expected.length,letters:expected.filter(e=>e.activity==='ยื่นหนังสือ').length,receipts:expected.filter(e=>e.activity==='ยื่นใบเสร็จ').length,guidance:expected.filter(e=>e.activity==='แนะแนว').length},matchedRows:comparisons.filter(c=>c.matches.length).length,missing:comparisons.filter(c=>!c.matches.length),multiple:comparisons.filter(c=>c.matches.length>1),teamMismatch:comparisons.filter(c=>c.teamMismatch.length),extra,comparisons};
fs.writeFileSync('backup/september-source-comparison-2026-09-26.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,comparisons:undefined},null,2));
