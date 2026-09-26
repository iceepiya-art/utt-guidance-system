const path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require(path.join(require('node:os').tmpdir(),'utt-monthly-report-qa/node_modules/playwright'));
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const context=await browser.newContext(); const errors=[],external=[];
    await context.route('**/*',r=>{if(r.request().url().startsWith('http://localhost:3000/')||r.request().url().startsWith('data:')) return r.continue();external.push(r.request().url());return r.abort();});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto('http://localhost:3000/tests/browser/school-hub.html');
    const stages=[['2. ยื่นหนังสือประสานงาน','รายละเอียดการยื่นหนังสือ','HUB-LETTER-001'],['3. นัดหมายแนะแนว','รายละเอียดนัดหมาย','15 กันยายน 2569'],['4. ออกปฏิบัติงานแนะแนว','รายละเอียดการออกแนะแนว','GUIDANCE-SOURCE-NOTE']];
    const close=async(name)=>{const d=p.getByRole('dialog',{name,exact:true});await d.getByRole('button',{name:name==='รายละเอียดนัดหมาย'?'ปิดรายละเอียดนัดหมาย':'ปิดรายละเอียด',exact:true}).click();await d.waitFor({state:'detached'});};
    for(const [size,width,height] of [['1366',1366,768],['1920',1920,1080],['mobile',390,844]]){
      await p.setViewportSize({width,height});
      assert.equal(await p.getByRole('region',{name:'ประวัติการดำเนินงาน'}).count(),0);
      for(const [stage,name,signature] of stages){
        const button=p.getByRole('button',{name:new RegExp('^'+stage.replace('.','\\.'))});await button.scrollIntoViewIfNeeded();await button.focus();await button.press('Enter');
        const d=p.getByRole('dialog',{name,exact:true});await d.waitFor();assert((await d.innerText()).includes(signature));
        if(name==='รายละเอียดนัดหมาย'){assert.equal(await d.locator('img').count(),0);assert(!(await d.innerText()).includes('APPOINTMENT-SOURCE-NOTE'));assert(!(await d.innerText()).includes('GUIDANCE-SOURCE-NOTE'));}
        if(name!=='รายละเอียดนัดหมาย'){
          const photo=d.locator('img').first();await photo.scrollIntoViewIfNeeded();assert(await photo.evaluate(e=>e.complete&&e.naturalWidth>0));
          await photo.click();await p.getByRole('dialog',{name:'รูปกิจกรรมขนาดเต็ม'}).waitFor();await p.getByRole('button',{name:'ปิดรูปกิจกรรม',exact:true}).click();
        }
        await close(name);assert(await button.evaluate(e=>e===document.activeElement));
      }
      await p.getByRole('button',{name:/^2\. ยื่นหนังสือ/}).scrollIntoViewIfNeeded();
      await p.screenshot({path:`docs/qa-school-hub/timeline-${size}.png`});
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await p.getByLabel('รอบทดสอบ').selectOption('empty');
    for (const n of [2,3,4]) assert(await p.getByRole('button',{name:new RegExp('^'+n+'[.]')}).isDisabled());
    await p.getByLabel('รอบทดสอบ').selectOption('other');
    assert((await p.locator('p[role=status]').innerText()).includes('ยังไม่ได้ยื่นหนังสือแนะแนว'));
    assert(await p.getByRole('button',{name:/^3[.] นัดหมาย/}).isDisabled());
    assert(await p.getByRole('button',{name:/^4[.] ออกปฏิบัติงาน/}).isDisabled());
    await p.getByRole('button',{name:/^2[.] ยื่นหนังสือ/}).click();
    assert((await p.getByRole('dialog',{name:'รายละเอียดการยื่นหนังสือ',exact:true}).innerText()).includes('Open House'));
    await close('รายละเอียดการยื่นหนังสือ');
    await p.getByLabel('รอบทดสอบ').selectOption('multiple');
    for(let i=0;i<stages.length;i++){
      const [stage,name,signature]=stages[i];const step=p.getByRole('button',{name:new RegExp('^'+stage.replace('.','\\.'))});
      await step.focus();await step.press('Space');const chooser=p.getByRole('region',{name:'เลือกรายการ '+stage});assert.equal(await chooser.getByRole('button').count(),2);
      for(const [index,text] of [[0,['NEXT-CYCLE','15 กันยายน 2570','SECOND-GUIDANCE'][i]],[1,signature]]){const choice=chooser.getByRole('button').nth(index);await choice.click();const d=p.getByRole('dialog',{name,exact:true});await d.waitFor();assert((await d.innerText()).includes(text));await close(name);assert(await choice.evaluate(e=>e===document.activeElement));}
      await step.click();assert.equal(await chooser.count(),0);
    }
    await p.getByLabel('รอบทดสอบ').selectOption('legacy');assert(await p.getByRole('button',{name:/^4\. ออกปฏิบัติงาน/}).isDisabled());assert(!(await p.locator('p[role=status]').innerText()).includes('แนะแนวเรียบร้อยแล้ว'));
    await p.getByRole('button',{name:/^3\. นัดหมาย/}).click();await p.getByRole('dialog',{name:'รายละเอียดนัดหมาย',exact:true}).waitFor();await close('รายละเอียดนัดหมาย');
    await p.getByRole('button',{name:'สลับรายงาน'}).click();await p.getByLabel('ปี พ.ศ.',{exact:true}).selectOption('2026');await p.getByLabel('เดือน',{exact:true}).selectOption('9');
    for(const [text,name,signature] of [['ยื่นหนังสือ','รายละเอียดการยื่นหนังสือ','HUB-LETTER-001'],['ออกแนะแนว','รายละเอียดการออกแนะแนว','GUIDANCE-SOURCE-NOTE']]){await p.locator('.monthly-card').filter({hasText:text}).click();const d=p.getByRole('dialog',{name,exact:true});await d.waitFor();assert((await d.innerText()).includes(signature));await close(name);}
    await p.emulateMedia({media:'print'});
    const print=p.locator('.monthly-print-document');
    assert(await print.isVisible());assert.equal(await print.locator('th').count(),6);assert.equal(await print.locator('img').count(),0);
    assert(!(await print.innerText()).includes('จำนวนนักเรียน'));
    await p.emulateMedia({media:'screen'});
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('PASS: 3 viewports, no History section, single/multiple source selection, evidence photos, keyboard and close focus, legacy not Guidance, Monthly Report source parity; external requests=0');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
