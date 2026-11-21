import { content, ui } from './copy.mjs';
import { defaultLocale, locales, localizedPath, projectPath, siteUrl } from './site.mjs';

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = x => JSON.stringify(x).replace(/</g,'\\u003c');
const num = n => String(n).padStart(2,'0');
const asset = s => `/${s.replace(/^(?:\.\/|\/)/,'')}`;
const preview = s => asset(s).replace(/\.(png|jpe?g)$/i,'.webp');
const shots = p => (p.screenshots || [p.image]).map(asset);
const glyphs = { arrow:'M4 12h15m-6-6 6 6-6 6', external:'M6 18 18 6M7 6h11v11', down:'M12 4v16m-6-6 6 6 6-6', up:'M12 20V4m-6 6 6-6 6 6',
  prev:'m14 5-7 7 7 7', next:'m10 5 7 7-7 7', close:'m6 6 12 12M18 6 6 18', menu:'M3 8h18M3 16h18',
  copy:'M8 6H4v15h11v-4M8 3h11v14H8z', cube:'m12 2 9 5v10l-9 5-9-5V7zm0 10L3 7m9 5 9-5m-9 5v10' };
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${glyphs[name]}"/></svg>`;
const ext = (url, label, aria, className='text-action') => `<a class="${className}" href="${esc(url)}"${url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener noreferrer"'}${aria ? ` aria-label="${esc(aria)}"` : ''}>${esc(label)}${icon('external')}</a>`;
const tagList = (p, u) => `<ul class="tags" aria-label="${u.stack}">${p.tags.map(tag => `<li>${esc(tag)}</li>`).join('')}</ul>`;
const iconButton = (id, label, glyph) => `<button type="button" id="${id}" class="icon-button" aria-label="${label}" title="${label}">${icon(glyph)}</button>`;

function header({ p, u, lang, route, home }) {
  const origin = localizedPath(lang), prefix = home ? '' : origin;
  const links = ['projects','about','contact'].map(id => `<a href="${prefix}#${id}">${u[id]}</a>`).join('');
  const languages = locales.map(code => `<a data-language="${code}" href="${localizedPath(code,route)}" lang="${code}" hreflang="${code}" aria-label="${code === 'uk' ? 'Українська' : 'English'}"${code === lang ? ' aria-current="true"' : ''}>${code === 'uk' ? 'UA' : 'EN'}</a>`).join('<span aria-hidden="true">/</span>');
  return `<header class="site-header"><div class="shell header-inner">
    <nav class="desktop-nav" aria-label="${u.nav}">${links}</nav>
    <button class="menu-toggle js-only" id="menu-toggle" type="button" aria-label="${u.menuOpen}" aria-controls="menu-dialog" aria-expanded="false">${icon('menu')}<span>${u.menu}</span></button>
    <a class="wordmark" href="${home ? '#top' : origin}" aria-label="${esc(p.name)} — ${u.home}">${esc(p.name)}</a>
    <nav class="languages" aria-label="${u.language}">${languages}</nav></div><span class="scroll-progress" id="scroll-progress" aria-hidden="true"></span>
    <noscript><nav class="noscript-nav shell" aria-label="${u.nav}">${links}</nav></noscript>
  </header>
  <dialog class="menu-dialog" id="menu-dialog" aria-label="${u.nav}"><div class="shell menu-inner"><div class="menu-head"><span class="caption">${u.menu}</span>${iconButton('menu-close',u.menuClose,'close')}</div><nav class="menu-links" aria-label="${u.nav}">${links}</nav></div></dialog>`;
}

function footer({p,u}) {
  return `<footer class="site-footer shell"><p>© <span data-year>2026</span> ${esc(p.name)} <span aria-hidden="true">/</span> ${esc(u.built)}</p><a class="text-action" href="#top">${u.top}${icon('up')}</a></footer>`;
}

