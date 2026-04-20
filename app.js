// --- AYARLAR ---
const SUPABASE_URL = 'https://agemsbsgdeivyylzapwu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZW1zYnNnZGVpdnl5bHphcHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODMyMjUsImV4cCI6MjA5MjI1OTIyNX0.kTj0r4DlslY5HpgYUnlQtqgkEA2YXWua3nMysaB-wMM';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const PROXY_URL = 'https://script.google.com/macros/s/AKfycbwjhx5zoguEanyX1VvnZRdq6wb68lxdhIpiHR912DJHB7koMuWVeuL7DeE-mMiBKKctgQ/exec'; 
const VALO_ID = '128578';
const CS2_ID = '136955';
const ACADEMY_ID = '137866';
const PANDA_IDS = [VALO_ID, CS2_ID, ACADEMY_ID];

let EXTERNAL_DATA = { valorant: {}, cs2: {}, links: {} };

// --- FONKSİYONLAR ---
function formatFullDate(isoString) {
    const date = new Date(isoString);
    const gunler = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const gun = gunler[date.getDay()];
    const tarih = date.toLocaleDateString('tr-TR');
    const saat = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return `<div class="match-full-date">${tarih} - ${gun} | ${saat}</div>`;
}

function initAnimatedBg() {
    const bg = document.createElement('div');
    bg.className = 'animated-bg';
    document.body.appendChild(bg);
    for(let i=0; i<15; i++) {
        const circle = document.createElement('div');
        circle.className = 'bg-circle';
        circle.style.left = Math.random() * 100 + 'vw';
        circle.style.top = Math.random() * 100 + 'vh';
        circle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        bg.appendChild(circle);
    }
}

function toggleTheme() {
    const doc = document.documentElement;
    const currentTheme = doc.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    doc.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function filtrele(targetType, element) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if(element) element.classList.add('active');
    const filter = targetType.toLowerCase() === 'csgo' ? 'cs2' : targetType.toLowerCase();
    document.querySelectorAll('.match-card').forEach(card => {
        card.style.display = (filter === 'all' || card.classList.contains(filter)) ? 'block' : 'none';
    });
}

function updateCountdowns() {
    const now = new Date().getTime();
    document.querySelectorAll('.countdown-timer').forEach(timer => {
        const status = timer.getAttribute('data-status');
        if (status === 'running') {
            timer.innerHTML = `<span style="color:#ff4e00; font-weight:bold; animation: pulse 1.5s infinite;">● ŞU AN CANLI</span>`;
            return;
        }
        const startTime = new Date(timer.getAttribute('data-time')).getTime();
        const diff = startTime - now;
        if (diff > 0) {
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(mins / 60);
            const days = Math.floor(hours / 24);
            let parts = [];
            if (days > 0) parts.push(`${days}g`);
            if (hours % 24 > 0) parts.push(`${hours % 24}s`);
            if (mins % 60 > 0 && days === 0) parts.push(`${mins % 60}dk`);
            timer.innerHTML = `BAŞLAMASINA: ` + (parts.length > 0 ? parts.slice(0, 2).join(' ') : "Az Kaldı");
        } else if (status === 'finished') {
            timer.innerHTML = `<span style="color:var(--text-dim);">MAÇ TAMAMLANDI</span>`;
        }
    });
}

