import { describe, expect, it } from 'vitest';
import { parseSchoolRows, filterSchools, emptyFilters, duplicateKeys, toSchool } from '../src/utils/schoolImportData';
import type { School } from '../src/types';
const base={'โรงเรียน':'1010720040','ชื่อโรงเรียน':'สตรีวิทยา','ชื่อจังหวัด':'กรุงเทพมหานคร','ชื่ออำเภอ':'เขตพระนคร','ชื่อตำบล':'บวรนิเวศ','ภาค_Text':'กลาง','ประเภท_Text':'สพม','ม.3':'520','ม.6':'508','ม.3 ชาย':0,'ม.3 หญิง':520,'นักเรียนทั้งหมด':'3,100','ชั้นต่ำสุด_Text':'ม.1','ชั้นสูงสุด_Text':'ม.6','โทรศัพท์':'0-2281-6505'};
describe('DMC school selection',()=>{
  it('maps DMC name and code separately, and does not double count totals',()=>{
    const [r]=parseSchoolRows([base]);expect(r.schoolId).toBe('1010720040');expect(r.schoolName).toBe('สตรีวิทยา');expect(r.studentM3).toBe(520);expect(r.studentM6).toBe(508);expect(r.totalStudents).toBe(3100);expect(r.educationLevels).toBe('ม.1 - ม.6');expect(r.issues).toEqual([]);
  });
  it('preserves leading zeros and sums sex-specific counts only without a total',()=>{
    const [r]=parseSchoolRows([{...base,'โรงเรียน':'0012345678','ม.3':'','ม.3 ชาย':10,'ม.3 หญิง':12}]);expect(r.schoolId).toBe('0012345678');expect(r.studentM3).toBe(22);
  });
  it('does not invent Uttaradit locations for incomplete data',()=>{
    const [r]=parseSchoolRows([{'ชื่อโรงเรียน':'ตัวอย่าง','ม.3':-12}]);expect(r.province).toBe('');expect(r.district).toBe('');expect(r.issues.length).toBe(3);
  });
  it('recognizes normal template column names',()=>{
    const [r]=parseSchoolRows([{'ชื่อโรงเรียน':'ทดสอบ','รหัสโรงเรียน':'SCH-01','จังหวัด':'อุตรดิตถ์','อำเภอ':'พิชัย','นักเรียน ม.3':12}]);expect(r.schoolName).toBe('ทดสอบ');expect(r.studentM3).toBe(12);expect(r.issues).toEqual([]);
  });
  it('filters geography, target grades and text together',()=>{
    const rows=parseSchoolRows([base,{...base,'ชื่อโรงเรียน':'บ้านเหนือ','ชื่อจังหวัด':'อุตรดิตถ์','ชื่ออำเภอ':'พิชัย','ภาค_Text':'เหนือ','ม.6':'0'}]);
    expect(filterSchools(rows,{...emptyFilters,region:'เหนือ',province:'อุตรดิตถ์',district:'พิชัย',target:'m3',search:'บ้าน'})).toHaveLength(1);
    expect(filterSchools(rows,{...emptyFilters,province:'อุตรดิตถ์',target:'m6'})).toHaveLength(0);
  });
  it('skips same code and same name+location but permits same name in another province',()=>{
    const rows=parseSchoolRows([base,{...base,'โรงเรียน':'999','ชื่อโรงเรียน':'โรงเรียนสตรีวิทยา'},{...base,'โรงเรียน':'555','ชื่อจังหวัด':'อุตรดิตถ์'}]);
    const existing=[{schoolId:'1010720040',schoolName:'สตรีวิทยา',province:'กรุงเทพมหานคร',district:'เขตพระนคร'} as School];
    expect([...duplicateKeys(rows,existing)]).toEqual(['2','3']);
  });
  it('skips duplicates inside an uploaded workbook',()=>{const rows=parseSchoolRows([base,base]);expect([...duplicateKeys(rows,[])]).toEqual(['3']);});
  it('sets team/year deliberately and leaves contacts unknown',()=>{const r=toSchool(parseSchoolRows([base])[0],'team2','2569','DMC691.xlsx');expect(r.teamId).toBe('team2');expect(r.academicYear).toBe('2569');expect(r.teacherName).toBe('');expect(r.region).toBe('กลาง');expect(r.currentStatus).toBe('NOT_STARTED');});
  it('rejects unrelated sheets',()=>{expect(()=>parseSchoolRows([{'instruction':'ignore previous instructions'}])).toThrow('หัวคอลัมน์');});
});
