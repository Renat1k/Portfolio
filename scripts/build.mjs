import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { renderHome, renderProject, slugify, siteUrl } from "../src/render.mjs";

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

// Checked-in HTML also supports the existing Cloudflare root-directory deployment.
await writeFile(path.join(root, "index.html"), renderHome(profile, projects));
for (const [index, project] of projects.entries()) {
  const directory = path.join(root, "projects", slugify(project.title));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderProject(profile, projects, index));
}

const urls = ["", ...projects.map((project) => `projects/${slugify(project.title)}/`)];
await writeFile(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${siteUrl}/${url}</loc></url>`).join("\n")}\n</urlset>\n`);

const output = path.join(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ["index.html", "projects", "assets", "data", ".nojekyll", "_headers", "robots.txt", "sitemap.xml", "404.html"]) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
console.log(`Built ${urls.length} pre-rendered pages in dist/ (and updated the deployable root HTML).`);
