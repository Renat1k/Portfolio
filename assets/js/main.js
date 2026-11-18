/* Progressive enhancement only: all content and destinations are pre-rendered. */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menu = $("#menu-dialog");
  const gallery = $("#gallery-dialog");
  const menuToggle = $("#menu-toggle");
  let galleryState = { project: null, index: 0, opener: null };
  let toastTimer;
  let touchStart = null;

  const projects = JSON.parse($("#project-data")?.textContent || "[]");

  function syncScrollLock() {
    document.body.classList.toggle("is-dialog-open", Boolean($("dialog[open]")));
  }

  // Keep Tab inside the dialog, including when the last control would reach browser chrome.
  document.addEventListener("keydown", (event) => {
    const dialog = gallery?.open ? gallery : menu?.open ? menu : null;
    if (!dialog || event.key !== "Tab") return;
    const controls = $$("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])", dialog)
      .filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }, true);

  function closeMenu() {
    if (menu?.open) menu.close();
  }

  if (menu && menuToggle) {
    menuToggle.addEventListener("click", () => {
      menu.showModal();
      menuToggle.setAttribute("aria-expanded", "true");
      syncScrollLock();
      $("#menu-close").focus();
    });
    $("#menu-close").addEventListener("click", closeMenu);
    $$("a", menu).forEach((link) => link.addEventListener("click", closeMenu));
    menu.addEventListener("close", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      syncScrollLock();
    });
    window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
      if (event.matches) closeMenu();
    });
  }

  /* Monochrome active navigation and restrained entrance transitions. */
  const header = $("#site-header");
  let scrollScheduled = false;
  function updateHeader() {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
    scrollScheduled = false;
  }
  updateHeader();
  window.addEventListener("scroll", () => {
    if (!scrollScheduled) {
      requestAnimationFrame(updateHeader);
      scrollScheduled = true;
    }
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    if (!reducedMotion.matches) {
      document.documentElement.classList.add("motion-ready");
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.06, rootMargin: "0px 0px -24px 0px" });
      $$(".reveal").forEach((element) => revealObserver.observe(element));
      reducedMotion.addEventListener("change", (event) => {
        if (event.matches) document.documentElement.classList.remove("motion-ready");
      });
    }

    if (document.body.dataset.page === "home") {
      const sections = $$("main > section[id]");
      const navObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            $$("[data-nav]").forEach((link) => {
              if (link.dataset.nav === entry.target.id) link.setAttribute("aria-current", "location");
              else link.removeAttribute("aria-current");
            });
          }
        });
      }, { rootMargin: "-15% 0px -55% 0px", threshold: 0 });
      sections.forEach((section) => navObserver.observe(section));
    }
  }

  /* Filtering never changes or truncates the source content. */
  $$("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      let count = 0;
      $$("[data-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      $$(".project-card").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.type !== filter;
        if (!card.hidden) count += 1;
      });
      const status = $("#filter-status");
      if (status) status.textContent = `Showing ${count} ${filter === "all" ? "projects" : filter === "site" ? "websites" : "Telegram bots"}`;
    });
  });

  /* Native modal semantics retain keyboard focus and make the background inert. */
  function setGalleryIndex(index) {
    const project = galleryState.project;
    if (!project?.images.length) return;
    const total = project.images.length;
    const next = ((index % total) + total) % total;
    galleryState.index = next;
    const image = $("#gallery-image");
    const error = $("#gallery-error");
    error.hidden = true;
    image.hidden = false;
    image.alt = `${project.title} — screenshot ${next + 1} of ${total}`;
    image.onload = () => { error.hidden = true; image.hidden = false; };
    image.onerror = () => { error.hidden = false; image.hidden = true; };
    image.src = project.images[next];
    $("#gallery-counter").textContent = `${String(next + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    $("#gallery-prev").hidden = total <= 1;
    $("#gallery-next").hidden = total <= 1;
    $$(".gallery-thumb").forEach((thumb, thumbIndex) => {
      thumb.setAttribute("aria-current", String(thumbIndex === next));
    });
    // Warm the next real screenshot without adding any external requests.
    if (total > 1) {
      const preload = new Image();
      preload.src = project.images[(next + 1) % total];
    }
  }

  function openGallery(id, index, opener) {
    const project = projects.find((item) => item.id === id);
    if (!project?.images.length || !gallery) return;
    galleryState = { project, index: 0, opener };
    $("#gallery-title").textContent = project.title;
    $("#gallery-kicker").textContent = `${project.type === "bot" ? "Telegram bot" : "Website"} / Screenshots`;
    const thumbs = $("#gallery-thumbs");
    thumbs.replaceChildren(...project.images.map((source, imageIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-thumb";
      button.setAttribute("aria-label", `Screenshot ${imageIndex + 1}`);
      const image = document.createElement("img");
      image.src = source;
      image.alt = "";
      button.append(image);
      button.addEventListener("click", () => setGalleryIndex(imageIndex));
      return button;
    }));
    setGalleryIndex(index);
    gallery.showModal();
    syncScrollLock();
    $("#gallery-close").focus();
  }

  $$('[data-gallery]').forEach((opener) => {
    opener.addEventListener("click", () => openGallery(opener.dataset.gallery, Number(opener.dataset.galleryIndex || 0), opener));
  });

  if (gallery) {
    $("#gallery-close").addEventListener("click", () => gallery.close());
    $("#gallery-prev").addEventListener("click", () => setGalleryIndex(galleryState.index - 1));
    $("#gallery-next").addEventListener("click", () => setGalleryIndex(galleryState.index + 1));
    gallery.addEventListener("click", (event) => {
      if (event.target === gallery) {
        const bounds = gallery.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) gallery.close();
      }
    });
    gallery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setGalleryIndex(galleryState.index + (event.key === "ArrowLeft" ? -1 : 1));
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setGalleryIndex(event.key === "Home" ? 0 : galleryState.project.images.length - 1);
      }
    });
    gallery.addEventListener("close", () => {
      syncScrollLock();
      galleryState.opener?.focus({ preventScroll: true });
      galleryState = { project: null, index: 0, opener: null };
    });
    const viewport = $("#gallery-viewport");
    viewport.addEventListener("touchstart", (event) => {
      const point = event.changedTouches[0];
      touchStart = { x: point.clientX, y: point.clientY };
    }, { passive: true });
    viewport.addEventListener("touchend", (event) => {
      if (!touchStart) return;
      const point = event.changedTouches[0];
      const horizontal = point.clientX - touchStart.x;
      const vertical = point.clientY - touchStart.y;
      if (Math.abs(horizontal) > 48 && Math.abs(horizontal) > Math.abs(vertical) * 1.4) {
        setGalleryIndex(galleryState.index + (horizontal < 0 ? 1 : -1));
      }
      touchStart = null;
    }, { passive: true });
  }

  const copyButton = $("#copy-email");
  copyButton?.addEventListener("click", async () => {
    let message = "Email copied to clipboard";
    try {
      await navigator.clipboard.writeText(copyButton.dataset.email);
    } catch {
      // A denied clipboard permission still leaves a usable, selectable address.
      const range = document.createRange();
      range.selectNodeContents($(".contact-email"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message = "Email selected — copy it or open the email link";
    }
    const toast = $("#toast");
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  });

  $$("[data-year]").forEach((element) => { element.textContent = String(new Date().getFullYear()); });
})();
