export const siteUrl = "https://portfolio-y5j.pages.dev";

export const slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const number = (value) => String(value).padStart(2, "0");
const asset = (value, base) => `${base}${value.replace(/^\.\//, "")}`;
const previewImage = (value) => value.replace(/\.(png|jpe?g)$/i, ".webp");
const category = (project) => project.type === "bot" ? "Telegram bot" : "Website";
const language = (project) => /[а-яё]/i.test(project.description) ? ' lang="ru"' : "";

const paths = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external: '<path d="M6 18 18 6M6 6h12v12"/>',
  down: '<path d="M12 4v16M6 14l6 6 6-6"/>',
  up: '<path d="M12 20V4M6 10l6-6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  previous: '<path d="m14 5-7 7 7 7"/>',
  next: '<path d="m10 5 7 7-7 7"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  copy: '<path d="M9 5H5v14h10v-4"/><path d="M9 3h10v12H9z"/>',
  gallery: '<path d="M3 5h18v14H3z"/><path d="m3 16 6-6 5 5 3-3 4 4"/><circle cx="16" cy="9" r="1"/>',
};
const icon = (name, className = "icon") => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.external}</svg>`;
const external = (href, label, className = "text-action", extra = "") => `<a class="${className}" href="${escape(href)}"${href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener noreferrer"'} ${extra}>${label}${icon("external")}</a>`;
const socialLinks = (profile, className = "text-action") => [
  [profile.socials.telegram, "Telegram"],
  [profile.socials.github, "GitHub"],
  [`mailto:${profile.socials.email}`, "Email"],
].map(([url, label]) => external(url, label, className)).join("");

function header(profile, base, isHome) {
  const home = isHome ? "" : base;
  return `<header class="site-header" id="site-header">
    <div class="shell header-inner">
      <nav class="desktop-nav" aria-label="Primary navigation">
        <a href="${home}#projects" data-nav="projects">Projects</a>
        <a href="${home}#about" data-nav="about">About</a>
      </nav>
      <button class="menu-toggle" id="menu-toggle" type="button" aria-label="Open navigation" aria-controls="menu-dialog" aria-expanded="false">${icon("menu")}<span>Menu</span></button>
      <a class="wordmark" href="${isHome ? "#top" : base}" aria-label="${escape(profile.name)} — home">${escape(profile.name)}</a>
      <a class="header-contact" href="${home}#contact" data-nav="contact" aria-label="Go to contact section"><span>Let’s talk</span>${icon("external")}</a>
    </div>
  </header>
  <dialog class="menu-dialog" id="menu-dialog" aria-labelledby="menu-title">
    <div class="shell menu-inner">
      <div class="menu-head"><p class="eyebrow" id="menu-title">Navigation</p><button class="icon-button" id="menu-close" type="button" aria-label="Close navigation">${icon("close")}</button></div>
      <nav class="menu-links" aria-label="Mobile navigation">
        <a href="${home}#projects"><span class="menu-number">01</span>Projects${icon("external")}</a>
        <a href="${home}#about"><span class="menu-number">02</span>About${icon("external")}</a>
        <a href="${home}#contact"><span class="menu-number">03</span>Contact${icon("external")}</a>
      </nav>
      <div class="menu-bottom"><p class="availability">${escape(profile.status)}</p><div class="social-links">${socialLinks(profile)}</div><p class="caption">${escape(profile.location)}</p></div>
    </div>
  </dialog>`;
}

function footer(profile, base, isHome) {
  const home = isHome ? "" : base;
  return `<footer class="site-footer shell">
    <div class="footer-main">
      <div><a class="wordmark footer-wordmark" href="${isHome ? "#top" : base}">${escape(profile.name)}</a><p class="footer-role">${escape(profile.role)}</p></div>
      <nav class="footer-nav" aria-label="Footer navigation"><a href="${home}#projects">Projects</a><a href="${home}#about">About</a><a href="${home}#contact">Contact</a></nav>
      <div class="social-links footer-socials">${socialLinks(profile)}</div>
    </div>
    <div class="footer-bottom"><p>© <span data-year>${new Date().getFullYear()}</span> ${escape(profile.name)}<span class="footer-separator"> / </span>Built with vanilla HTML, CSS &amp; JS</p><a class="text-action back-to-top" href="#top">Back to top${icon("up")}</a></div>
  </footer>`;
}

function gallery(projects, base) {
  const data = projects.map((project) => ({ id: slugify(project.title), title: project.title, type: project.type, images: (project.screenshots || [project.image]).filter(Boolean).map((image) => asset(image, base)) }));
  return `<dialog class="gallery-dialog" id="gallery-dialog" aria-labelledby="gallery-title">
    <div class="gallery-content">
      <div class="gallery-head"><div><p class="eyebrow" id="gallery-kicker">Project / Screenshots</p><h2 id="gallery-title">Screenshots</h2></div><button class="icon-button" id="gallery-close" type="button" aria-label="Close gallery">${icon("close")}</button></div>
      <div class="gallery-viewport" id="gallery-viewport"><button class="icon-button gallery-prev" id="gallery-prev" type="button" aria-label="Previous screenshot">${icon("previous")}</button><div class="gallery-image-wrap"><img id="gallery-image" alt="" decoding="async"><p id="gallery-error" hidden>Could not load this screenshot. Please try another image.</p></div><button class="icon-button gallery-next" id="gallery-next" type="button" aria-label="Next screenshot">${icon("next")}</button></div>
      <div class="gallery-bottom"><p class="caption gallery-counter" id="gallery-counter" aria-live="polite" aria-atomic="true"></p><div class="gallery-thumbs" id="gallery-thumbs" role="group" aria-label="Choose a screenshot"></div><p class="caption gallery-hint">← → to explore <span>/</span> Esc to close</p></div>
    </div>
  </dialog>
  <script type="application/json" id="project-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function layout({ profile, projects, base = "./", title, description, pathname = "", content, isHome = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="theme-color" content="#000000">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="${siteUrl}/${pathname}">
  <link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escape(profile.name)}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${siteUrl}/${pathname}">
  <meta property="og:image" content="${siteUrl}/assets/img/social-cover.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${siteUrl}/assets/img/social-cover.png">
  <link rel="preload" href="${base}assets/fonts/saira-condensed-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${base}assets/fonts/cormorant-garamond-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${base}assets/css/styles.css?v=2">
  <script src="${base}assets/js/main.js?v=2" defer></script>
</head>
<body${isHome ? ' data-page="home"' : ' data-page="project"'} id="top">
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(profile, base, isHome)}
  <main id="main" tabindex="-1">${content}</main>
  ${footer(profile, base, isHome)}
  ${gallery(projects, base)}
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
</body>
</html>
`.replace(/[ \t]+$/gm, "");
}

function tags(project) {
  return `<ul class="tags" aria-label="Technologies">${project.tags.map((tag) => `<li>${escape(tag)}</li>`).join("")}</ul>`;
}

function projectActions(project, { base = "./", includeDetails = false } = {}) {
  const slug = slugify(project.title);
  return `<div class="project-actions">
    ${project.demo ? external(project.demo, project.type === "bot" ? "Open bot" : "Live demo", "button button-small", `aria-label="${escape(project.title)} — ${project.type === "bot" ? "open Telegram bot" : "open live website"} (new tab)"`) : ""}
    ${project.repo ? external(project.repo, "GitHub", "text-action", `aria-label="${escape(project.title)} — source code (new tab)"`) : ""}
    ${project.screenshots?.length ? `<button class="text-action" type="button" data-gallery="${slug}" aria-haspopup="dialog" aria-label="${escape(project.title)} — screenshots">Screenshots${icon("gallery")}</button>` : ""}
    ${includeDetails ? `<a class="text-action" href="${base}projects/${slug}/">Explore project${icon("arrow")}</a>` : ""}
  </div>`;
}

function projectCard(project, index) {
  const slug = slugify(project.title);
  const isBot = project.type === "bot";
  const image = previewImage(isBot ? project.screenshots?.[0] || project.avatar : project.image);
  const media = `<img class="project-image" src="${escape(image)}" alt="${escape(project.title)} — ${isBot ? "Telegram interface" : "website preview"}" width="${isBot ? 785 : 1600}" height="${isBot ? 1026 : 1000}" loading="lazy" decoding="async">${isBot ? `<img class="bot-avatar" src="${escape(previewImage(project.avatar))}" alt="${escape(project.title)} — avatar" width="100" height="100" loading="lazy" decoding="async"><span class="media-action" aria-hidden="true">${icon("gallery")}</span>` : `<span class="media-action" aria-hidden="true">${icon("external")}</span>`}`;
  return `<article class="project-card${index === 0 ? " project-card-featured" : ""} reveal" id="project-${slug}" data-type="${project.type}" data-project-id="${slug}">
    ${isBot ? `<button class="project-visual project-visual-bot" type="button" data-gallery="${slug}" aria-haspopup="dialog" aria-label="View screenshots of ${escape(project.title)}">${media}</button>` : `<a class="project-visual" href="./projects/${slug}/" aria-label="Explore ${escape(project.title)}">${media}</a>`}
    <div class="project-body"><p class="caption project-caption"><span>${number(index + 1)}</span><span>${category(project)}</span></p><h3 class="project-title"><a href="./projects/${slug}/">${escape(project.title)}${icon("external")}</a></h3><p class="project-description"${language(project)}>${escape(project.description)}</p>${tags(project)}${projectActions(project)}</div>
  </article>`;
}

function contact(profile) {
  return `<section class="contact section" id="contact" aria-labelledby="contact-title"><div class="shell">
    <div class="section-label reveal"><span class="caption">03 / Contact</span><p class="availability">${escape(profile.status)}</p></div>
    <div class="contact-grid reveal"><h2 id="contact-title">Have an idea<br>worth building?</h2><div class="contact-copy"><p>I’m always open to product collaborations, frontend challenges, and thoughtful conversations. The fastest way to reach me is email or Telegram.</p><a class="button" href="mailto:${escape(profile.socials.email)}">Say hello${icon("external")}</a></div></div>
    <div class="contact-bottom reveal"><div class="email-group"><a class="contact-email" href="mailto:${escape(profile.socials.email)}">${escape(profile.socials.email)}</a><button class="icon-button copy-email" id="copy-email" type="button" data-email="${escape(profile.socials.email)}" aria-label="Copy email address">${icon("copy")}</button></div><div class="social-links">${external(profile.socials.telegram, "Telegram")}${external(profile.socials.github, "GitHub")}</div></div>
  </div></section>`;
}

export function renderHome(originalProfile, originalProjects) {
  const profile = { ...originalProfile, avatar: previewImage(originalProfile.avatar) };
  const projects = originalProjects.map((project) => ({ ...project, ...(project.image ? { image: previewImage(project.image) } : {}), ...(project.avatar ? { avatar: previewImage(project.avatar) } : {}) }));
  const featured = projects.find((project) => project.title.startsWith("Nika")) || projects[0];
  const secondary = projects[0];
  const sites = projects.filter((project) => project.type === "site").length;
  const bots = projects.length - sites;
  const content = `
    <section class="hero shell" aria-labelledby="hero-title">
      <div class="hero-topline"><p class="caption">The portfolio of ${escape(profile.name)}</p><p class="availability">${escape(profile.status)}</p></div>
      <div class="hero-grid">
        <div class="hero-copy"><h1 id="hero-title">Frontend &amp;<br><span>AI App</span><br>Developer</h1><p class="hero-intro">${escape(profile.bio.split(". ")[0])}.</p><div class="hero-actions"><a class="button" href="#projects">View projects${icon("down")}</a><a class="text-action" href="#contact">Get in touch${icon("external")}</a></div></div>
        <div class="hero-showcase" aria-label="Selected project previews"><div class="showcase-label caption"><span>Selected work</span><span>${number(projects.indexOf(featured) + 1)} / ${number(projects.length)}</span></div><a class="hero-preview hero-preview-main" href="./projects/${slugify(featured.title)}/" aria-label="Explore ${escape(featured.title)}"><img src="${escape(featured.image)}" alt="${escape(featured.title)} — e-commerce website" width="1600" height="1000" fetchpriority="high"><span class="preview-open" aria-hidden="true">${icon("external")}</span></a><a class="hero-preview hero-preview-secondary" href="./projects/${slugify(secondary.title)}/" aria-label="Explore ${escape(secondary.title)}"><img src="${escape(secondary.image)}" alt="${escape(secondary.title)} — interactive web lesson" width="1600" height="1000" decoding="async"><span class="preview-open" aria-hidden="true">${icon("external")}</span></a><p class="showcase-caption caption">Web interfaces. Interactive products.</p></div>
      </div>
      <div class="hero-bottom"><p class="caption">${escape(profile.location)}<span class="metadata-slash">/</span><span class="handle">${escape(profile.nickname)}</span></p><div class="social-links">${socialLinks(profile)}</div><a class="scroll-link caption" href="#projects">Scroll to explore${icon("down")}</a></div>
    </section>

    <section class="projects section shell" id="projects" aria-labelledby="projects-title">
      <div class="section-label reveal"><span class="caption">01 / Selected work</span><span class="caption">${number(projects.length)} projects</span></div>
      <div class="section-heading reveal"><h2 id="projects-title">Ideas, brought<br><span>to the browser.</span></h2><p class="section-intro">Web experiences and Telegram bots.<br>Explore the interfaces, try the demos,<br>and take a look at the code.</p></div>
      <div class="project-toolbar"><div class="project-filters" role="group" aria-label="Filter projects"><button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true">All<span>${number(projects.length)}</span></button><button class="filter-button" type="button" data-filter="site" aria-pressed="false">Websites<span>${number(sites)}</span></button><button class="filter-button" type="button" data-filter="bot" aria-pressed="false">Bots<span>${number(bots)}</span></button></div>${external(profile.socials.github, "View GitHub", "text-action toolbar-github")}</div>
      <p class="sr-only" id="filter-status" role="status" aria-live="polite" aria-atomic="true">Showing all ${projects.length} projects</p>
      <div class="projects-grid" id="projects-grid">${projects.map(projectCard).join("\n")}</div>
    </section>

    <section class="about section" id="about" aria-labelledby="about-title"><div class="shell">
      <div class="section-label reveal"><span class="caption">02 / About</span><span class="caption">${escape(profile.role)}</span></div>
      <div class="about-grid"><div class="about-identity reveal"><div class="about-image"><img src="${escape(profile.avatar)}" alt="${escape(profile.name)} — original profile artwork" width="2000" height="1094" loading="lazy" decoding="async"></div><div class="identity-caption"><p>${escape(profile.name)}</p><span class="caption">${escape(profile.nickname)}</span></div><p class="caption about-location">${escape(profile.location)}</p></div><div class="about-copy reveal"><h2 id="about-title">Complex ideas.<br><span>Made simple.</span></h2><p class="about-bio">${escape(profile.bio)}</p><div class="expertise"><div><h3>Web interfaces</h3><p>HTML5/CSS3 · Vanilla JS · React · TypeScript · Vite · UI/UX</p></div><div><h3>Interactive products</h3><p>Web Speech API · CSS Variables · LocalStorage · E-commerce</p></div><div><h3>Telegram automation</h3><p>Python · python-telegram-bot · Flask · SQLite · Render · Telegram API · Booking System</p></div></div></div></div>
      <div class="project-facts reveal"><div><span class="fact-value">${number(projects.length)}</span><span class="caption">Selected projects</span></div><div><span class="fact-value">${number(sites)}</span><span class="caption">Websites</span></div><div><span class="fact-value">${number(bots)}</span><span class="caption">Telegram bots</span></div><div><span class="fact-value fact-location">Remote</span><span class="caption">Europe</span></div></div>
    </div></section>
    ${contact(profile)}`;

  return layout({ profile, projects, title: `${profile.name} — ${profile.role}`, description: profile.bio, content, isHome: true });
}

export function renderProject(profile, projects, index) {
  const project = projects[index];
  const base = "../../";
  const slug = slugify(project.title);
  const images = (project.screenshots || [project.image]).filter(Boolean);
  const nextIndex = (index + 1) % projects.length;
  const next = projects[nextIndex];
  const content = `
    <section class="project-detail shell" aria-labelledby="detail-title">
      <a class="text-action breadcrumb" href="../../#projects">${icon("previous")}All projects</a>
      <div class="section-label"><span class="caption">${number(index + 1)} / ${category(project)}</span><span class="caption">Selected work</span></div>
      <div class="detail-heading"><h1 id="detail-title">${escape(project.title)}</h1><div class="detail-summary"><p${language(project)}>${escape(project.description)}</p>${projectActions(project, { base })}</div></div>
      <div class="detail-specs"><div><span class="caption">Project type</span><p>${category(project)}</p></div><div><span class="caption">Technologies</span>${tags(project)}</div>${project.avatar ? `<div class="detail-bot-identity"><img src="${asset(project.avatar, base)}" alt="${escape(project.title)} — avatar" width="80" height="80"><span class="caption">Telegram bot</span></div>` : ""}</div>
      <div class="detail-gallery${project.type === "bot" ? " detail-gallery-bot" : ""}">${images.map((image, imageIndex) => `<figure class="detail-figure reveal"><button type="button" class="detail-image-button" data-gallery="${slug}" data-gallery-index="${imageIndex}" aria-haspopup="dialog" aria-label="Enlarge ${escape(project.title)} — screenshot ${imageIndex + 1}"><img src="${asset(image, base)}" alt="${escape(project.title)} — screenshot ${imageIndex + 1}" loading="${imageIndex ? "lazy" : "eager"}" decoding="async"><span class="media-action" aria-hidden="true">${icon("gallery")}</span></button><figcaption class="caption">${escape(project.title)}<span>${number(imageIndex + 1)} / ${number(images.length)}</span></figcaption></figure>`).join("")}</div>
      <div class="detail-bottom"><a class="button" href="../../#projects">${icon("previous")}Back to projects</a><a class="next-project" href="../${slugify(next.title)}/"><span class="caption">Next project / ${number(nextIndex + 1)}</span><span>${escape(next.title)}${icon("arrow")}</span></a></div>
    </section>
    ${contact(profile)}`;
  return layout({ profile, projects, base, title: `${project.title} — ${profile.name}`, description: project.description, pathname: `projects/${slug}/`, content });
}
