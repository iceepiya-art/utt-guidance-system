import type { School, TeamId } from '../types';

export interface ImportSchool {
  key: string; rowNumber: number; schoolId: string; schoolName: string;
  region: string; province: string; district: string; subdistrict: string;
  schoolType: string; areaName: string; schoolSize: string; opportunity: string;
  educationLevels: string; studentM3: number; studentM6: number; totalStudents: number;
  schoolPhone: string; postalCode: string; issues: string[];
}
export interface ImportFilters {
  region: string; province: string; district: string; subdistrict: string;
  schoolType: string; schoolSize: string; target: string; opportunity: string; search: string;
}
export const emptyFilters: ImportFilters = { region:'', province:'', district:'', subdistrict:'', schoolType:'', schoolSize:'', target:'', opportunity:'', search:'' };
export const text = (v: unknown) => v == null ? '' : String(v).trim();
export const normalize = (v: string) => v.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
export const locationKey = (s: Pick<ImportSchool, 'schoolName'|'province'|'district'>) => [normalize(s.schoolName).replace(/^โรงเรียน/, ''), normalize(s.province).replace(/^จังหวัด/,''), normalize(s.district).replace(/^อำเภอ/,'')].join('|');
export function parseSchoolRows(records: Record<string, unknown>[]): ImportSchool[] {
  if (records.length > 50000) throw new Error('รองรับไม่เกิน 50,000 แถวต่อแผ่นงาน');
  if (!records.length) throw new Error('แผ่นงานนี้ไม่มีข้อมูล');
  const headers = Object.keys(records[0]).map(normalize);
  if (!['ชื่อโรงเรียน','schoolname','school_name','โรงเรียน'].some(h => headers.includes(h))) throw new Error('ไม่พบหัวคอลัมน์ชื่อโรงเรียน กรุณาเลือกแผ่นงานที่มีหัวตารางอยู่แถวแรก');
  return records.map((record,index) => {
    const row = Object.fromEntries(Object.entries(record).map(([k,v]) => [normalize(k), v]));
    const value = (...keys: string[]) => { for (const k of keys) if (text(row[normalize(k)]) !== '') return text(row[normalize(k)]); return ''; };
    const issues: string[] = [];
    const count = (label: string, v: string) => { if (!v || v === '-') return 0; const n=Number(v.replace(/,/g,'')); if (!Number.isSafeInteger(n) || n<0) { issues.push(`${label}ไม่ใช่จำนวนเต็มที่ถูกต้อง`);return 0; }return n; };
    const grade = (name: string, alias: string) => {
      const total=value(name,`นักเรียน ${name}`,alias);
      return total !== '' ? count(name,total) : count(name,value(`${name} ชาย`))+count(name,value(`${name} หญิง`));
    };
    const schoolName=value('ชื่อโรงเรียน','schoolName','school_name','โรงเรียน');
    const province=value('ชื่อจังหวัด','จังหวัด','province');const district=value('ชื่ออำเภอ','อำเภอ','district');
    // DMC stores the official 10-digit identifier under โรงเรียน; it is not a school name.
    const schoolId=value('รหัสโรงเรียน','schoolId','code') || (row[normalize('ชื่อโรงเรียน')] ? value('โรงเรียน') : '');
    if(!schoolName)issues.push('ไม่มีชื่อโรงเรียน');if(!province)issues.push('ไม่มีจังหวัด');if(!district)issues.push('ไม่มีอำเภอ');
    const lower=value('ชั้นต่ำสุด_Text'); const upper=value('ชั้นสูงสุด_Text');
    return { key:String(index+2),rowNumber:index+2, schoolId,schoolName,province,district,
      region:value('ภาค_Text','ภาค','region'),subdistrict:value('ชื่อตำบล','ตำบล','subdistrict'),
      schoolType:value('ประเภท_Text','สังกัด','ประเภท'),areaName:value('ชื่อเขต','เขตพื้นที่การศึกษา'),
      schoolSize:value('เกณฑ์ ก.ค.ศ.','ขนาดโรงเรียน'),opportunity:value('ขยายโอกาส'),
      educationLevels:lower && upper ? `${lower} - ${upper}` : value('ระดับชั้น','ช่วงชั้น','educationLevels'),
      studentM3:grade('ม.3','studentM3'),studentM6:grade('ม.6','studentM6'),totalStudents:count('นักเรียนทั้งหมด',value('นักเรียนทั้งหมด','totalStudents')),
      schoolPhone:value('โทรศัพท์','เบอร์โรงเรียน','โทรศัพท์โรงเรียน','schoolPhone'),postalCode:value('ไปรษณีย์','รหัสไปรษณีย์'),issues };
  }).filter(r=>r.schoolName || r.schoolId || r.province);
}
export function duplicateKeys(rows: ImportSchool[], schools: School[]): Set<string> {
  const codes=new Set(schools.map(s=>normalize(s.schoolId||'')).filter(Boolean));
  const names=new Set(schools.map(locationKey));const duplicates=new Set<string>();
  for(const row of rows) { if(row.issues.length)continue; const code=normalize(row.schoolId);const name=locationKey(row);
    if ((code && codes.has(code)) || names.has(name)) duplicates.add(row.key);
    else {if(code)codes.add(code);names.add(name);} }
  return duplicates;
}
export function filterSchools(rows: ImportSchool[], f: ImportFilters): ImportSchool[] {
  const q=normalize(f.search);
  return rows.filter(r => (!f.region||r.region===f.region)&&(!f.province||r.province===f.province)&&(!f.district||r.district===f.district)&&(!f.subdistrict||r.subdistrict===f.subdistrict)&&(!f.schoolType||r.schoolType===f.schoolType)&&(!f.schoolSize||r.schoolSize===f.schoolSize)&&(!f.opportunity||r.opportunity===f.opportunity)&&(!f.target||(f.target==='m3'?r.studentM3>0:f.target==='m6'?r.studentM6>0:r.studentM3+r.studentM6>0))&&(!q||normalize([r.schoolName,r.schoolId,r.areaName].join(' ')).includes(q)));
}
export function toSchool(row: ImportSchool, teamId: TeamId, academicYear: string, sourceFile: string): Omit<School,'id'> {
  return {schoolId:row.schoolId,schoolName:row.schoolName,province:row.province,district:row.district,
    educationLevels:row.educationLevels,studentM3:row.studentM3,studentM6:row.studentM6,schoolPhone:row.schoolPhone,
    teacherName:'',teacherPosition:'',teacherPhone:'',teacherLine:'',preferredContactTime:'',teamId,currentStatus:'NOT_STARTED',note:'',academicYear,
    region:row.region,subdistrict:row.subdistrict,schoolType:row.schoolType,areaName:row.areaName,schoolSize:row.schoolSize,totalStudents:row.totalStudents,postalCode:row.postalCode,
    importSource:sourceFile,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
