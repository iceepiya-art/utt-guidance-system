const {chromium}=require(require('node:path').join(require('node:os').tmpdir(),'utt-monthly-report-qa/node_modules/playwright'));
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://localhost:3000/')?r.continue():r.abort());
 await page.goto('http://localhost:3000/?view=confirmed-report');await page.getByRole('heading',{name:'รายงานประจำเดือน',exact:true}).waitFor();
 for(const [month,team,count] of [['2026-07','all',49],['2026-07','team1',39],['2026-07','team2',10],['2026-08','team1',25],['2026-08','team2',38],['2026-08','all',63]]){
 await page.getByLabel('เดือน',{exact:true}).selectOption(month);await page.getByLabel('สายงาน',{exact:true}).selectOption(team);assert.equal(await page.locator('tbody tr').count(),count);
 }
 for(const [width,height] of [[1366,768],[1920,1080],[390,844]]){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByLabel('งานที่ปฏิบัติ',{exact:true}).selectOption('guidance');assert.equal(await page.locator('tbody tr').count(),24);
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('th').count(),6);assert.equal(await page.locator('.review-filters').isVisible(),false);assert.equal(await page.locator('img').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: localhost root, July 49/August 63, four datasets, work filter, three viewports, six-column print, no page errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
