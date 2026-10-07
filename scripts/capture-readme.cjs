const {chromium}=require('playwright');
const path=require('path');
const fs=require('fs');
(async()=>{
  let launch={headless:true};
  if(process.env.CURVE_CHROMIUM_PATH){launch={...launch,executablePath:process.env.CURVE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--single-process']};}
  const browser=await chromium.launch(launch);
  const page=await browser.newPage({viewport:{width:1120,height:900},deviceScaleFactor:2,colorScheme:'light',reducedMotion:'reduce'});
  await page.route('https://**/*',route=>route.abort());
  const input=process.env.CURVE_INPUT||path.resolve('index.html');
  await page.goto('file://'+input,{waitUntil:'load'});
  const frame=page.frameLocator('#codex-visualization');
  await frame.locator('#ec-view').waitFor();
  const inner=page.frames().find(f=>f!==page.mainFrame());
  const output=process.env.CURVE_IMAGES||'assets';fs.mkdirSync(output,{recursive:true});
  const shots=[['complex','complex-sheets'],['real','real-curve'],['lift','lift-to-intervals'],['glue','branch-cuts-and-handles'],['infinity','points-at-infinity'],['loops','custom-loops'],['cover','full-lift'],['region','admissible-interval-region']];
  for(const [view,name]of shots){
    await frame.locator('#ec-view').selectOption(view);
    if(view==='complex'){await frame.locator('#ec-phase').fill('360');}
    if(view==='glue'){await frame.locator('#gx-glue').fill('100');}
    if(view==='loops'){await frame.locator('#gx-one').click();}
    await page.waitForTimeout(150);
    const root=frame.locator('#erdos-curve-lab');
    const bounds=await root.boundingBox();
    // Keep the region's explanatory status; the long exact-point table remains in the app.
    let height=bounds.height;
    if(view==='region'){const status=await frame.locator('#gx-region-status').boundingBox();height=status.y+status.height-bounds.y+12;}
    await page.screenshot({path:path.join(output,name+'.png'),clip:{x:bounds.x,y:bounds.y,width:bounds.width,height},animations:'disabled'});
    const invalid=await inner.evaluate(()=>[...document.querySelectorAll('#erdos-curve-lab svg path')].some(p=>/NaN|Infinity/.test(p.getAttribute('d')||'')));
    if(invalid)throw Error('Invalid plot '+view);
  }
  await browser.close();console.log('Captured all eight views at 2× resolution.');
})().catch(e=>{console.error(e);process.exit(1)});
