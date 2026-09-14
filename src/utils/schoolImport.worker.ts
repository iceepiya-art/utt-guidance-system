import { read, utils } from 'xlsx';
import { parseSchoolRows } from '../utils/schoolImportData';
self.onmessage = (event: MessageEvent<{buffer:ArrayBuffer;sheet?:string}>) => {
  try {
    const workbook=read(event.data.buffer,{type:'array',dense:true,cellHTML:false,cellStyles:false,cellFormula:false,sheets:event.data.sheet?[event.data.sheet]:undefined});
    const sheet=event.data.sheet||workbook.SheetNames[0];
    if(!sheet||!workbook.Sheets[sheet])throw new Error('ไม่พบแผ่นงานที่เลือก');
    const rows=utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets[sheet],{defval:'',raw:false});
    self.postMessage({sheets:workbook.SheetNames,sheet,rows:parseSchoolRows(rows)});
  } catch(e) { self.postMessage({error:e instanceof Error?e.message:'อ่านไฟล์ไม่สำเร็จ'}); }
};
