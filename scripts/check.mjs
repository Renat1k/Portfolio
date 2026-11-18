import { readFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { slugify } from "../src/render.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const profile = JSON.parse((await readFile(path.join(root, "data/profile.json"), "utf8")).replace(/^\uFEFF/, ""));
const projects = JSON.parse((await readFile(path.join(root, "data/projects.json"), "utf8")).replace(/^\uFEFF/, ""));
const decode = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const pages = ["index.html", ...projects.map((project) => `projects/${slugify(project.title)}/index.html`), "404.html"];
const htmlByPath = new Map(await Promise.all(pages.map(async (page) => [page, await readFile(path.join(output, page), "utf8")])));
let localLinks = 0;
let images = 0;

for (const [page, html] of htmlByPath) {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${page}: one primary heading`);
  assert.ok(/<html lang="en">/.test(html), `${page}: document language`);
  assert.ok(/name="viewport"/.test(html), `${page}: mobile viewport`);
  assert.ok(!/Alex Morgan|yourhandle|hello@example\.com|{{|}}/.test(html), `${page}: no template content`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: unique element IDs`);
  if (page !== "404.html") {
    assert.ok(html.includes('id="menu-dialog"') && html.includes('id="gallery-dialog"'), `${page}: both accessible dialogs`);
    assert.ok(html.includes('rel="canonical"'), `${page}: canonical URL`);
    assert.equal(await readFile(path.join(root, page), "utf8"), html, `${page}: root deployment is up to date`);
  }

  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    assert.ok(/\balt="[^"]*"/.test(tag), `${page}: all images have alternatives`);
    images += 1;
  }

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = decode(match[1]);
    if (value.startsWith("mailto:")) {
      assert.ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.slice(7)), `${page}: valid email`);
      continue;
    }
    const url = new URL(value, `https://local.test/${page}`);
    assert.ok(["http:", "https:"].includes(url.protocol), `${page}: allowed URL protocol`);
    if (url.host !== "local.test") continue;
    let target = decodeURIComponent(url.pathname).replace(/^\//, "");
    if (!target || target.endsWith("/")) target += "index.html";
    const resolved = path.resolve(output, target);
    assert.ok(resolved.startsWith(`${output}${path.sep}`), `${page}: link stays in the output directory`);
    assert.ok((await stat(resolved).catch(() => null))?.isFile(), `${page}: ${value} exists`);
    assert.ok((await readdir(path.dirname(resolved))).includes(path.basename(resolved)), `${page}: filename case matches ${value}`);
    if (url.hash) {
      const targetHtml = htmlByPath.get(target) || await readFile(resolved, "utf8");
      assert.ok(targetHtml.includes(`id="${url.hash.slice(1)}"`), `${page}: ${value} has a valid anchor`);
    }
    localLinks += 1;
  }
}

const home = decode(htmlByPath.get("index.html"));
assert.equal((home.match(/class="project-card[\s"]/g) || []).length, projects.length, "All original projects appear on the home page");
for (const project of projects) {
  const detail = decode(htmlByPath.get(`projects/${slugify(project.title)}/index.html`));
  for (const content of [project.title, project.description, ...project.tags]) {
    assert.ok(home.includes(content), `Homepage retains: ${content}`);
    assert.ok(detail.includes(content), `Project page retains: ${content}`);
  }
  for (const url of [project.demo, project.repo].filter(Boolean)) {
    assert.ok(home.includes(`href="${url}"`), `Homepage retains ${url}`);
    assert.ok(detail.includes(`href="${url}"`), `Detail retains ${url}`);
  }
  for (const image of project.screenshots || []) {
    assert.ok(home.includes(image) && detail.includes(image.replace(/^\.\//, "../../")), `Gallery retains the original screenshot ${image}`);
  }
}
for (const value of [profile.name, profile.nickname, profile.role, profile.bio, profile.status, profile.location, ...Object.values(profile.socials)]) {
  assert.ok(home.includes(value), `Homepage retains profile data: ${value}`);
}

for (const match of (await readFile(path.join(root, "assets/css/styles.css"), "utf8")).matchAll(/url\("([^"]+)"\)/g)) {
  assert.ok((await stat(path.resolve(output, "assets/css", match[1]))).isFile(), `Local font ${match[1]} exists`);
}
assert.ok((await stat(path.join(output, "assets/img/social-cover.png"))).isFile(), "Social preview exists");
for (const file of ["assets/js/main.js", "src/render.mjs", "scripts/build.mjs", "scripts/serve.mjs"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.equal(result.status, 0, `${file}: ${result.stderr}`);
}
console.log(`Verified ${pages.length} pages, ${localLinks} local destinations, ${images} image alternatives, all original content and JavaScript syntax.`);
