/* The localized HTML and language links work without JavaScript. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const {messages:t,projects} = JSON.parse($('#page-data').textContent);
  const num = n => String(n).padStart(2,'0');
  const plainClick = e => !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0;
  document.documentElement.classList.add('enhanced');
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  function updateLanguageLinks() {
    for (const link of $$('[data-language]')) {
      const url = new URL(link.href);
      if (document.body.dataset.page === 'missing') {
        const rest = location.pathname.replace(/^\/(uk|en)(?=\/|$)/,'');
        url.pathname = `/${link.dataset.language}${rest || '/404'}`;
      }
      url.search = location.search; url.hash = location.hash; link.href = url.href;
    }
  }
  updateLanguageLinks(); window.addEventListener('hashchange',updateLanguageLinks);
  $$('[data-language]').forEach(link => link.addEventListener('click',e => {
    if (!plainClick(e)) return;
    try { localStorage.setItem('fluentfable.locale',link.dataset.language); } catch { /* links still work */ }
  }));

  const menu = $('#menu-dialog'), menuToggle = $('#menu-toggle'), gallery = $('#gallery-dialog');
  const syncLock = () => document.body.classList.toggle('is-dialog-open',Boolean($('dialog[open]')));
  menuToggle.addEventListener('click', () => {
    menu.showModal(); menuToggle.setAttribute('aria-expanded','true'); syncLock(); $('#menu-close').focus();
  });
  $('#menu-close').addEventListener('click',()=>menu.close());
  $$('a',menu).forEach(a=>a.addEventListener('click',()=>menu.close()));
  menu.addEventListener('close',()=>{ menuToggle.setAttribute('aria-expanded','false'); syncLock(); });
  matchMedia('(min-width: 901px)').addEventListener('change',e=>{if(e.matches && menu.open) menu.close();});
  document.addEventListener('keydown',e=>{
    if(e.key !== 'Tab') return;
    const active = $('dialog[open]'); if(!active) return;
    const items = $$('a[href],button:not([disabled])',active).filter(x=>x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden');
    if(e.shiftKey && document.activeElement === items[0]) {e.preventDefault();items.at(-1).focus();}
    else if(!e.shiftKey && document.activeElement === items.at(-1)) {e.preventDefault();items[0].focus();}
  });

  $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    const filter=button.dataset.filter; let count=0;
    for(const b of $$('[data-filter]')) b.setAttribute('aria-pressed',String(b===button));
    for(const card of $$('.project-card')) { card.hidden=filter!=='all' && card.dataset.type!==filter; if(!card.hidden) count++; }
    $('#filter-status').textContent=t.showing.replace('{count}',count);
  }));

  if (gallery) {
    const image=$('#gallery-image'), error=$('#gallery-error'), thumbs=$('#gallery-thumbs');
    let project, index=0, opener, start;
    function show(i) {
      const n=project.images.length; index=(i+n)%n;
      error.hidden=true; image.hidden=false; image.alt=`${project.title} — ${t.shot} ${index+1} ${t.of} ${n}`; image.src=project.images[index];
      $('#gallery-counter').textContent=`${num(index+1)} / ${num(n)}`;
      $$('.gallery-thumb',thumbs).forEach((b,j)=>b.setAttribute('aria-current',String(index===j)));
    }
    image.addEventListener('error',()=>{image.hidden=true; error.hidden=false;});
    $$('[data-gallery]').forEach(a=>{
      a.setAttribute('aria-haspopup','dialog');
      a.addEventListener('click',e=>{
        if(!plainClick(e)) return;
        project=projects.find(p=>p.id===a.dataset.gallery); if(!project?.images.length) return;
        e.preventDefault(); opener=a;
        $('#gallery-title').textContent=project.title; $('#gallery-kicker').textContent=`${project.type==='bot'?t.bot:t.site} / ${t.shots}`;
        const one=project.images.length===1; $('#gallery-prev').hidden=$('#gallery-next').hidden=thumbs.hidden=one;
        thumbs.replaceChildren(...(one?[]:project.images.map((src,j)=>{
          const button=document.createElement('button'); button.type='button'; button.className='gallery-thumb';
          button.setAttribute('aria-label',`${t.shot} ${j+1}`);
          const pic=new Image(); pic.alt='';pic.src=src; button.append(pic); button.addEventListener('click',()=>show(j));return button;
        })));
        show(Number(a.dataset.galleryIndex||0)); gallery.showModal();syncLock();$('#gallery-close').focus();
      });
    });
    $('#gallery-prev').addEventListener('click',()=>show(index-1)); $('#gallery-next').addEventListener('click',()=>show(index+1));
    $('#gallery-close').addEventListener('click',()=>gallery.close());
    gallery.addEventListener('close',()=>{syncLock();opener?.focus({preventScroll:true});});
    gallery.addEventListener('keydown',e=>{
      const to={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:project.images.length-1}[e.key];
      if(to!==undefined) {e.preventDefault();show(to);}
    });
    gallery.addEventListener('click',e=>{
      const r=gallery.getBoundingClientRect();
      if(e.target===gallery && (e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)) gallery.close();
    });
    const view=$('#gallery-viewport');
    view.addEventListener('touchstart',e=>{start=e.changedTouches[0];},{passive:true});
    view.addEventListener('touchend',e=>{
      const end=e.changedTouches[0]; if(!start) return;
      const dx=end.clientX-start.clientX;
      if(Math.abs(dx)>48 && Math.abs(dx)>1.4*Math.abs(end.clientY-start.clientY)) show(index+(dx<0?1:-1));
      start=null;
    },{passive:true});
  }

  let toastTimer;
  $('#copy-email')?.addEventListener('click',async e=>{
    const button=e.currentTarget; let message=t.copied;
    try {await navigator.clipboard.writeText(button.dataset.email);} catch {
      const range=document.createRange();range.selectNodeContents($('.contact-email'));
      const selection=getSelection();selection.removeAllRanges();selection.addRange(range);message=t.copyFallback;
    }
    const toast=$('#toast'); clearTimeout(toastTimer);toast.hidden=false;toast.textContent=message;
    toastTimer=setTimeout(()=>{toast.hidden=true;},4000);
  });

  const art=$('#sculpture'); if(!art) return;
  const frame=art.querySelector('.sculpture-frame'), status=$('#art-status'), poster=art.querySelector('picture');
  let controller, viewer, canvas, live=false, tapStart=null, lastTap=0;
  function fail(current) {
    if (current.signal.aborted) return;
    current.abort(); canvas?.remove(); canvas=null; viewer=null; live=false;
    art.dataset.state='still'; status.textContent=t.artError;
  }
  async function load() {
    if (viewer || controller) return;
    const current=controller=new AbortController();
    art.dataset.state='loading'; status.textContent=t.loading;
    canvas=document.createElement('canvas');
    canvas.setAttribute('role','group'); canvas.setAttribute('aria-label',t.artAlt);
    canvas.setAttribute('aria-describedby','art-hint art-help'); canvas.tabIndex=0;
    frame.append(canvas);
    const lite=matchMedia('(max-width: 800px), (pointer: coarse)').matches || navigator.connection?.saveData || (navigator.deviceMemory??8)<=4 || (navigator.hardwareConcurrency??8)<=4;
    try {
      const {mount}=await import('./sculpture.js?v=1'); current.signal.throwIfAborted();
      viewer=await mount(canvas,{lite,signal:current.signal,failed:()=>fail(current)});
      current.signal.throwIfAborted(); live=true; art.dataset.state='live'; poster.setAttribute('aria-hidden','true'); status.textContent=t.ready;
    } catch { fail(current); }
    finally { if (controller===current) controller=null; }
  }
  function still() {
    if (!viewer) return;
    live=false; art.dataset.state='still'; viewer.reset(); viewer.pause(); status.textContent=t.photo;
  }
  function wake() {
    if (!viewer) { load(); return; }
    if (live) return;
    live=true; art.dataset.state='live'; viewer.resume(); status.textContent=t.ready;
  }
  // Direct manipulation from the first paint. While the photo is frozen, the
  // transparent canvas still receives a press, wakes WebGL and starts dragging.
  frame.addEventListener('pointerdown',e=>{ if(!live && e.target===canvas) wake(); },true);
  frame.addEventListener('dblclick',e=>{ if(e.target===canvas){ e.preventDefault(); still(); } });
  frame.addEventListener('pointerdown',e=>{ if(e.pointerType==='touch') tapStart={x:e.clientX,y:e.clientY}; },true);
  frame.addEventListener('pointerup',e=>{
    if(e.pointerType!=='touch'||e.target!==canvas||!tapStart) return;
    const moved=Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>12; tapStart=null;
    if(moved) return;
    const now=Date.now(); if(now-lastTap<320){still();lastTap=0;} else lastTap=now;
  });
  frame.addEventListener('keydown',e=>{
    if(e.target!==canvas||(e.key!==' '&&e.key!=='Enter')) return;
    e.preventDefault(); live?still():wake();
  });
  const observer=new IntersectionObserver(([entry])=>{
    if(entry.isIntersecting){ observer.disconnect(); load(); }
  },{rootMargin:'160px'}); observer.observe(frame);
  window.addEventListener('pagehide',()=>controller?.abort());
})();
