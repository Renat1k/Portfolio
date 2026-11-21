import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {defaultLocale,locales,projectPath,localizedPath,siteUrl} from '../src/site.mjs';
import {content,ui} from '../src/copy.mjs';
import {render} from '../src/render.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)), dist=path.join(root,'dist');
const read=(name,from=dist)=>readFile(path.join(from,name),'utf8');
const data=async name=>JSON.parse((await read(`data/${name}.json`)).replace(/^\uFEFF/,''));
const projects=await data('projects'), profile=await data('profile');
const routes=['',...projects.map(projectPath),'404'];
const exists=async name=>assert.ok((await stat(path.join(dist,name)).catch(()=>null))?.isFile(),`Missing: ${name}`);
const unescape=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const pages=new Map(); let links=0;
for(const prefix of ['',...locales]) for(const route of routes) {
  const key=path.posix.join(prefix,route==='404'?'404.html':`${route}index.html`);
  const html=await read(key), lang=prefix || defaultLocale, {profile:p,projects:work}=content(profile,projects,lang);
  assert.equal(html,render(profile,projects,{lang,route,entry:!prefix}),`${key} stale build`);
  assert.equal(html,await read(key,root),`${key} stale deployable root`);
  assert.ok(html.includes(`<html lang="${lang}">`));
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,1);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,key);
  for(const l of locales) assert.ok(html.includes(`data-language="${l}" href="${localizedPath(l,route)}"`));
  for(const img of html.matchAll(/<img\b[^>]*>/g)) assert.match(img[0],/\balt="[^"]*"/);
  for(const url of Object.values(profile.socials)) if(route!=='404') assert.ok(html.includes(url),`${key}: ${url}`);
  if(route==='404') assert.ok(html.includes(ui[lang].missing));
  else {
    for(const l of locales) assert.ok(html.includes(`hreflang="${l}" href="${siteUrl+localizedPath(l,route)}"`));
    assert.ok(html.includes(`rel="canonical" href="${siteUrl+localizedPath(lang,route)}"`));
    const visible=unescape(html);
    if(!route){
      for(const v of [p.name,p.nickname,p.bio,p.status,p.location,p.role]) assert.ok(visible.includes(v),`${key}: ${v}`);
      assert.equal((html.match(/class="project-card"/g)||[]).length,projects.length);
      assert.ok(html.includes('id="sculpture"')); assert.ok(!/<(?:link|script|img)[^>]+(?:sculpture\.js|infinity(?:-lite)?\.glb)/.test(html),'3D must be opt-in');
    }
    for(const project of work.filter(p=>!route || projectPath(p)===route)){
      for(const v of [project.title,project.demo,project.repo,...(route?[project.description,...project.tags]:[project.lead])].filter(Boolean))assert.ok(visible.includes(v),`${key}: ${v}`);
      for(const src of project.screenshots || [project.image]) {assert.ok(html.includes(src.slice(1)),src);await exists(src.slice(2));}
    }
  }
  pages.set(key,{html,ids:new Set(ids)});
}
for(const [key,{html}] of pages) for(const match of html.matchAll(/\b(href|src|srcset)="([^"]+)"/g)) {
  const href=unescape(match[2]), u=new URL(href,`https://local.test/${key}`);
  assert.ok(!href.startsWith('//'),`${key}: ambiguous asset ${href}`);
  if(u.protocol==='mailto:'){assert.equal(href,`mailto:${profile.socials.email}`);continue;}
  assert.ok(['https:','http:'].includes(u.protocol),href);
  if(u.host!=='local.test')continue;
  let name=decodeURIComponent(u.pathname.slice(1));
  if(!name || name.endsWith('/'))name+='index.html';
  if(name.endsWith('/404'))name+='.html';
  await exists(name); if(u.hash)assert.ok(pages.get(name)?.ids.has(u.hash.slice(1)),`${key}: ${href}`);
  links++;
}
for(const lang of locales) await exists(`assets/img/social-${lang}.png`);
for(const m of (await read('assets/css/styles.css')).matchAll(/url\("([^"]+)"\)/g)) await exists(path.posix.join('assets/css',m[1]));
const headerBlocks=(await read('_headers',root)).split(/\r?\n\s*\r?\n/);
const broadIndex=headerBlocks.findIndex(b=>b.split(/\r?\n/)[0].trim()==='/assets/*');
assert.ok(broadIndex>=0,'Missing broad /assets/* cache rule');
for(const [rule,cache] of [['/assets/js/*','public, max-age=0, must-revalidate'],['/assets/css/*','public, max-age=0, must-revalidate']]){
  const index=headerBlocks.findIndex(b=>b.split(/\r?\n/)[0].trim()===rule), block=headerBlocks[index];
  assert.ok(index>broadIndex,`${rule} must come after /assets/* so it can detach Cache-Control`);
  const lines=block.split(/\r?\n/), detach=lines.findIndex(l=>l.trim()==='! Cache-Control'), set=lines.findIndex(l=>l.trim().startsWith('Cache-Control:'));
  assert.ok(detach>0 && set>detach,`${rule} must detach and then set Cache-Control`);
  assert.equal(lines[set].trim(),`Cache-Control: ${cache}`,`${rule} cache value`);
}
const workflow=(await read('.github/workflows/verify.yml',root)).split(/\r?\n/).map(l=>l.trim());
assert.ok(workflow.includes('- run: npm run test:browser'),'Browser tests must run in CI');
assert.ok(workflow.some(l=>l.includes('playwright-core/cli.js install')&&l.includes('--with-deps')),'CI must install the browser');
const triangles=[];
for(const [file,budget] of [['infinity.glb',175000],['infinity-lite.glb',90000]]) {
  const b=await readFile(path.join(dist,'assets/sculpture',file));
  assert.ok(b.length<budget); assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);
  const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.equal(j.meshes.length,2);assert.equal(j.materials.length,5);
  triangles.push(j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0));
}
assert.ok(triangles[1]<triangles[0]*.55);
for(const name of ['atelier.png','infinity-640.webp','infinity-1280.webp']) await exists(`assets/sculpture/${name}`);
for(const f of ['src/render.mjs','src/copy.mjs','src/site.mjs','assets/js/main.js','assets/js/sculpture.js','scripts/build.mjs','scripts/serve.mjs']){
  const r=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'}); assert.equal(r.status,0,r.stderr);
}
if(process.env.GITHUB_ACTIONS){
  const r=spawnSync('git',['status','--porcelain','--','index.html','projects','uk','en','404.html','sitemap.xml'],{cwd:root,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'','Checked-in HTML must match the build');
}
console.log(`${pages.size} pages, ${links} local destinations, both translations, original data and 3D budgets verified (${triangles.join(' / ')} triangles).`);