function sculpture(u) {
  return `<figure class="sculpture" id="sculpture" data-state="still">
    <div class="sculpture-frame"><picture><source media="(max-width: 700px)" srcset="/assets/sculpture/infinity-640.webp"><img class="sculpture-poster" src="/assets/sculpture/infinity-1280.webp" width="1280" height="800" fetchpriority="high" alt="${u.artAlt}"></picture></div>
    <figcaption><div class="sculpture-credit"><span class="caption">${u.artLabel}</span><span>Chrome Infinity</span></div>
    <p class="sculpture-hint" id="art-hint">${u.artHint}</p><button class="button button-small art-launch js-only" id="art-launch" type="button">${icon('cube')}<span>${u.launch3d}</span></button></figcaption>
    <p class="sr-only" id="art-status" role="status" aria-live="polite"></p><p class="sr-only" id="art-help">${u.artHelp}</p></figure>`;
}

function actions(project, {u,lang}, onHome) {
  const label = project.type === 'bot' ? u.launch : u.live;
  return `<div class="project-actions">
    ${project.demo ? ext(project.demo,label,`${project.title} — ${label} (${u.newTab})`) : ''}
    ${project.repo ? ext(project.repo,'GitHub',`${project.title} — ${u.source} (${u.newTab})`) : ''}
    ${onHome && project.screenshots?.length ? `<a class="text-action" href="${localizedPath(lang,projectPath(project))}#screens" data-gallery="${project.id}" aria-label="${esc(project.title)} — ${u.shots}">${u.shots}</a>` : ''}</div>`;
}

function card(project, index, ctx) {
  const { lang,u } = ctx, bot = project.type === 'bot', url = localizedPath(lang,projectPath(project));
  return `<article class="project-card" id="project-${project.id}" data-type="${project.type}">
    <a class="project-visual${bot ? ' project-visual-bot' : ''}" href="${url}" aria-label="${u.details}: ${esc(project.title)}"><img class="project-image" src="${preview(bot ? project.screenshots[0] : project.image)}" alt="${esc(project.title)} — ${bot ? u.botPreview : u.preview}" loading="lazy" decoding="async"></a>
    <div class="project-meta caption"><span>${num(index+1)}</span> / ${bot ? u.bot : u.site}</div>
    <h3 class="project-title"><a href="${url}">${esc(project.title)}${icon('arrow')}</a></h3>
    <p class="project-description">${esc(project.lead)}</p>${actions(project,ctx,true)}</article>`.replace('<article class="project-card"',`<article class="project-card" data-reveal style="--i:${index}"`);
}

function contact({p,u}) {
  const email = esc(p.socials.email);
  return `<section class="contact section shell" id="contact" aria-labelledby="contact-title"><p class="section-label caption" data-reveal>03 / ${u.contact}</p>
    <div class="contact-grid" data-reveal><h2 id="contact-title">${u.contactTitle}</h2><p class="contact-copy">${u.contactBody}</p></div>
    <div class="contact-bottom" data-reveal><div class="email-group"><a class="contact-email" href="mailto:${email}">${email}</a><button class="icon-button js-only" id="copy-email" type="button" data-email="${email}" aria-label="${u.copy}" title="${u.copy}">${icon('copy')}</button></div>
    <div class="social-links">${ext(p.socials.telegram,'Telegram')}${ext(p.socials.github,'GitHub')}</div></div></section>`;
}

function profileMasthead({p,u}) {
  return `<div class="profile"><img class="profile-avatar" src="${preview(p.avatar)}" alt="${esc(p.name)} — ${u.avatar}" width="176" height="176" fetchpriority="high">
    <div class="profile-copy"><p class="caption profile-handle">${esc(p.nickname)}</p><h1>${esc(p.name)}</h1><p class="profile-role">${esc(p.role)}</p></div>
    <div class="profile-contact"><span class="availability">${esc(p.status)}</span><div class="profile-links">
      ${ext(p.socials.telegram,'Telegram',`${esc(p.name)} — Telegram`,'button button-small')}
      ${ext(`mailto:${p.socials.email}`,'Email',`${esc(p.name)} — Email`)}
      ${ext(p.socials.github,'GitHub',`${esc(p.name)} — GitHub`)}
    </div></div></div>`;
}

