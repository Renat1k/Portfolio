import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { render } from "../src/render.mjs";
import { defaultLocale, locales, projectPath, slugify, siteUrl } from "../src/site.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJSON = async (name) => JSON.parse((await readFile(path.join(root, "data", name), "utf8")).replace(/^\uFEFF/, ""));
const profile = await readJSON("profile.json");
const projects = await readJSON("projects.json");

if (!profile.name || !profile.bio || !profile.socials?.email || !Array.isArray(projects) || !projects.length) {
  throw new Error("The profile and project collection must contain the existing portfolio content.");
}
const slugs = new Set();
for (const project of projects) {
  if (!project.title || !project.description || !["site", "bot"].includes(project.type)) {
    throw new Error(`Incomplete project: ${project.title || "untitled"}`);
  }
  const slug = slugify(project.title);
  if (slugs.has(slug)) throw new Error(`Duplicate project slug: ${slug}`);
  slugs.add(slug);
  for (const key of ["demo", "repo"]) {
    if (project[key] && !["http:", "https:"].includes(new URL(project[key]).protocol)) {
      throw new Error(`Invalid ${key} URL in ${project.title}`);
    }
  }
}

if (!locales.includes(defaultLocale)) throw Error('Unsupported default locale');
const routes = ['', ...projects.map(projectPath)];
for (const prefix of ['', ...locales]) {
  for (const route of [...routes, '404']) {
    const file = path.join(root, prefix, route === '404' ? '404.html' : `${route}index.html`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, render(profile,projects,{lang:prefix || defaultLocale,route,entry:!prefix}));
  }
}
const urls = locales.flatMap(lang => routes.map(route => `<url><loc>${siteUrl}/${lang}/${route}</loc>${locales.map(l=>`<xhtml:link rel="alternate" hreflang="${l}" href="${siteUrl}/${l}/${route}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/${route}"/></url>`));
await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);

const output = path.join(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ["index.html", "projects", ...locales, "assets", "data", ".nojekyll", "_headers", "robots.txt", "sitemap.xml", "404.html"]) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
console.log(`Built ${urls.length} localized pages, ${routes.length} legacy entry points and localized 404s. Default: ${defaultLocale}.`);