async function sonMaclariGetir(teamId, containerId) {
    const url = `https://api.pandascore.co/teams/${teamId}/matches?filter[status]=finished&per_page=5`;
    try {
        const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`);
        const matches = await response.json();
        const panel = document.getElementById(containerId);
        if (Array.isArray(matches) && panel) {
            panel.innerHTML = `<h3>${containerId.includes('valo') ? 'VALO' : 'CS2'}<br>FORM</h3>`;
            const chart = document.createElement('div');
            chart.className = 'form-chart';
            matches.forEach(m => {
                const bar = document.createElement('div');
                const isWin = m.winner_id == teamId;
                bar.className = `form-bar ${isWin ? 'win' : 'loss'}`;
                bar.style.height = isWin ? '100%' : '40%';
                chart.appendChild(bar);
            });
            panel.appendChild(chart);
        }
    } catch (e) { console.error("Form verisi çekilemedi."); }
}

async function loadData() {
    try {
        const res = await fetch('data.json');
        if (res.ok) EXTERNAL_DATA = await res.json();
    } catch (e) { console.error("Veri yüklenemedi."); }
}

function getPlayerHtml(name, gameType) {
    const key = name.toLowerCase().trim();
    let link = EXTERNAL_DATA.links && EXTERNAL_DATA.links[key] ? EXTERNAL_DATA.links[key] : null;
    if (!link) link = gameType === 'valorant' ? `https://www.vlr.gg/search/?q=${encodeURIComponent(name)}` : `https://www.hltv.org/search?query=${encodeURIComponent(name)}`;
    return `<li class="player-name"><a href="${link}" target="_blank">${name}</a></li>`;
}

// --- TAHMİN SİSTEMİ ---
async function getPredictionHtml(match) {
    if (!supabaseClient) return '<div class="pred-title">Bağlantı Hatası</div>';
    const now = new Date();
    const matchTime = new Date(match.begin_at);
    const diffHours = (matchTime - now) / (1000 * 60 * 60);
    const hasVoted = localStorage.getItem(`voted_${match.id}`);

    const { data } = await supabaseClient.from('predictions').select('choice').eq('match_id', match.id);

    let statsHtml = '<div class="stats-bar">Genel Tahmin Bulunmuyor</div>';
    if (data && data.length > 0) {
        const futVotes = data.filter(d => d.choice === 'FUT').length;
        const futPercent = Math.round((futVotes / data.length) * 100);
        statsHtml = `
            <div class="stats-bar">
                <span>FUT %${futPercent}</span>
                <div class="stat-progress"><div style="width:${futPercent}%; background:var(--accent);"></div></div>
                <span>%${100 - futPercent} RAKİP</span>
            </div>`;
    }

    if (match.status === 'finished') {
        if (!hasVoted) return `<div class="prediction-container">${statsHtml}<div class="pred-result neutral">OY KULLANILMADI</div></div>`;
        const isCorrect = (hasVoted === 'FUT' && PANDA_IDS.includes(match.winner_id?.toString())) || (hasVoted === 'RAKİP' && !PANDA_IDS.includes(match.winner_id?.toString()));
        return `<div class="prediction-container">${statsHtml}<div class="pred-result ${isCorrect ? 'win' : 'loss'}">${isCorrect ? '✅ TAHMİN TUTTU' : '❌ TAHMİN TUTMADI'}</div></div>`;
    }

    const isLocked = diffHours <= 1 || match.status === 'running' || hasVoted;
    return `
        <div class="prediction-container">
            ${statsHtml}
            <div class="pred-title">${hasVoted ? '✅ TAHMİNİN KAYDEDİLDİ' : (isLocked ? '🔒 TAHMİNLER KAPANDI' : 'KİM KAZANIR?')}</div>
            <div class="pred-btns">
                <button class="pred-btn ${hasVoted === 'FUT' ? 'active' : ''}" onclick="event.stopPropagation(); tahminYap('${match.id}', 'FUT')" ${isLocked ? 'disabled' : ''}>FUT</button>
                <button class="pred-btn ${hasVoted === 'RAKİP' ? 'active' : ''}" onclick="event.stopPropagation(); tahminYap('${match.id}', 'RAKİP')" ${isLocked ? 'disabled' : ''}>RAKİP</button>
            </div>
        </div>
    `;
}

async function tahminYap(matchId, choice) {
    if(!supabaseClient) return;
    try {
        const { error } = await supabaseClient.from('predictions').insert([{ match_id: matchId, choice: choice }]);
        if (error) throw error;
        localStorage.setItem(`voted_${matchId}`, choice);
        tumMaclariGetir();
    } catch (e) { alert("Kaydedilemedi."); }
}

async function tumMaclariGetir() {
    const container = document.getElementById('match-list');
    const isFutureSelected = document.getElementById('match-status-toggle')?.checked ?? true;
    if(!container) return;
    await loadData();
    container.innerHTML = '<div class="loader">FUT VERİLERİ ÇEKİLİYOR...</div>';

    try {
        const statuses = isFutureSelected ? ['running', 'not_started'] : ['finished'];
        let allPromises = [];
        PANDA_IDS.forEach(id => {
            statuses.forEach(status => {
                const url = `https://api.pandascore.co/teams/${id}/matches?filter[status]=${status}&per_page=10`;
                allPromises.push(fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`).then(r => r.json()));
            });
        });

        const results = await Promise.all(allPromises);
        let matches = results.flat().filter(m => m && m.id);
        matches = matches.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        if (!isFutureSelected) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            matches = matches.filter(m => new Date(m.begin_at) >= sevenDaysAgo);
            matches.sort((a, b) => new Date(b.begin_at) - new Date(a.begin_at));
        } else {
            matches.sort((a, b) => new Date(a.begin_at) - new Date(b.begin_at));
        }

        container.innerHTML = '';
        if (matches.length === 0) {
            container.innerHTML = `<p class="no-match">Görüntülenecek maç bulunamadı.</p>`;
            return;
        }

        const cardPromises = matches.map(async match => {
            const isAcademy = match.opponents.some(o => o.opponent.id.toString() === ACADEMY_ID);
            const opponent = match.opponents.find(o => !PANDA_IDS.includes(o.opponent.id.toString()));
            const futSide = match.opponents.find(o => PANDA_IDS.includes(o.opponent.id.toString()));
            const rakipName = opponent ? opponent.opponent.name : "TBD";
            const gameType = match.videogame.slug.includes('valorant') ? 'valorant' : 'cs2';
            
            let statusLabel = match.status === 'running' ? "CANLI" : (match.status === 'finished' ? "BİTTİ" : "GELECEK");
            let statusColor = match.status === 'running' ? "#ff4e00" : (match.status === 'finished' ? "#444" : "#007bff");

            let vsHtml = '<div class="vs">VS</div>';
            if (match.status !== 'not_started' && match.results) {
                const futScore = match.results.find(r => PANDA_IDS.includes(r.team_id.toString()))?.score ?? 0;
                const oppScore = match.results.find(r => !PANDA_IDS.includes(r.team_id.toString()))?.score ?? 0;
                vsHtml = `<div class="final-score">${futScore} - ${oppScore}</div>`;
            }

            const predHtml = await getPredictionHtml(match);
            const fullDateHtml = formatFullDate(match.begin_at);
            const watchBtnHtml = match.status !== 'finished' ? `<div class="actions"><a href="${gameType === 'valorant' ? 'https://www.twitch.tv/valorant_tur' : 'https://kick.com/rootthegamer'}" target="_blank" class="watch-btn" onclick="event.stopPropagation()">İZLE</a></div>` : '';

            let futPlayers = (EXTERNAL_DATA[gameType]?.[isAcademy ? "fut academy" : "fut esports"])?.map(p => getPlayerHtml(p, gameType)).join('') || "<li>Kadro Bekleniyor...</li>";
            let rakipPlayers = (EXTERNAL_DATA[gameType]?.[rakipName.toLowerCase().trim()])?.map(p => getPlayerHtml(p, gameType)).join('') || "<li>Bilgi yakında...</li>";

            return `
                <div class="match-card ${gameType}" onclick="this.classList.toggle('active')">
                    <div class="card-header">
                        <span class="branch-badge">${isAcademy ? "VAL / VCL" : gameType.toUpperCase()}</span>
                        <span class="status" style="background:${statusColor}">${statusLabel}</span>
                    </div>
                    <div class="team-wrapper">
                        <div class="team-container"><img src="${futSide?.opponent.image_url || ''}" class="team-logo"><div class="team">FUT</div></div>
                        ${vsHtml}
                        <div class="team-container"><div class="team">${rakipName}</div><img src="${opponent?.opponent.image_url || ''}" class="team-logo"></div>
                    </div>
                    <div class="countdown-timer" data-time="${match.begin_at}" data-status="${match.status}">...</div>
                    ${fullDateHtml}
                    ${predHtml}
                    <div class="match-details">
                        <div class="players-grid">
                            <div class="player-list"><strong>FUT</strong><ul>${futPlayers}</ul></div>
                            <div class="player-list"><strong>${rakipName.toUpperCase()}</strong><ul>${rakipPlayers}</ul></div>
                        </div>
                        ${watchBtnHtml}
                    </div>
                </div>`;
        });

        const cards = await Promise.all(cardPromises);
        container.innerHTML = cards.join('');
    } catch (e) { container.innerHTML = "Sistem Hatası!"; }
}

document.addEventListener('DOMContentLoaded', () => {
    initAnimatedBg();
    document.getElementById('theme-switch')?.addEventListener('click', toggleTheme);
    document.getElementById('match-status-toggle')?.addEventListener('change', tumMaclariGetir);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filtrele(btn.getAttribute('data-filter'), btn));
    });
    setInterval(updateCountdowns, 1000);
    sonMaclariGetir(VALO_ID, 'valo-form');
    sonMaclariGetir(CS2_ID, 'cs-form');
    tumMaclariGetir();
});