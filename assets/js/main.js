/* =========================================================
   Portfolio — data loading & interactions
   Vanilla JS, no dependencies.
   ========================================================= */

(() => {
  "use strict";

  const PROFILE_URL = "./data/profile.json";
  const PROJECTS_URL = "./data/projects.json";
  const DEFAULT_AVATAR = "./assets/img/avatar.svg";
  const THEME_KEY = "portfolio-theme";

  const TAG_HUES = [16, 38, 152, 196, 258, 292, 332, 86];

  const ICONS = {
    telegram:
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M21.7 3.3a1.2 1.2 0 0 0-1.2-.25L2.8 10.2c-.9.35-.87 1.64.04 1.94l4.1 1.35 1.5 4.9c.23.75 1.2.95 1.7.36l2.28-2.7 4.24 3.1c.63.46 1.53.12 1.7-.65l3.4-15.2c.1-.47-.04-.95-.4-1.28ZM9.1 14.06l-.4 3.4-1.1-3.63 8.6-6.4-7.1 6.63Z" fill="currentColor"/></svg>',
    github:
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" fill="currentColor"/></svg>',
    email:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.6 7.2 7.1 5.3a2 2 0 0 0 2.6 0l7.1-5.3"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    empty:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
    gallery:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-5-5L7 19"/></svg>',
  };

  const SOCIAL_META = {
    telegram: { label: "Telegram" },
    github: { label: "GitHub" },
    email: { label: "Email" },
  };

  const state = {
    profile: null,
    projects: [],
    activeFilter: "all",
    gallery: {
      project: null,
      images: [],
      index: 0,
      opener: null,
    },
    revealObserver: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ---------- Small helpers ---------- */

  function text(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function toUrl(value, protocols = ["http:", "https:"]) {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw || raw.startsWith("#")) return null;
    try {
      const url = new URL(raw, window.location.href);
      return protocols.includes(url.protocol) ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  function socialUrl(value, network) {
    if (typeof value !== "string") return null;
    let raw = value.trim();
    if (!raw) return null;

    if (network === "email") {
      raw = raw.replace(/^mailto:/i, "").trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? `mailto:${raw}` : null;
    }

    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      return toUrl(raw);
    }

    if (/^[\w.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(raw)) {
      return toUrl(`https://${raw}`);
    }

    const handle = raw.replace(/^@/, "").trim();
    if (network === "telegram") {
      return /^[A-Za-z0-9_]{3,64}$/.test(handle) ? `https://t.me/${handle}` : null;
    }
    if (network === "github") {
      return /^[A-Za-z0-9-]{1,39}$/.test(handle) ? `https://github.com/${handle}` : null;
    }
    return null;
  }

  function setText(selector, value) {
    const node = $(selector);
    if (!node) return;
    if (value) {
      node.textContent = value;
      node.hidden = false;
    } else {
      node.textContent = "";
      node.hidden = true;
    }
  }

  function setMeta(selector, content) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", content);
  }

  function hashHue(value) {
    let hash = 0;
    const source = String(value).toLowerCase();
    for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    }
    return TAG_HUES[hash % TAG_HUES.length];
  }

  async function getJSON(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`);
    }
    return response.json();
  }

  /* ---------- Theme ---------- */

  function setupTheme() {
    const button = $("#theme-toggle");
    const initial = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    applyTheme(initial, false);
    if (!button) return;

    button.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
      const next = current === "dark" ? "light" : "dark";

      document.documentElement.classList.add("is-theme-changing");
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-theme-changing");
      }, 360);

      applyTheme(next, true);
    });
  }

  function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    const button = $("#theme-toggle");
    if (button) {
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#151517" : "#f6f1e8");

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        /* Storage can be unavailable — the theme still works for this visit. */
      }
    }
  }

  /* ---------- Header ---------- */

  function setupHeader() {
    const header = $("#site-header");
    if (!header) return;

    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ---------- Profile ---------- */

  async function loadProfile() {
    try {
      const profile = await getJSON(PROFILE_URL);
      renderProfile(profile);
    } catch (error) {
      console.error("Could not load profile:", error);
      showConfigNotice();
    }
  }

  function renderProfile(rawProfile) {
    if (!rawProfile || typeof rawProfile !== "object" || Array.isArray(rawProfile)) {
      throw new Error("profile.json must contain a single JSON object");
    }

    state.profile = rawProfile;

    const name = text(rawProfile.name, "Your Name");
    const role = text(rawProfile.role, "Frontend & AI App Developer");
    const bio = text(rawProfile.bio);
    const nickname = text(rawProfile.nickname);
    const location = text(rawProfile.location);
    const status = text(rawProfile.status);

    setText("#name", name);
    setText("#brand-name", name);
    setText("#footer-name", name);
    setText("#role", role);
    setText("#bio", bio);
    setText("#nickname", nickname ? (nickname.startsWith("@") ? nickname : `@${nickname}`) : "");
    setText("#location", location);

    const statusPill = $("#status-pill");
    if (statusPill) {
      if (status) {
        setText("#status", status);
        statusPill.hidden = false;
      } else {
        statusPill.hidden = true;
      }
    }

    const heroMeta = $("#hero-meta");
    if (heroMeta) heroMeta.hidden = !location;

    document.title = `${name} — ${role}`;
    const description = bio || `${name} is a ${role.toLowerCase()} building thoughtful web products.`;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', `${name} — ${role}`);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', `${name} — ${role}`);
    setMeta('meta[name="twitter:description"]', description);

    const avatar = $("#avatar");
    if (avatar) {
      const avatarUrl = toUrl(rawProfile.avatar) || toUrl(DEFAULT_AVATAR);
      if (avatarUrl) avatar.src = avatarUrl;
      avatar.alt = `${name} — avatar`;
      avatar.addEventListener(
        "error",
        () => {
          if (avatar.dataset.fallbackApplied === "true") {
            avatar.style.display = "none";
            return;
          }
          avatar.dataset.fallbackApplied = "true";
          const fallback = toUrl(DEFAULT_AVATAR);
          if (fallback) avatar.src = fallback;
        },
        { once: true }
      );
    }

    const socials = rawProfile.socials && typeof rawProfile.socials === "object" ? rawProfile.socials : {};
    const heroSocials = $("#hero-socials");
    if (heroSocials) {
      const links = buildSocialLinks(socials, {
        keys: ["telegram", "github", "email"],
        primary: "telegram",
      });
      if (links.childNodes.length) {
        heroSocials.replaceChildren(links);
        heroSocials.hidden = false;
      } else {
        heroSocials.hidden = true;
      }
    }

    const contactActions = $("#contact-actions");
    if (contactActions) {
      const links = buildSocialLinks(socials, {
        keys: ["email", "telegram"],
        primary: "email",
        labels: { email: "Say hello" },
      });
      if (links.childNodes.length) {
        contactActions.replaceChildren(links);
        contactActions.hidden = false;
      } else {
        contactActions.hidden = true;
      }
    }

    const githubUrl = socialUrl(socials.github, "github");
    const githubLink = $("#github-link");
    if (githubLink) {
      if (githubUrl) {
        githubLink.href = githubUrl;
        githubLink.hidden = false;
      } else {
        githubLink.hidden = true;
      }
    }
  }

  function buildSocialLinks(socials, options) {
    const fragment = document.createDocumentFragment();
    const keys = Array.isArray(options.keys) ? options.keys : ["telegram", "github", "email"];
    const labels = options.labels || {};

    const available = keys.filter((key) => Boolean(socialUrl(socials[key], key)));
    if (!available.length) return fragment;

    const primary = available.includes(options.primary) ? options.primary : available[0];

    available.forEach((key) => {
      const href = socialUrl(socials[key], key);
      if (!href) return;

      const link = document.createElement("a");
      link.className = `btn ${key === primary ? "btn-primary" : "btn-ghost"}`;
      link.href = href;

      if (href.startsWith("mailto:")) {
        link.setAttribute("aria-label", `${labels[key] || SOCIAL_META[key].label} — opens your email app`);
      } else {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      const icon = document.createElement("span");
      icon.className = "btn-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = ICONS[key];

      const label = document.createElement("span");
      label.textContent = labels[key] || SOCIAL_META[key].label;

      link.append(icon, label);
      fragment.append(link);
    });

    return fragment;
  }

  function showConfigNotice() {
    const notice = $("#config-notice");
    const message = $("#config-notice-text");
    if (!notice || !message) return;

    message.textContent =
      window.location.protocol === "file:"
        ? "Browsers block JSON loading from local files, so the built-in demo is shown. Start a local server (see README) or open the deployed site."
        : "Could not load data/profile.json — check the file path and JSON syntax. The built-in demo content is shown for now.";

    notice.hidden = false;
  }

  /* ---------- Projects ---------- */

  async function loadProjects() {
    const grid = $("#projects-grid");
    const stateBox = $("#projects-state");
    const filterBar = $("#project-filters");
    if (!grid) return;

    grid.setAttribute("aria-busy", "true");
    if (stateBox) stateBox.hidden = true;
    if (filterBar) filterBar.hidden = true;
    renderSkeletons(grid);

    try {
      const data = await getJSON(PROJECTS_URL);
      if (!Array.isArray(data)) {
        throw new Error("projects.json must contain an array of projects");
      }

      const projects = data
        .map((item) => normalizeProject(item))
        .filter(Boolean);

      state.projects = projects;
      renderProjects(projects);
    } catch (error) {
      console.error("Could not load projects:", error);
      if (filterBar) filterBar.hidden = true;
      grid.replaceChildren();
      grid.setAttribute("aria-busy", "false");
      setProjectCount(null);
      showProjectsError(error);
    }
  }

  function normalizeProject(item) {
    if (!item || typeof item !== "object") return null;
    const title = text(item.title);
    if (!title) return null;

    const type = item.type === "bot" ? "bot" : "site";

    const tags = Array.isArray(item.tags)
      ? item.tags
          .filter((tag) => typeof tag === "string" && tag.trim())
          .map((tag) => tag.trim())
          .slice(0, 6)
      : [];

    const screenshots = Array.isArray(item.screenshots)
      ? item.screenshots
          .map((screenshot) => toUrl(screenshot))
          .filter(Boolean)
          .slice(0, 12)
      : [];

    return {
      type,
      title,
      description: text(item.description),
      image: toUrl(item.image),
      avatar: toUrl(item.avatar),
      screenshots,
      tags,
      demo: toUrl(item.demo),
      repo: toUrl(item.repo),
    };
  }

  function renderSkeletons(grid) {
    const skeleton = document.createElement("div");
    skeleton.className = "project-card is-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = `
      <div class="sk-media"></div>
      <div class="sk-body">
        <div class="sk-line is-title"></div>
        <div class="sk-line"></div>
        <div class="sk-line"></div>
        <div class="sk-line is-short"></div>
        <div class="sk-tags"><span></span><span></span><span></span></div>
      </div>`;

    const cards = [];
    for (let i = 0; i < 3; i += 1) cards.push(skeleton.cloneNode(true));
    grid.replaceChildren(...cards);
  }

  function renderProjects(projects) {
    const grid = $("#projects-grid");
    const stateBox = $("#projects-state");
    const filterBar = $("#project-filters");
    if (!grid) return;

    if (!projects.length) {
      if (filterBar) filterBar.hidden = true;
      grid.replaceChildren();
      grid.setAttribute("aria-busy", "false");
      setProjectCount(0);
      showProjectsEmpty();
      return;
    }

    const fragment = document.createDocumentFragment();
    projects.forEach((project, index) => {
      fragment.append(createProjectCard(project, index));
    });

    grid.replaceChildren(fragment);
    grid.setAttribute("aria-busy", "false");
    if (stateBox) stateBox.hidden = true;
    if (filterBar) filterBar.hidden = false;
    observeReveals(grid);
    applyFilter(state.activeFilter);
  }

  function createProjectCard(project, index) {
    const card = document.createElement("article");
    card.className = "project-card reveal";
    card.dataset.type = project.type;
    card.style.setProperty("--i", String(index));

    const isBot = project.type === "bot";
    const media = document.createElement("div");
    media.className = "project-media";
    if (isBot) media.classList.add("project-media--bot");

    const hue = hashHue(project.title);
    media.style.setProperty("--hue", String(hue));

    const fallback = document.createElement("div");
    fallback.className = "project-fallback";
    fallback.setAttribute("aria-hidden", "true");
    fallback.textContent = project.title.trim().charAt(0).toUpperCase();
    fallback.style.setProperty("--hue", String(hue));
    media.append(fallback);

    if (isBot) {
      if (project.avatar) {
        const avatarWrap = document.createElement("div");
        avatarWrap.className = "project-bot-avatar";

        const avatar = document.createElement("img");
        avatar.src = project.avatar;
        avatar.alt = `${project.title} — avatar`;
        avatar.loading = "lazy";
        avatar.decoding = "async";
        avatar.addEventListener(
          "error",
          () => {
            avatarWrap.remove();
          },
          { once: true }
        );

        avatarWrap.append(avatar);
        media.append(avatarWrap);
      }

      const botMark = document.createElement("span");
      botMark.className = "project-bot-mark";
      botMark.setAttribute("aria-hidden", "true");
      botMark.innerHTML = ICONS.telegram;
      media.append(botMark);
    } else if (project.image) {
      const image = document.createElement("img");
      image.src = project.image;
      image.alt = `${project.title} — project preview`;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener(
        "error",
        () => {
          image.remove();
        },
        { once: true }
      );
      media.append(image);
    }

    const kind = document.createElement("span");
    kind.className = `project-kind ${isBot ? "is-bot" : "is-site"}`;
    kind.textContent = isBot ? "Бот" : "Сайт";
    media.append(kind);

    const indexBadge = document.createElement("span");
    indexBadge.className = "project-index";
    indexBadge.setAttribute("aria-hidden", "true");
    indexBadge.textContent = String(index + 1).padStart(2, "0");
    media.append(indexBadge);

    const body = document.createElement("div");
    body.className = "project-body";

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = project.title;

    body.append(title);

    if (project.description) {
      const description = document.createElement("p");
      description.className = "project-desc";
      description.textContent = project.description;
      body.append(description);
    }

    if (project.tags.length) {
      const tags = document.createElement("ul");
      tags.className = "tags";
      tags.setAttribute("aria-label", "Technologies");
      project.tags.forEach((tag) => {
        const item = document.createElement("li");
        item.className = "tag";
        item.textContent = tag;
        item.style.setProperty("--hue", String(hashHue(tag)));
        tags.append(item);
      });
      body.append(tags);
    }

    const actions = document.createElement("div");
    actions.className = "project-actions";

    if (project.demo) {
      const demo = document.createElement("a");
      demo.className = "btn btn-primary btn-sm";
      demo.href = project.demo;
      demo.target = "_blank";
      demo.rel = "noopener noreferrer";
      demo.setAttribute(
        "aria-label",
        `${project.title} — ${isBot ? "открыть бота" : "открыть сайт"} (откроется в новой вкладке)`
      );
      demo.innerHTML = isBot
        ? `<span>Открыть бота</span><span class="btn-icon" aria-hidden="true">${ICONS.telegram}</span>`
        : `<span>Открыть сайт</span><span class="btn-icon" aria-hidden="true">${ICONS.external}</span>`;
      actions.append(demo);
    }

    if (isBot && project.screenshots.length) {
      const gallery = document.createElement("button");
      gallery.type = "button";
      gallery.className = "btn btn-ghost btn-sm";
      gallery.setAttribute("aria-haspopup", "dialog");
      gallery.setAttribute("aria-label", `${project.title} — скриншоты`);
      gallery.innerHTML = `<span class="btn-icon" aria-hidden="true">${ICONS.gallery}</span><span>Скриншоты</span>`;
      gallery.addEventListener("click", () => openGallery(project, gallery));
      actions.append(gallery);
    }

    if (project.repo) {
      const repo = document.createElement("a");
      repo.className = "btn btn-ghost btn-sm";
      repo.href = project.repo;
      repo.target = "_blank";
      repo.rel = "noopener noreferrer";
      repo.setAttribute("aria-label", `${project.title} — репозиторий (откроется в новой вкладке)`);
      repo.innerHTML = `<span class="btn-icon" aria-hidden="true">${ICONS.github}</span><span>Репозиторий</span>`;
      actions.append(repo);
    }

    if (actions.childNodes.length) body.append(actions);

    card.append(media, body);
    return card;
  }

  function applyFilter(filter) {
    const allowed = ["all", "site", "bot"];
    const nextFilter = allowed.includes(filter) ? filter : "all";
    state.activeFilter = nextFilter;

    $$("#project-filters .filter-btn").forEach((button) => {
      const active = button.dataset.filter === nextFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    let visible = 0;
    $$("#projects-grid .project-card[data-type]").forEach((card) => {
      const show = nextFilter === "all" || card.dataset.type === nextFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });

    setProjectCount(visible);
  }

  function setupFilters() {
    const filterBar = $("#project-filters");
    if (!filterBar) return;

    filterBar.addEventListener("click", (event) => {
      const button = event.target.closest(".filter-btn[data-filter]");
      if (!button) return;
      applyFilter(button.dataset.filter);
    });
  }

  function setProjectCount(count) {
    const node = $("#project-count");
    if (!node) return;
    if (count === null) {
      node.textContent = "—";
      return;
    }
    node.textContent = `${String(count).padStart(2, "0")} ${count === 1 ? "project" : "projects"}`;
  }

  function resetStateBox() {
    const box = $("#projects-state");
    if (!box) return null;
    box.replaceChildren();
    box.hidden = false;
    return box;
  }

  function showProjectsError(error) {
    const box = resetStateBox();
    if (!box) return;

    const icon = document.createElement("div");
    icon.className = "state-icon";
    icon.innerHTML = ICONS.warning;

    const title = document.createElement("h3");
    title.textContent = "Projects didn’t load";

    const message = document.createElement("p");
    if (window.location.protocol === "file:") {
      message.textContent =
        "Browsers block fetch() for local files. Start a small local server (python -m http.server) or open the deployed site — see README.md.";
    } else {
      const detail = error && error.message ? ` (${error.message})` : "";
      message.textContent = `Could not read data/projects.json${detail}. Check the path, the JSON syntax, and that the file is deployed with the site.`;
    }

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-primary btn-sm";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => loadProjects());

    box.append(icon, title, message, retry);
    box.setAttribute("role", "status");
  }

  function showProjectsEmpty() {
    const box = resetStateBox();
    if (!box) return;

    const icon = document.createElement("div");
    icon.className = "state-icon";
    icon.innerHTML = ICONS.empty;

    const title = document.createElement("h3");
    title.textContent = "Nothing here yet";

    const message = document.createElement("p");
    message.textContent =
      "Add your first project to data/projects.json — a title is enough; add type \"site\" or \"bot\", media, tags and links as needed.";

    box.append(icon, title, message);
    box.removeAttribute("role");
  }

  /* ---------- Reveal on scroll ---------- */

  function setupRevealObserver() {
    if (!("IntersectionObserver" in window)) return;
    state.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          state.revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
  }

  function observeReveals(root) {
    const items = root.querySelectorAll(".reveal:not(.is-visible)");
    if (!state.revealObserver) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    items.forEach((item) => state.revealObserver.observe(item));
  }

  /* ---------- Screenshot gallery ---------- */

  function setupGallery() {
    const modal = $("#gallery-modal");
    if (!modal) return;

    const close = $("#gallery-close");
    const backdrop = $("#gallery-backdrop");
    const prev = $("#gallery-prev");
    const next = $("#gallery-next");

    if (close) close.addEventListener("click", closeGallery);
    if (backdrop) backdrop.addEventListener("click", closeGallery);
    if (prev) prev.addEventListener("click", () => moveGallery(-1));
    if (next) next.addEventListener("click", () => moveGallery(1));

    document.addEventListener("keydown", (event) => {
      if (modal.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeGallery();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveGallery(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveGallery(1);
      }
    });
  }

  function openGallery(project, opener) {
    const modal = $("#gallery-modal");
    if (!modal || !project.screenshots.length) return;

    state.gallery = {
      project,
      images: project.screenshots,
      index: 0,
      opener: opener || null,
    };

    setText("#gallery-kicker", "Telegram bot · скриншоты");
    setText("#gallery-title", project.title);
    buildGalleryThumbs();
    setGalleryIndex(0);

    modal.hidden = false;
    document.body.classList.add("gallery-open");
    document.body.style.overflow = "hidden";

    const close = $("#gallery-close");
    if (close) close.focus({ preventScroll: true });
  }

  function closeGallery() {
    const modal = $("#gallery-modal");
    if (!modal || modal.hidden) return;

    const opener = state.gallery.opener;
    modal.hidden = true;
    document.body.classList.remove("gallery-open");
    document.body.style.overflow = "";
    state.gallery = { project: null, images: [], index: 0, opener: null };

    if (opener && typeof opener.focus === "function") {
      opener.focus({ preventScroll: true });
    }
  }

  function moveGallery(step) {
    if (!state.gallery.images.length) return;
    setGalleryIndex(state.gallery.index + step);
  }

  function setGalleryIndex(index) {
    const total = state.gallery.images.length;
    if (!total) return;

    const next = ((index % total) + total) % total;
    state.gallery.index = next;

    const image = $("#gallery-image");
    const error = $("#gallery-error");
    const imageSrc = state.gallery.images[next];

    if (image) {
      image.hidden = false;
      image.src = imageSrc;
      image.alt = `${state.gallery.project.title} — скриншот ${next + 1}`;
      image.onload = () => {
        if (image.src === imageSrc) {
          const errorNode = $("#gallery-error");
          if (errorNode) errorNode.hidden = true;
        }
      };
      image.onerror = () => {
        if (image.src !== imageSrc) return;
        image.hidden = true;
        const errorNode = $("#gallery-error");
        if (errorNode) errorNode.hidden = false;
      };
    }

    if (error) error.hidden = true;
    setText("#gallery-counter", `${next + 1} / ${total}`);

    const prev = $("#gallery-prev");
    const nextButton = $("#gallery-next");
    const thumbs = $("#gallery-thumbs");
    if (prev) prev.hidden = total <= 1;
    if (nextButton) nextButton.hidden = total <= 1;
    if (thumbs) thumbs.hidden = total <= 1;

    $$("#gallery-thumbs .gallery-thumb").forEach((thumb, thumbIndex) => {
      const active = thumbIndex === next;
      thumb.classList.toggle("is-active", active);
      thumb.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function buildGalleryThumbs() {
    const thumbs = $("#gallery-thumbs");
    if (!thumbs) return;

    thumbs.replaceChildren();
    state.gallery.images.forEach((src, index) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "gallery-thumb";
      thumb.setAttribute("aria-label", `Скриншот ${index + 1}`);
      thumb.setAttribute("aria-current", "false");

      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => image.remove(), { once: true });

      thumb.append(image);
      thumb.addEventListener("click", () => setGalleryIndex(index));
      thumbs.append(thumb);
    });
  }

  /* ---------- Boot ---------- */

  function setup() {
    setupTheme();
    setupHeader();
    setupRevealObserver();
    setupFilters();
    setupGallery();

    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    const noticeClose = $("#config-notice-close");
    const notice = $("#config-notice");
    if (noticeClose && notice) {
      noticeClose.addEventListener("click", () => {
        notice.hidden = true;
      });
    }

    loadProfile();
    loadProjects();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
