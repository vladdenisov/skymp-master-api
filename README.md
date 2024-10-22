## Код стайл

- Испорты внешних зависимостей должны быть выше пользовательских и отделены строкой
  <br>

- Испорты должны использовать baseurl вместо относительного (в данный момент это невозможно из-за jest).

## GIT

- Перед отправкой кода сделать `npm run lint` и `npm run test`, исправить ошибки.

## Postgres

- Использовать стиль `snake_case`
  <br>

- Уделять внимание нормализации базы данных (минимум до 3 степени)
  <br>

- Уделять внимание защите данных и сокрытию приватной информации путем выделения последней в отдельную таблицу (1 : 1 связь)
  <br>

- Всю бизнес логику данных вешать на модели и БД (миграции). Например, хэшировать пароль не в контроллeре, а используя subscribe `@BeforeInsert` иливстроенный hash в Postgres, создав для этого триггер в миграции. Таким образом данные становятся более надежными. А использование нативных средств Postgres позволяет избежать ряда проблем, которые возникнут при использовании только ORM, ибо ORM не является заменой БД.

  <br>

- Не забывать правильно удалять данные из таблиц, которые реляционно связанны с другими. Читать про `ON DELETE`, `ON DELETE CASCADE`, `ON DELETE SET NULL`. Высокий уровень нормализации дает возможность безболезненно совершать такие действия. Если больно - хреново спроектированы таблицы.
