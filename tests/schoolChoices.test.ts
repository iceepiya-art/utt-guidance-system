import { expect, it } from 'vitest';
import { filterSchoolChoices } from '../src/utils/schoolChoices';
import type { School } from '../src/types';
const schools=[{id:'a',schoolId:'00123',schoolName:'โรงเรียนบ้านเหนือ',district:'พิชัย',province:'อุตรดิตถ์',teamId:'team1'},{id:'b',schoolId:'00456',schoolName:'โรงเรียนบ้านเหนือ',district:'เมืองสุโขทัย',province:'สุโขทัย',teamId:'team2'}] as School[];
it('separates identically named schools by assigned team',()=>{expect(filterSchoolChoices(schools,'team2','บ้านเหนือ').map(s=>s.id)).toEqual(['b']);});
it('searches name and location together',()=>{expect(filterSchoolChoices(schools,'all','บ้านเหนือ พิชัย').map(s=>s.id)).toEqual(['a']);});
it('finds codes with leading zeros and ignores surrounding whitespace',()=>{expect(filterSchoolChoices(schools,'all',' 00123 ').map(s=>s.id)).toEqual(['a']);});
it('returns no results without falling back to a school in a different team',()=>{expect(filterSchoolChoices(schools,'team1','00456')).toEqual([]);});
it('restores all choices when search and team filter are cleared',()=>{expect(filterSchoolChoices(schools,'all','')).toHaveLength(2);});
