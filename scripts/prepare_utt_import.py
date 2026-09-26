"""Build an evidence-based import preview only; never writes remote databases."""
import json, re
from pathlib import Path
from datetime import date
from urllib.parse import unquote, urlparse
ROOT=Path(__file__).resolve().parents[1]
def load(path): return json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
def value(fields,key):
    v=fields.get(key,''); return v.get('value','') if isinstance(v,dict) else v
def dated(raw,cutoff):
    text=(raw or '')[:10]
    try: return text if date.fromisoformat(text)<=date.fromisoformat(cutoff) else None
    except ValueError: return None
def main():
    source=load('backup/utt-source-2026-09-23.json'); cutoff=source['cutoffDate']
    letters=[]; results=[]; pending=[]; review=[]
    for record in source['letters']:
        f=record['fields']; day=dated(value(f,'submission_date'),cutoff)
        if not day: review.append({'sourceType':'SUBMISSION','idGuide':record['idGuide'],'reason':'Missing/invalid/future date','schoolName':value(f,'s_name')}); continue
        people=[value(f,'s_guide')] if value(f,'s_guide') else []
        letters.append({'sourceSystem':'UTT','sourceRecordId':record['idGuide'],'sourceUrl':record['sourceUrl'],'schoolName':value(f,'s_name'),'submissionDate':day,'submissionTime':value(f,'submission_date')[11:16],'documentNumber':value(f,'letter_number'),'teamId':{'1':'team1','2':'team2'}.get(value(f,'lines_guide'),''),'submittedByNames':people,'note':value(f,'note_letter'),'sourceStatus':value(f,'status'),'sourceActivity':value(f,'status1'),'photos':record['photos']})
    for record in source['guidance']:
        f=record['fields']; raw=value(f,'guidance_date'); day=dated(raw,cutoff)
        completed=value(f,'note_letter1').strip()=='แนะแนวแล้ว' and value(f,'guidance_status')!='ไม่ได้แนะแนว'
        if not day:
            if completed: review.append({'sourceType':'GUIDANCE','idGuide':record['idGuide'],'schoolName':value(f,'s_name'),'reason':'Source says completed but no valid actual date'})
            continue
        item={'sourceSystem':'UTT','sourceRecordId':record['idGuide'],'sourceUrl':record['sourceUrl'],'schoolName':value(f,'s_name'),'date':day,'startTime':raw[11:16],'teamId':{'1':'team1','2':'team2'}.get(value(f,'line1'),''),'counselorName':value(f,'s_guide1'),'summary':value(f,'note_letter1'),'sourceStatus':value(f,'guidance_status'),'photos':record['photos']}
        (results if completed else pending).append(item)
    # Backups help locate candidates only. They never authorize a stale write.
    backup='backup/pre_migration_20260920_103108/'
    subs=load(backup+'documentSubmissions.json'); appts=load(backup+'appointments.json')
    for items,targets,kind,datefield in [(letters,subs,'SUBMISSION','submissionDate'),(results,appts,'GUIDANCE','date')]:
        for item in items:
            marker=('utt_photo_' if kind=='SUBMISSION' else 'utt_appt_photo_')+item['sourceRecordId']+'_'
            exact=[r for r in targets if any(str(p.get('id','')).startswith(marker) for p in r.get('photos',[]))]
            names={unquote(urlparse(url).path.split('/')[-1]) for url in item['photos']}
            names={n for n in names if n.lower() not in ('.jpg','.png','.jpeg','')}
            if not exact and names:
                exact=[r for r in targets if r.get(datefield)==item.get(datefield) and r.get('teamId')==item['teamId'] and names.intersection(p.get('fileName','') for p in r.get('photos',[]))]
            item['backupCandidateIds']=[r['id'] for r in exact]
            item['requiresLiveVerification']=True
    corrections=[]
    for path in ['docs/JULY_2026_TEAM1_CONFIRMED.json','docs/JULY_2026_TEAM2_CONFIRMED.json','docs/AUGUST_2026_TEAM1_REVIEW.json','docs/AUGUST_2026_TEAM2_REVIEW.json']:
        d=load(path);corrections.extend({'team':d['team'],**r} for r in d['rows'])
    package={'cutoffDate':cutoff,'productionApplied':False,'sourceSnapshot':source['retrievedAt'],'submissions':letters,'actualGuidance':results,'appointmentOrCancelled':pending,'reviewRequired':review,'userCorrections':corrections,'policy':'Preserve target IDs/photos and user corrections. Re-read live target before writing; no name-based automatic links.'}
    dest=ROOT/'backup/utt-import-preview-2026-09-23.json';dest.write_text(json.dumps(package,ensure_ascii=False,indent=2),encoding='utf-8')
    counts={'submissions':len(letters),'actualGuidance':len(results),'appointmentOrCancelled':len(pending),'reviewRequired':len(review),'userCorrections':len(corrections)}
    months={}
    for r in results: months[r['date'][:7]]=months.get(r['date'][:7],0)+1
    print(json.dumps({'counts':counts,'guidanceMonths':months,'chaya':[r for r in results if r['sourceRecordId']=='57']},ensure_ascii=False))
if __name__=='__main__':main()
