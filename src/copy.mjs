import { slugify } from './site.mjs';

// Proper names, handles, image paths, technology names and URLs come from data/.
// English site descriptions are already the originals. The two bot descriptions
// were originally in Russian / Ukrainian; both published locales translate them.
const projectText = {
  'marzipan-confectionery': {
    uk: 'Адаптивна демоверсія кондитерської в Києві. У каталозі — вісім тортів із фільтрами за категоріями. Конструктор із чотирьох кроків одразу перераховує ціну, а кошик зберігається між відвідуваннями, показує поріг безкоштовної доставки та веде до повного демооформлення замовлення.',
    leadUk: 'Демомагазин кондитерської з каталогом тортів, конструктором і кошиком.',
    leadEn: 'A confectionery storefront with a cake catalogue, custom cake builder and cart.',
  },
  'mriia-beauty-studio': {
    uk: 'Демосайт вигаданої київської студії краси. У каталозі — 14 послуг із пошуком і фільтрами за категоріями, а в розділі команди можна вибрати майстриню за спеціалізацією. Демозапис складається з трьох кроків: форма перевіряє доступний час, зберігає запис у браузері й дає змогу додати його до календаря. Кремовий інтерфейс доповнюють авторські 3D-ілюстрації у стилі глиняної скульптури, відрендерені заздалегідь.',
    leadUk: 'Каталог послуг, вибір майстрині та демозапис до вигаданої київської студії краси.',
    leadEn: 'A service catalogue, team directory and demo booking flow for a fictional Kyiv beauty studio.',
  },
  'english-reading-lab': {
    uk: 'Інтерактивний вебурок англійської: текст озвучується з підсвічуванням кожного слова. Значення слів можна перевірити з урахуванням двох контекстів, розуміння прочитаного — за допомогою тесту, а лексику — повторити за картками з інтервальним повторенням (SRS).',
    leadUk: 'Урок читання з озвученням, контекстним словником, тестом і картками для повторення.',
    leadEn: 'An interactive reading lesson with speech highlighting, vocabulary lookup, a quiz and SRS flashcards.',
  },
  lumiere: {
    uk: 'Сучасний вебпроєкт із вишуканим візуальним оформленням, адаптивною версткою та інтерактивними елементами інтерфейсу.',
    leadUk: 'Адаптивний інтерфейс сайту салону з інтерактивними елементами.',
    leadEn: 'A responsive salon website with a carefully composed visual identity and interactive UI.',
  },
  'nika-ribbons-fittings': {
    uk: 'Демоверсія інтернет-магазину стрічок і фурнітури. Каталог із дев’яти товарів підтримує пошук, сортування, фільтри та швидкий перегляд. Вміст кошика зберігається між відвідуваннями; є оформлення замовлення, локальна історія замовлень і світла та темна теми.',
    leadUk: 'Демомагазин стрічок і фурнітури з каталогом, кошиком та оформленням замовлення.',
    leadEn: 'A ribbon and fittings store demo, from catalogue search and quick view to cart and checkout.',
  },
  'fluentfable-bot': {
    uk: 'Telegram-бот для приймання заявок на послуги. Клієнт обирає мову (російську або англійську) і крок за кроком вказує послугу, бюджет, опис та термін. Адміністратор отримує сповіщення про нові замовлення й керує статусами в адмінпанелі: нові, в обробці, завершені. Клієнт може скасувати заявку.',
    en: 'A Telegram bot for service requests. Clients choose Russian or English and enter the service, budget, brief and deadline step by step. New requests notify the administrator, who can track them as new, in progress or completed in the admin panel. Clients can cancel a request.',
    leadUk: 'Заявки на послуги в Telegram: від першого запитання до зміни статусу в адмінпанелі.',
    leadEn: 'Service requests in Telegram, from a guided brief to status tracking in the admin panel.',
  },
  'barber-studio-booking-bot': {
    uk: 'Telegram-бот для автоматизації онлайн-запису до салону чи перукарні. Клієнт може переглянути послуги та ціни, вибрати зручні дату й час, надіслати заявку та переглянути власні записи.',
    en: 'A Telegram bot that automates online booking for a salon or barbershop. Clients can browse services and prices, choose a convenient date and time, submit a request and view their own appointments.',
    leadUk: 'Перегляд послуг і цін, вибір часу та запис до перукарні в Telegram.',
    leadEn: 'A Telegram booking flow for browsing services, choosing a time and reviewing appointments.',
  },
};

