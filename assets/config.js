/* Фабрика моментів — налаштування сайту. Єдиний файл, який правиться вручну.
   Після зміни: зберегти → завантажити на Cloudflare Pages (або коміт у репозиторій). */
window.FM_CONFIG = {
  // Адреса скрипту заявок (таблиця «Заявки» → Розгорнути → Вебзастосунок). Порожньо — форма показує контакти замість відправки.
  ordersUrl: 'https://script.google.com/macros/s/AKfycbxGivimHRiwNO9UwtndDxyzRk5z89aUUrnBzdrnpaT0Oo5Adu0rXG6DH48vVf4ug9hcHQ/exec',

  // Адреса скрипту каталогу (таблиця «Календар і товари», FM_site_script v1.2).
  // Порожньо — сайт бере вбудовану копію даних assets/data.js. Вмикати після встановлення v1.2 і Cloudinary.
  catalogUrl: '',

  instagram: 'https://www.instagram.com/fabrykamomentiv/',
  email: 'fabrykamomentiv@gmail.com',
  telegram: ''   // порожньо — іконка показує «Тимчасово недоступно»; приклад: 'https://t.me/нік'
};
/* Аналітика (GTM, банер згоди) вмикається в assets/site.js: bannerEnabled + gtmId. */
