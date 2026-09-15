# АПЛ — Fantasy «Три товарища»

## Локальный запуск

Запустите `start.bat` (нужен Python 3) и откройте http://localhost:8000/.
Fantasy получает данные напрямую из Sports.ru. На карточке нажмите «Посмотреть состав»;
можно выбрать команду и тур. Очки игрока берутся из `tourScore.score`, а не `score`.
Обновление выполняется раз в минуту на видимой странице, при возвращении на вкладку
и восстановлении сети. Закрытая страница запросов не делает.

## GitHub Pages без Worker

1. В Settings → Pages → Build and deployment выберите Source: GitHub Actions.
2. После включения этих изменений в main запустится workflow Refresh Fantasy and deploy Pages.
   Также его можно запустить в Actions → Run workflow.
3. Сайт будет доступен по адресу https://kidisildur1.github.io/APL/.

Sports.ru не выдаёт разрешение CORS для github.io. Поэтому Actions получает публичные
данные серверным запросом, формирует JSON и публикует сайт вместе с ними. Токены Sports.ru
и Cloudflare не нужны. Workflow получает данные примерно раз в 5 минут даже при закрытом
сайте; браузер проверяет опубликованные файлы каждую минуту. Расписание GitHub может
задерживаться. При ошибке сборки предыдущая публикация остаётся доступной. Данные старше
20 минут помечаются как устаревшие. Время на карточке — время получения данных из источника.
В публичных неактивных репозиториях GitHub может отключить расписание после 60 дней без
активности: его следует включить снова в Actions. Постоянная доступность Sports.ru не гарантируется.

Сборщик: `python scripts/update_fantasy.py` (только стандартная библиотека Python).
Запросы проверяют текущий сезон, турнир и ID команд. Никакие составы в Sports.ru не меняются.

Справка GitHub:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