export const ui = {
  uk: {
    projects: 'Проєкти', about: 'Про мене', contact: 'Контакти', home: 'На головну', top: 'Нагору', skip: 'До вмісту',
    nav: 'Основна навігація', menu: 'Меню', menuOpen: 'Відкрити меню', menuClose: 'Закрити меню', language: 'Мова сайту',
    portfolio: 'Портфоліо розробника', hero: ['Фронтенд і', 'ШІ-застосунки'], workCTA: 'До проєктів', startProject: 'Обговорити проєкт', selected: 'Вибрані роботи',
    statement: ['Складні ідеї.', 'Зрозумілі рішення.'], aboutHeading: 'Як я працюю',
    all: 'Усі', sites: 'Сайти', bots: 'Боти', site: 'Вебсайт', bot: 'Telegram-бот', filters: 'Фільтр проєктів',
    live: 'Відкрити сайт', launch: 'Відкрити бота', source: 'Вихідний код', newTab: 'у новій вкладці', details: 'Про проєкт', stack: 'Технології', type: 'Тип проєкту',
    preview: 'Попередній огляд сайту', botPreview: 'Інтерфейс Telegram-бота', avatar: 'Аватар', artwork: 'Ілюстрація профілю',
    practice: 'Практика', expertise: ['Вебінтерфейси','Інтерактивні продукти','Автоматизація в Telegram'],
    contactTitle: 'Є ідея для проєкту?', contactBody: 'Я завжди відкритий до співпраці над продуктами, складних завдань із фронтенду та змістовних розмов. Найшвидше зі мною зв’язатися електронною поштою або в Telegram.',
    copy: 'Скопіювати електронну адресу', built: 'Створено на HTML, CSS і JavaScript', back: 'До всіх проєктів', nextProject: 'Наступний проєкт',
    shots: 'Знімки екрана', enlarge: 'Збільшити знімок', shot: 'Знімок екрана', prev: 'Попередній знімок', next: 'Наступний знімок', closeGallery: 'Закрити галерею', thumbs: 'Вибрати знімок', shotError: 'Не вдалося завантажити знімок.',
    missing: 'Сторінку не знайдено', missingBody: 'За цією адресою немає сторінки. Перейдіть до портфоліо, щоб переглянути роботи.',
    artLabel: '3D-етюд', artAlt: 'Chrome Infinity: дві переплетені стрічки з титану й темного хрому з тонкою блакитною інкрустацією.',
    artHint: 'Обертається автоматично · тягніть, щоб керувати',
    artHelp: 'Модель повільно обертається. Тягніть, щоб керувати; стрілки — поворот, Home — початковий ракурс.',
    runtime: { showing: 'Показано проєктів: {count}', of: 'із', copied: 'Електронну адресу скопійовано.', copyFallback: 'Адресу виділено. Скопіюйте її або відкрийте поштове посилання.', loading: 'Завантаження 3D…', ready: '3D-модель обертається.', artError: '3D-перегляд недоступний. Показано студійний рендер.' },
  },
  en: {
    projects: 'Projects', about: 'About', contact: 'Contact', home: 'Home', top: 'Back to top', skip: 'Skip to content',
    nav: 'Primary navigation', menu: 'Menu', menuOpen: 'Open menu', menuClose: 'Close menu', language: 'Site language',
    portfolio: 'Developer portfolio', hero: ['Frontend &', 'AI apps'], workCTA: 'View projects', startProject: 'Start a project', selected: 'Selected work',
    statement: ['Complex ideas.', 'Made simple.'], aboutHeading: 'How I work',
    all: 'All', sites: 'Websites', bots: 'Bots', site: 'Website', bot: 'Telegram bot', filters: 'Filter projects',
    live: 'Live demo', launch: 'Open bot', source: 'Source code', newTab: 'new tab', details: 'Project details', stack: 'Technologies', type: 'Project type',
    preview: 'Website preview', botPreview: 'Telegram bot interface', avatar: 'Avatar', artwork: 'Profile artwork',
    practice: 'Practice', expertise: ['Web interfaces','Interactive products','Telegram automation'],
    contactTitle: 'Have an idea worth building?', contactBody: 'I’m always open to product collaborations, frontend challenges, and thoughtful conversations. The fastest way to reach me is email or Telegram.',
    copy: 'Copy email address', built: 'Built with vanilla HTML, CSS & JS', back: 'All projects', nextProject: 'Next project',
    shots: 'Screenshots', enlarge: 'Enlarge screenshot', shot: 'Screenshot', prev: 'Previous screenshot', next: 'Next screenshot', closeGallery: 'Close gallery', thumbs: 'Choose a screenshot', shotError: 'Could not load this screenshot.',
    missing: 'Page not found', missingBody: 'There’s no page at this address. Return to the portfolio to explore the work.',
    artLabel: '3D study', artAlt: 'Chrome Infinity: two interlocking ribbons of titanium and smoked chrome with a narrow blue inlay.',
    artHint: 'Auto-rotating · drag to explore',
    artHelp: 'The model rotates slowly. Drag to control it; arrow keys turn the model and Home resets the view.',
    runtime: { showing: 'Projects shown: {count}', of: 'of', copied: 'Email address copied.', copyFallback: 'Email selected. Copy it or open the email link.', loading: 'Loading 3D…', ready: '3D model rotating.', artError: '3D view unavailable. Showing the studio render.' },
  },
};

export function content(profile, projects, locale) {
  const uk = locale === 'uk';
  const bio = uk ? 'Я проєктую і розробляю інтерактивні вебсервіси, які роблять складні ідеї зрозумілими. Останнім часом зосереджуюся на освітніх продуктах, де штучний інтелект допомагає людям вчитися, писати й творити.' : profile.bio;
  return { profile: { ...profile, bio, intro: bio.split('. ')[0] + '.', role: uk ? 'Розробник фронтенду та ШІ-застосунків' : profile.role,
    status: uk ? 'Відкритий до нових проєктів' : profile.status, location: uk ? 'Дистанційно · Європа' : profile.location },
    projects: projects.map(p => {
      const id = slugify(p.title), text = projectText[id];
      if (!text?.uk || !text.leadUk || !text.leadEn) throw Error(`Missing project translation: ${id}`);
      return { ...p, id, description: uk ? text.uk : text.en ?? p.description, lead: uk ? text.leadUk : text.leadEn,
        tags: p.tags.map(tag => uk ? ({ 'E-commerce':'Електронна комерція', 'Booking System':'Система запису' }[tag] ?? tag) : tag) };
    }) };
}
