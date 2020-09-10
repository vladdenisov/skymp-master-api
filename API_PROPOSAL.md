# Авторизация

`POST /users/:id/auth`
Parameters:

```json
{
"email": "exa@mple.net"
"password": "123456"
}
```

Result:

```json
{
  "token": "Json Web Token here",
  "gameDataToken": "Не уверен что это настоящий токен, скорее ключ"
}
```

# Сброс пароля

`POST /users/:id/reset`

# Посмотреть мои данные

`GET /users/:id`
Показываем адрес эл. почты и **рубли на счету**.
Без токена не пускаем.

# Game Data API

`PUT /gamedata/:serverAddress`
`GET /gamedata/:serverAddress`

Пример:
`/gamedata/5.180.57.212:7777`
(кажется, urlencode потребуется для двоеточия)

Для доступа требуется `gameDataToken` + соответствие IP из serverAddress IP-адресу отправителя запроса.

GameData - это данные в свободном JSON формате, специфичные для игрового сервера. Никто не должен читать/модифицировать их, кроме игрового сервера. **Индексировать их не нужно, храним просто как текст.** На практике, игровой сервер будет хранить там пару чисел, не более.

**Старые роуты для обратной совместимости**:

Для лаунчера:

GET /api/skymp_link/:version - ссылка на архив с версией version (чекай https://skymp.io/api/skymp_link/5.0.5.0).
GET /api/skse_link/:version - ссылка на SKSE для версии version
GET /api/latest_version - получить последнюю версию проекта

Для игрового сервера:

POST /api/servers/:address - создать или обновить инфу для сервера с опр. адресом (напр. 5.5.5.5:7777) в body лежат name, maxPlayers, online. см. текущую реализацию. https://github.com/skyrim-multiplayer/skymp5-master/blob/master/src/servers/router.js#L78
Игровые сервера раз в 5 секунд делают запрос на этот роут.

Для всеx:

GET /api/servers - https://skymp.io/api/servers - тупо список серверов из переменной.
GET /api/stats - https://skymp.io/api/stats - строим график по этому CSV. щас он хранится в монге, надо мигрировать будет
