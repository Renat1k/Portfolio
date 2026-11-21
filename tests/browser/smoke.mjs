// Run against dist/ by default, or against the actual release with PORTFOLIO_URL.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import axe from 'axe-core';
import { defaultLocale, locales, projectPath } from '../../src/site.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const data = JSON.parse((await readFile(new URL('../../data/projects.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
let server,browser;
let base = process.env.PORTFOLIO_URL?.replace(/\/$/,'');
const errors=[], checks=[];
async function test(name, action) { await action(); checks.push(name); console.log(`PASS ${name}`); }
function observe(page) {
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400 && !r.url().includes('missing-portfolio-page'))errors.push(`${r.status()} ${r.url()}`);});
}
const go=async(p,route='/')=>{
  const r=await p.goto(base+route,{waitUntil:'domcontentloaded'}); assert.equal(r.status(),200,route);
  await p.waitForLoadState('load'); await p.evaluate(()=>document.fonts.ready);
};
const lang=p=>p.locator('html').getAttribute('lang');
const overflow=async p=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${p.url()}, ${p.viewportSize().width}`);
const audit=async p=>{
  await p.evaluate(()=>document.querySelectorAll('[data-reveal]').forEach(el=>{el.classList.remove('will-reveal','is-visible');el.style.opacity='1';el.style.transform='none';}));
  await p.addScriptTag({content:axe.source});
  const violations=await p.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>[v.id,...v.nodes.map(n=>n.target)]));
  assert.deepEqual(violations,[],p.url());
};
const canvasDraws=p=>p.evaluate(()=>window.__artDraws);
async function instrument(context,options={}) {
  await context.addInitScript(({low,blocked,storage})=>{
    Object.defineProperty(navigator,'deviceMemory',{get:()=>low?2:8});
    Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>low?2:8});
    if(storage) Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Unavailable','SecurityError');}});
    if(blocked) {
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(id,...args){return id.startsWith('webgl')?null:original.call(this,id,...args);};
    }
    window.__artDraws=0;
    const proto=window.WebGLRenderingContext?.prototype; if(!proto) return;
    const draw=proto.drawElements;
    proto.drawElements=function(...args){ if(this.canvas.closest('#sculpture')) window.__artDraws++; return draw.apply(this,args); };
  },options);
}
try {
  if(!base){
    server=spawn(process.execPath,['scripts/serve.mjs','--dir','dist','--port','0'],{cwd:root,stdio:['ignore','pipe','inherit']});
    base=(await once(server.stdout,'data'))[0].toString().match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  }
  let exe=process.env.CHROME_BIN;
  if(!exe && process.platform==='win32') for(const candidate of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']){
    if(await access(candidate).then(()=>true).catch(()=>false)){exe=candidate;break;}
  }
  browser=await chromium.launch({executablePath:exe,headless:true});
  const desktop=await browser.newContext({locale:'en-US',viewport:{width:1440,height:900},permissions:['clipboard-read','clipboard-write']});
  await instrument(desktop); const page=await desktop.newPage();observe(page);
  const traffic=[]; page.on('request',r=>traffic.push(new URL(r.url()).pathname));
  await test('Default language is independent of the browser locale; 3D replaces the poster and has no controls',async()=>{
    await go(page);assert.equal(await lang(page),defaultLocale);
    assert.equal(await page.locator('.project-card').count(),data.length);
    assert.equal(await page.locator('.profile h1').textContent(),'FluentFable');
    assert.ok(await page.locator('.profile-avatar').isVisible());
    assert.ok(await page.locator('.profile-links a[href*="t.me/"]').isVisible());
    assert.equal(await page.locator('.will-reveal').count()>0,true);
    await page.waitForSelector('#sculpture[data-state="live"]',{timeout:15000});
    assert.ok(traffic.some(s=>s.endsWith('/infinity.glb')));
    assert.equal(await page.locator('#sculpture canvas').count(),1);
    assert.equal(await page.locator('.sculpture-poster').isVisible(),false);
    assert.equal(await page.locator('#art-toggle, #art-left, #art-right, #art-reset').count(),0);
    assert.equal(await page.locator('#art-launch').isVisible(),false);
    assert.ok(await page.locator('#sculpture canvas').evaluate(el=>el.tabIndex===0));
    await page.locator('#about').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.will-reveal.is-visible'));
    await audit(page);
  });
  await test('Language switch, selection on return and explicit deep links preserve route, search and section',async()=>{
    const route=projectPath(data[0]), other=locales.find(l=>l!==defaultLocale);
    await go(page,`/${route}?via=test#screens`);
    await page.locator(`[data-language="${other}"]`).click();
    await page.waitForURL(`${base}/${other}/${route}?via=test#screens`);assert.equal(await lang(page),other);
    await go(page,'/'); await page.waitForURL(`${base}/${other}/`);
    await go(page,`/${route}#screens`);await page.waitForURL(`${base}/${other}/${route}#screens`);
    await go(page,`/${defaultLocale}/${route}`);assert.equal(await lang(page),defaultLocale);
    await page.locator(`[data-language="${defaultLocale}"]`).click();await go(page);assert.equal(await lang(page),defaultLocale);
  });
  await test('Both locales: desktop links, all original cases, filters, gallery, copy and responsive layouts',async()=>{
    for(const l of locales){
      await go(page,`/${l}/`);
      for(const filter of ['site','bot','all']){
        const count=data.filter(p=>filter==='all'||p.type===filter).length;
        const btn=page.locator(`[data-filter="${filter}"]`);await btn.click();assert.equal(await page.locator('.project-card:visible').count(),count);
        assert.equal(await btn.getAttribute('aria-pressed'),'true');assert.match(await page.locator('#filter-status').textContent(),new RegExp(`${count}$`));
      }
      await page.locator('.desktop-nav a[href="#contact"]').click();await page.waitForURL(/#contact$/);
      await page.locator('#copy-email').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'fluentfabledev@gmail.com');
      const first=data[0], firstId=projectPath(first).split('/')[1], total=first.screenshots?.length||1;
      const opener=page.locator(`[data-gallery="${firstId}"]`).first();await opener.click();
      for(let i=0;i<total;i++){
        await page.waitForFunction(()=>{const img=document.querySelector('#gallery-image');return img.complete&&img.naturalWidth>0;});
        assert.equal(await page.locator('#gallery-counter').textContent(),`${String(i+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`); await page.keyboard.press('ArrowRight');
      }
      await page.locator('.gallery-thumb').nth(2).click();assert.equal(await page.locator('#gallery-counter').textContent(),'03 / 04');
      await audit(page);await page.keyboard.press('Escape');assert.ok(await opener.evaluate(el=>el===document.activeElement));
      for(const width of [320,390,768,1024,1440]) {await page.setViewportSize({width,height:844});await overflow(page);}
      for(const [i,project] of data.entries()){
        await go(page,`/${l}/${projectPath(project)}`);assert.equal(await lang(page),l);
        assert.equal(await page.locator('h1').textContent(),project.title);
        assert.equal(await page.locator('.detail-image-button').count(),project.screenshots?.length||1);
        assert.equal(await page.locator('.next-project').getAttribute('href'),`/${l}/${projectPath(data[(i+1)%data.length])}`);
        for(const url of [project.demo,project.repo].filter(Boolean)) assert.ok(await page.locator(`.detail-summary a[href="${url}"]`).isVisible());
        assert.ok(await page.locator('.detail-image-button img').first().evaluate(async el=>{await el.decode();return el.naturalWidth>0;}));
        await page.setViewportSize({width:320,height:760});await overflow(page);await page.setViewportSize({width:1440,height:900});
      }
      await audit(page);
    }
  });
  await test('GL auto-rotates; the poster is gone; drag and keys control a canvas that fills the frame; context loss falls back',async()=>{
    await go(page,'/en/');const art=page.locator('#sculpture');await page.waitForSelector('#sculpture[data-state="live"]');await page.waitForTimeout(1100);
    const canvas=art.locator('canvas');assert.ok(await canvasDraws(page)>0);assert.equal(await art.locator('img').isVisible(),false);assert.ok(await canvas.isVisible());
    const first=await canvas.screenshot();await page.waitForTimeout(850);assert.notDeepEqual(await canvas.screenshot(),first,'auto-rotation');
    const r=await canvas.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(120);
    const held=await canvas.screenshot();await page.mouse.move(r.x+r.width*.7,r.y+r.height*.6,{steps:8});await page.waitForTimeout(220);
    assert.notDeepEqual(await canvas.screenshot(),held,'manual drag');await page.mouse.up();await page.waitForTimeout(350);
    const resumed=await canvas.screenshot();await page.waitForTimeout(750);assert.notDeepEqual(await canvas.screenshot(),resumed,'auto-rotation resumes after release');
    // A vertical pull tilts the sculpture, then auto-levels back to pitch 0.
    await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await page.mouse.down();
    await page.mouse.move(r.x+r.width*.5,r.y+r.height*.78,{steps:8});await page.waitForFunction(()=>document.querySelector('#sculpture canvas').dataset.tilt==='tilted');
    await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#sculpture canvas').dataset.tilt==='level',{timeout:4000});
    await canvas.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);await page.keyboard.press('Home');await page.waitForTimeout(350);
    await audit(page);
    await canvas.evaluate(el=>el.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForSelector('#sculpture[data-state="still"]');assert.ok(await art.locator('img').isVisible());assert.match(await page.locator('#art-status').textContent(),/studio render/);
  });
  await test('Mobile: photo with launch button first, then light GLB, direct touch rotation and Ukrainian gallery controls',async()=>{
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,reducedMotion:'reduce'});
    await instrument(ctx,{low:true});const p=await ctx.newPage();observe(p);const req=[];p.on('request',r=>req.push(r.url()));await go(p,'/uk/');
    assert.ok(req.some(u=>u.endsWith('infinity-640.webp')));assert.ok(!req.some(u=>/\.glb$|sculpture\.js/.test(u)));
    assert.equal(await p.locator('#sculpture').getAttribute('data-state'),'still');
    assert.ok(await p.locator('.sculpture-poster').isVisible());assert.ok(await p.locator('#art-launch').isVisible());
    assert.equal(await p.locator('#art-launch span').textContent(),'Запустити 3D');
    await p.locator('#art-launch').tap();await p.waitForSelector('#sculpture[data-state="live"]',{timeout:15000});
    assert.ok(req.some(u=>u.endsWith('infinity-lite.glb')));assert.ok(!req.some(u=>u.endsWith('/infinity.glb')));
    assert.equal(await p.locator('.sculpture-poster').isVisible(),false);assert.equal(await p.locator('#art-launch').isVisible(),false);
    assert.equal(await p.locator('#art-toggle, #art-left, #art-right, #art-reset').count(),0);
    assert.ok(await p.locator('canvas').evaluate(c=>c.width<=Math.ceil(c.clientWidth)));
    await p.locator('#menu-toggle').tap();assert.ok(await p.locator('#menu-dialog').isVisible());await audit(p);
    await p.locator('.menu-links a[href="#projects"]').tap();await p.waitForURL(/#projects$/);
    assert.ok(!(await p.locator('#menu-dialog').isVisible()));await overflow(p);
    await p.locator('[data-gallery="fluentfable-bot"]').first().tap();const view=await p.locator('#gallery-viewport').boundingBox();
    const cdp=await ctx.newCDPSession(p),y=view.y+view.height*.5;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:view.x+view.width*.8,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:view.x+view.width*.25,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>document.querySelector('#gallery-counter').textContent==='02 / 03');
    await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#gallery-dialog').open);
    // Escape closes the gallery and the direct-touch rotation check runs last.
    await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(500);
    assert.equal(await p.locator('#sculpture').getAttribute('data-state'),'live');
    const draws=await canvasDraws(p),box=await p.locator('canvas').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.7,y:box.y+box.height*.5}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.3,y:box.y+box.height*.5}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(180);assert.ok(await canvasDraws(p)>draws);
    await ctx.close();
  });
  await test('No WebGL, blocked storage, disabled JS and language-specific HTTP 404',async()=>{
    const ctx=await browser.newContext();await instrument(ctx,{blocked:true,storage:true});const p=await ctx.newPage();observe(p);
    await go(p,'/uk/');await p.waitForFunction(()=>document.querySelector('#art-status').textContent.includes('недоступний'));
    assert.equal(await p.locator('#sculpture').getAttribute('data-state'),'still');assert.ok(await p.locator('.sculpture-poster').isVisible());
    assert.equal(await p.locator('#art-toggle, #art-left, #art-right, #art-reset').count(),0);await p.locator('[data-language="en"]').click();assert.equal(await lang(p),'en');
    for(const l of locales){const r=await p.goto(`${base}/${l}/missing-portfolio-page/`);assert.equal(r.status(),404);assert.equal(await lang(p),l);await audit(p);}
    await p.locator('[data-language="uk"]').click();assert.equal(await lang(p),'uk');await ctx.close();
    const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:760}});const plain=await nojs.newPage();
    await go(plain);assert.equal(await lang(plain),defaultLocale);    assert.equal(await plain.locator('.project-card').count(),data.length);assert.ok(await plain.locator('.sculpture-poster').isVisible());
    assert.equal(await plain.locator('#art-launch').isVisible(),false);assert.ok(!(await plain.locator('#art-toggle').isVisible()));await plain.locator('[data-language="en"]').click();await plain.locator('.project-title a').first().click();assert.equal(await lang(plain),'en');await nojs.close();
  });
  assert.deepEqual(errors,[]);console.log(`Verified ${checks.length} browser suites at ${base}.`);
} finally { await browser?.close();server?.kill(); }
