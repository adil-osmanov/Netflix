const fs = require('fs');
let content = fs.readFileSync('src/app/admin/AdminControls.tsx', 'utf8');

content = content.replace(
  '          Скрыть кнопки "Добавить в категорию" в каруселях на сайте, чтобы интерфейс выглядел чисто.',
  '          Скрыть кнопки "Добавить", "Редактировать" и "Удалить" на всем сайте, чтобы интерфейс выглядел чисто.'
);

fs.writeFileSync('src/app/admin/AdminControls.tsx', content);
