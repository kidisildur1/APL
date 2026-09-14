// ... (предыдущий код с predictions и teamBadges остается без изменений) ...

const fplIds = { denis: '44945', dima: '611237', ilya: '611230' };
let currentTable = [];
let fplData = { denis: null, dima: null, ilya: null };

// ⚠️ ЗАМЕНИТЕ ЭТОТ ТЕКСТ НА ТОТ, ЧТО ВЫ СКОПИРОВАЛИ ИЗ ВКЛАДКИ PAYLOAD
// Убедитесь, что кавычки ` (backticks) сохранены, а внутренние кавычки экранированы или используются двойные.
const SPORTS_RU_GRAPHQL_QUERY = `
  query GetFantasyTeam($id: ID!) {
    fantasyTeam(id: $id) {
      id
      name
      totalPoints
      currentGameweekPoints
      rank
    }
  }
`; 
// ^^^ Если ваш запрос сложнее, просто вставьте его целиком между этими обратными кавычками ` `

function saveWorkerUrl() {
    const url = document.getElementById('workerUrl').value;
    localStorage.setItem('workerUrl', url);
    showNotification('URL прокси сохранен!', 'success');
}

async function loadFPLData() {
    const workerUrl = localStorage.getItem('workerUrl');
    if (!workerUrl) {
        showNotification('Сначала введите URL Cloudflare Worker (см. инструкцию выше)!', 'error');
        return;
    }

    showNotification('Загрузка данных Fantasy...', 'success');
    const users = ['denis', 'dima', 'ilya'];
    let successCount = 0;

    for (const user of users) {
        try {
            const targetUrl = 'https://www.sports.ru/gql/graphql/';
            
            // Формируем тело GraphQL запроса
            const graphqlPayload = {
                query: SPORTS_RU_GRAPHQL_QUERY,
                variables: { id: fplIds[user] }
            };

            // Отправляем через ваш Cloudflare Worker, чтобы избежать CORS-ошибки
            const response = await fetch(`${workerUrl}?url=${encodeURIComponent(targetUrl)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify(graphqlPayload)
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            
            // GraphQL возвращает данные внутри объекта data
            const teamData = result.data?.fantasyTeam || result.data?.team || result.data; 
            
            if (teamData) {
                fplData[user] = {
                    name: teamData.name || `Команда ${user}`,
                    totalPoints: teamData.totalPoints || teamData.points || 0,
                    currentEvent: teamData.currentGameweek || teamData.gameweek || 0,
                    eventPoints: teamData.currentGameweekPoints || teamData.gameweek_points || 0,
                    rank: teamData.rank || teamData.position || 0
                };
                successCount++;
            } else {
                console.warn(`Нет данных для ${user}:`, result);
            }
        } catch (error) {
            console.error(`Ошибка загрузки ${user}:`, error);
        }
    }

    if (successCount > 0) {
        renderFPLLeaderboard();
        showNotification(`Успешно загружено: ${successCount} из 3 команд`, 'success');
    } else {
        showNotification('Не удалось загрузить данные. Проверьте GraphQL query и Worker URL.', 'error');
    }
}

function renderFPLLeaderboard() {
    const totals = {
        denis: { name: 'Денис', total: 0, color: '#667eea' },
        dima: { name: 'Дима', total: 0, color: '#f093fb' },
        ilya: { name: 'Илья', total: 0, color: '#4facfe' }
    };

    ['denis', 'dima', 'ilya'].forEach(user => {
        if (fplData[user]) {
            totals[user].total = fplData[user].totalPoints;
        }
    });

    const sorted = Object.values(totals).sort((a, b) => b.total - a.total);
    const container = document.getElementById('fplLeaderboard');
    
    container.innerHTML = sorted.map((p, idx) => `
        <div class="fpl-card" style="border-top: 4px solid ${p.color}">
            <div class="fpl-rank">#${idx + 1}</div>
            <div class="fpl-name">${p.name}</div>
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-primary);">${p.total}</div>
            <div style="color: var(--text-secondary); margin-bottom: 1rem;">всего очков</div>
            <div class="fpl-stats-row">
                <div class="fpl-stat-item"><div class="fpl-stat-val">${fplData[Object.keys(fplData).find(key => fplData[key]?.name === p.name)]?.currentEvent || '-'}</div><div class="fpl-stat-lbl">тур</div></div>
                <div class="fpl-stat-item"><div class="fpl-stat-val">${fplData[Object.keys(fplData).find(key => fplData[key]?.name === p.name)]?.eventPoints || '-'}</div><div class="fpl-stat-lbl">за тур</div></div>
                <div class="fpl-stat-item"><div class="fpl-stat-val">${fplData[Object.keys(fplData).find(key => fplData[key]?.name === p.name)]?.rank || '-'}</div><div class="fpl-stat-lbl">место</div></div>
            </div>
        </div>
    `).join('');
}

// ... (остальной код fetchTableFromAPI, renderCurrentTable и т.д. остается без изменений) ...