function homeContent(ctx) {
  const {p,u,projects,lang} = ctx;
  const counts = [projects.length, ...['site','bot'].map(kind => projects.filter(x => x.type===kind).length)];
  const filters = ['all','site','bot'].map((id,i) => `<button type="button" class="filter-button" data-filter="${id}" aria-pressed="${i===0}">${[u.all,u.sites,u.bots][i]}<span>${num(counts[i])}</span></button>`).join('');
  const siteTags = [...new Set(projects.filter(x=>x.type==='site').flatMap(x=>x.tags))];
  const interactive = new Set(['Web Speech API','CSS Variables','LocalStorage','E-commerce','Електронна комерція']);
  const groups = [siteTags.filter(x=>!interactive.has(x)),siteTags.filter(x=>interactive.has(x)),[...new Set(projects.filter(x=>x.type==='bot').flatMap(x=>x.tags))]];
  return `<section class="hero shell" aria-label="${esc(p.name)} — ${esc(p.role)}">${profileMasthead(ctx)}
    <div class="hero-grid"><div class="hero-copy"><h2 class="hero-statement">${u.statement[0]}<span>${u.statement[1]}</span></h2><p class="hero-intro">${esc(p.intro)}</p>
    <div class="hero-actions"><a class="button" href="#projects">${u.workCTA}${icon('down')}</a><a class="text-action" href="#contact">${u.startProject}${icon('external')}</a></div></div>${sculpture(u)}
    <div class="hero-foot caption"><span>${esc(p.location)}</span><a class="hero-index" href="#projects">${num(projects.length)} / ${u.selected}${icon('down')}</a></div></div></section>
    <section class="projects section shell" id="projects" aria-labelledby="projects-title"><p class="section-label caption" data-reveal>01 / ${u.selected}</p>
    <div class="project-toolbar" data-reveal><h2 id="projects-title">${u.projects}</h2><div class="project-filters js-only" role="group" aria-label="${u.filters}">${filters}</div></div>
    <p class="sr-only" id="filter-status" role="status" aria-live="polite"></p><div class="projects-grid">${projects.map((x,i)=>card(x,i,ctx)).join('\n')}</div></section>
    <section class="about section" id="about" aria-labelledby="about-title"><div class="shell about-grid"><div class="about-identity" data-reveal><img src="${preview(p.avatar)}" alt="${esc(p.name)} — ${u.artwork}" width="1600" height="875" loading="lazy"></div>
    <div class="about-copy" data-reveal><p class="section-label caption">02 / ${u.about}</p><h2 id="about-title">${esc(u.aboutHeading)}</h2><p class="about-bio">${esc(p.bio)}</p>
    <dl class="expertise">${groups.map((group,i)=>`<div><dt>${u.expertise[i]}</dt><dd>${group.map(esc).join(' · ')}</dd></div>`).join('')}</dl></div></div></section>${contact(ctx)}`;
}

function detailContent(project, index, ctx) {
  const {u, projects, lang} = ctx, back = `${localizedPath(lang)}#projects`, images = shots(project);
  const next = projects[(index+1)%projects.length];
  return `<article class="project-detail section shell"><a class="text-action breadcrumb" href="${back}">${icon('prev')}${u.back}</a>
    <p class="section-label caption">${num(index+1)} / ${project.type==='bot'?u.bot:u.site}</p>
    <div class="detail-heading" data-reveal><h1>${esc(project.title)}</h1><div class="detail-summary"><p>${esc(project.description)}</p>${actions(project,ctx,false)}</div></div>
    <div class="detail-specs" data-reveal>${project.avatar ? `<img src="${preview(project.avatar)}" width="54" height="54" alt="${u.avatar}: ${esc(project.title)}">` : ''}<span class="caption">${u.stack}</span>${tagList(project,u)}</div>
    <div id="screens" class="detail-gallery${project.type==='bot'?' detail-gallery-bot':''}" data-reveal>${images.map((src,i)=>`<figure><a class="detail-image-button" href="${esc(src)}" data-gallery="${project.id}" data-gallery-index="${i}" aria-label="${u.enlarge}: ${esc(project.title)}, ${i+1}"><img src="${preview(src)}" alt="${esc(project.title)} — ${u.shot} ${i+1}" loading="${i?'lazy':'eager'}" decoding="async"></a><figcaption class="caption">${u.shot} ${num(i+1)} / ${num(images.length)}</figcaption></figure>`).join('')}</div>
    <div class="detail-bottom" data-reveal><a class="text-action" href="${back}">${icon('prev')}${u.back}</a><a class="next-project" href="${localizedPath(lang,projectPath(next))}"><span class="caption">${u.nextProject}</span><span>${esc(next.title)}${icon('arrow')}</span></a></div></article>${contact(ctx)}`;
}

