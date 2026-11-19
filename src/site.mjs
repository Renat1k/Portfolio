export const siteUrl = 'https://portfolio-y5j.pages.dev';
export const locales = ['uk', 'en'];
// Change this one value, then build: all unprefixed entry points use it.
export const defaultLocale = 'uk';
export const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const projectPath = project => `projects/${slugify(project.title)}/`;
export const localizedPath = (locale, route = '') => `/${locale}/${route}`;