function gallery(u) {
  return `<dialog class="gallery-dialog" id="gallery-dialog" aria-labelledby="gallery-title"><div class="gallery-content">
    <div class="gallery-head"><div><p class="caption" id="gallery-kicker">${u.shots}</p><h2 id="gallery-title">${u.shots}</h2></div>${iconButton('gallery-close',u.closeGallery,'close')}</div>
    <div class="gallery-viewport" id="gallery-viewport">${iconButton('gallery-prev',u.prev,'prev')}<div class="gallery-image-wrap"><img id="gallery-image" alt=""><p id="gallery-error" hidden>${u.shotError}</p></div>${iconButton('gallery-next',u.next,'next')}</div>
    <div class="gallery-bottom"><span class="caption" id="gallery-counter" aria-live="polite"></span><div id="gallery-thumbs" class="gallery-thumbs" role="group" aria-label="${u.thumbs}"></div></div></div></dialog>`;
}

export function render(rawProfile, rawProjects, {lang,route,entry=false}) {
  const {profile:p, projects} = content(rawProfile,rawProjects,lang), u=ui[lang];
  const home = route==='', missing = route==='404', ctx={p,projects,u,lang,route,home};
  const index = projects.findIndex(x=>projectPath(x)===route), project=projects[index];
  const title = home ? `${p.name} — ${p.role}` : `${missing?u.missing:project.title} — ${p.name}`;
  const description = missing ? u.missingBody : home?p.bio:project.description;
  const canonical = siteUrl+localizedPath(lang,route);
  const body = home ? homeContent(ctx) : missing ? `<section class="not-found shell"><p class="caption">404</p><h1>${u.missing}</h1><p>${u.missingBody}</p><a class="button" href="${localizedPath(lang)}#projects">${u.back}${icon('arrow')}</a></section>` : detailContent(project,index,ctx);
  const messages = {...u.runtime,shot:u.shot,shots:u.shots,bot:u.bot,site:u.site,artAlt:u.artAlt};
  const galleryData = (missing?[]:home?projects:[project]).map(x=>({id:x.id,title:x.title,type:x.type,images:shots(x)}));
  // Only language-neutral legacy URLs consult a saved preference. Explicit shared
  // /uk/ and /en/ URLs always win. Resolve before paint and preserve deep links.
  const preference = entry ? `<script>try{const l=localStorage.getItem('fluentfable.locale');if(${json(locales)}.includes(l)&&l!==${json(defaultLocale)}&&!/^\\/(uk|en)(?:\\/|$)/.test(location.pathname))location.replace('/'+l+location.pathname+location.search+location.hash)}catch{}</script>` : '';
  const seo = missing ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">
    ${locales.map(l=>`<link rel="alternate" hreflang="${l}" href="${siteUrl+localizedPath(l,route)}">`).join('\n')}
    <link rel="alternate" hreflang="x-default" href="${siteUrl}/${route}">
    <meta property="og:type" content="website"><meta property="og:site_name" content="${esc(p.name)}"><meta property="og:url" content="${canonical}">
    <meta property="og:locale" content="${lang==='uk'?'uk_UA':'en_US'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${siteUrl}/assets/img/social-${lang}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${siteUrl}/assets/img/social-${lang}.png">`;
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${preference}<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#000000"><meta name="color-scheme" content="dark">
${seo}<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/css/styles.css?v=8"><script src="/assets/js/main.js?v=8" defer></script></head>
<body id="top" data-page="${home?'home':missing?'missing':'project'}"><a class="skip-link" href="#main">${u.skip}</a>${header(ctx)}
<main id="main" tabindex="-1">${body}</main>${footer(ctx)}${missing?'':gallery(u)}
<script type="application/json" id="page-data">${json({messages,projects:galleryData})}</script><div class="toast" id="toast" role="status" hidden></div></body></html>\n`.replace(/[ \t]+$/gm,'');
}
