// --- AYARLAR VE DEĞİŞKENLER ---
const PROXY_URL = 'https://script.google.com/macros/s/AKfycbwjhx5zoguEanyX1VvnZRdq6wb68lxdhIpiHR912DJHB7koMuWVeuL7DeE-mMiBKKctgQ/exec'; 
const VALO_ID = '128578';
const CS2_ID = '136955';
const ACADEMY_ID = '137866';
const PANDA_IDS = [VALO_ID, CS2_ID, ACADEMY_ID];

let EXTERNAL_DATA = { valorant: {}, cs2: {}, links: {} };

// --- GLOBAL FONKSİYONLAR (Pencereye Bağlı) ---
window.toggleTheme = function() {
    const doc = document.documentElement;
    const currentTheme = doc.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    doc.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};

window.filtrele = function(b, e) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if(e && e.target) e.target.classList.add('active');
    const target = b.toLowerCase() === 'csgo' ? 'cs2' : b.toLowerCase();
    document.querySelectorAll('.match-card').forEach(card => {
        card.style.display = (target === 'all' || card.classList.contains(target)) ? 'block' : 'none';
    });
};

window.comingSoon = function(g) { alert(g + " yakında!"); };

// --- VERİ SİSTEMİ ---
async function loadData() {
    try {
        const res = await fetch('data.json');
        if (res.ok) EXTERNAL_DATA = await res.json();
    } catch (e) { console.error("Veri dosyası yüklenemedi."); }
}

function getPlayerHtml(name, gameType) {
    const key = name.toLowerCase().trim();
    let link = EXTERNAL_DATA.links && EXTERNAL_DATA.links[key] ? EXTERNAL_DATA.links[key] : null;
    if (!link) {
        link = gameType === 'valorant' 
            ? `https://www.vlr.gg/search/?q=${encodeURIComponent(name)}` 
            : `https://www.hltv.org/search?query=${encodeURIComponent(name)}`;
    }
    return `<li class="player-name"><a href="${link}" target="_blank">${name}</a></li>`;
}

// --- ANA FONKSİYONLAR ---
async function sonMaclariGetir(teamId, containerId) {
    if(!teamId) return;
    const url = `https://api.pandascore.co/teams/${teamId}/matches?filter[status]=finished&per_page=5`;
    const finalUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    try {
        const response = await fetch(finalUrl);
        const matches = await response.json();
        const panel = document.getElementById(containerId);
        if (Array.isArray(matches) && panel) {
            panel.innerHTML = `<h3>${containerId.includes('valo') ? 'VALO' : 'CS2'}</h3>`;
            matches.forEach(m => {
                const dot = document.createElement('div');
                dot.className = `form-dot ${m.winner_id == teamId ? 'win' : 'loss'}`;
                dot.innerText = m.winner_id == teamId ? 'W' : 'L';
                panel.appendChild(dot);
            });
        }
    } catch (e) {}
}

async function tumMaclariGetir() {
    const container = document.getElementById('match-list');
    if(!container) return;
    container.innerHTML = '<p style="text-align:center; color: var(--accent-color);">Veriler taranıyor...</p>';
    await loadData();
    
    try {
        const pandaPromises = PANDA_IDS.map(async (id) => {
            const pandaUrl = `https://api.pandascore.co/teams/${id}/matches?filter[status]=not_started`;
            const finalUrl = `${PROXY_URL}?url=${encodeURIComponent(pandaUrl)}`;
            const res = await fetch(finalUrl);
            return res.json();
        });

        const results = await Promise.all(pandaPromises);
        let allMatches = results.flat().filter(m => m && m.id);
        container.innerHTML = '';
        allMatches.sort((a, b) => new Date(a.begin_at) - new Date(b.begin_at));

        allMatches.forEach(match => {
            const isAcademy = match.opponents.some(o => o.opponent.id.toString() === ACADEMY_ID);
            const opponentData = match.opponents.find(o => !PANDA_IDS.includes(o.opponent.id.toString()));
            const futSide = match.opponents.find(o => PANDA_IDS.includes(o.opponent.id.toString()));
            const rakipName = opponentData ? opponentData.opponent.name : "TBD";
            
            const isVal = match.videogame.slug.toLowerCase().includes('valorant');
            const gameType = isVal ? 'valorant' : 'cs2';
            const tarih = new Date(match.begin_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

            let futKey = isAcademy ? "fut academy" : "fut esports";
            let rakipKey = rakipName.toLowerCase().trim();
            
            let futPlayersHTML = (EXTERNAL_DATA[gameType] && EXTERNAL_DATA[gameType][futKey]) 
                ? EXTERNAL_DATA[gameType][futKey].map(p => getPlayerHtml(p, gameType)).join('')
                : (isVal ? ["Kadro Bekleniyor..."] : []).map(p => `<li>${p}</li>`).join('');

            let rakipPlayersHTML = (EXTERNAL_DATA[gameType] && EXTERNAL_DATA[gameType][rakipKey])
                ? EXTERNAL_DATA[gameType][rakipKey].map(p => getPlayerHtml(p, gameType)).join('')
                : "<li>Kadro bilgisi yakında...</li>";

            const card = document.createElement('div');
            card.className = `match-card ${gameType} ${isAcademy ? 'vcl' : ''}`;
            card.onclick = function() { this.classList.toggle('active'); };

            card.innerHTML = `
                <div class="card-header">
                    <span class="branch-badge">${isAcademy ? "VAL / VCL" : match.videogame.name.toUpperCase()}</span>
                    <span class="status"><span class="live-dot"></span>GELECEK</span>
                </div>
                <div class="team-wrapper">
                    <div class="team-container">
                        <img src="${futSide?.opponent.image_url || ''}" class="team-logo">
                        <div class="team">${isAcademy ? "FUT ACADEMY" : "FUT ESPORTS"}</div>
                    </div>
                    <div class="vs">vs</div>
                    <div class="team-container">
                        <div class="team">${rakipName}</div>
                        <img src="${opponentData?.opponent.image_url || ''}" class="team-logo">
                    </div>
                </div>
                <div class="time">${tarih}</div>
                <div class="countdown-timer" data-time="${match.begin_at}">...</div>
                <div class="match-details">
                    <div class="players-grid" style="display: flex; justify-content: space-around; text-align: left; padding: 10px 0;">
                        <div class="player-list"><strong>FUT</strong><ul style="list-style:none; padding:0;">${futPlayersHTML}</ul></div>
                        <div class="player-list"><strong>${rakipName}</strong><ul style="list-style:none; padding:0;">${rakipPlayersHTML}</ul></div>
                    </div>
                    <div class="actions" style="text-align:center; margin-top:10px;">
                        ${isVal ? '<a href="https://www.twitch.tv/valorant_tur" target="_blank" class="watch-btn">YAYINI İZLE (TR)</a>' : '<a href="https://kick.com/rootthegamer" target="_blank" class="watch-btn" style="background:#00e701; color:#000;">ROOT (TR)</a>'}
                    </div>
                </div>`;
            container.appendChild(card);
        });
        updateCountdowns();
    } catch (error) { container.innerHTML = '<p style="text-align:center;">Maçlar yüklenirken hata oluştu.</p>'; }
}

function updateCountdowns() {
    const now = new Date().getTime();
    document.querySelectorAll('.countdown-timer').forEach(timer => {
        const startTime = new Date(timer.getAttribute('data-time')).getTime();
        const diff = startTime - now;

        if (diff > 0) {
            const secs = Math.floor(diff / 1000);
            const mins = Math.floor(secs / 60);
            const hours = Math.floor(mins / 60);
            const days = Math.floor(hours / 24);
            const weeks = Math.floor(days / 7);
            const months = Math.floor(days / 30);

            let timeParts = [];
            if (months > 0) timeParts.push(`${months} Ay`);
            if (weeks % 4 > 0 && months < 3) timeParts.push(`${weeks % 4} Hafta`);
            if (days % 7 > 0 && weeks < 4) timeParts.push(`${days % 7} Gün`);
            if (hours % 24 > 0 && days < 7) timeParts.push(`${hours % 24} Saat`);
            if (mins % 60 > 0 && hours < 24) timeParts.push(`${mins % 60} Dakika`);
            if (secs % 60 > 0 && mins < 60) timeParts.push(`${secs % 60} Saniye`);

            timer.innerHTML = `KALAN: ` + (timeParts.length > 0 ? timeParts.slice(0, 2).join(' ') : "Başlıyor...");
        } else {
            timer.innerHTML = `<span style="color:#00e701; font-weight:bold;">CANLI VEYA TAMAMLANDI</span>`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setInterval(updateCountdowns, 1000);
    sonMaclariGetir(VALO_ID, 'valo-form');
    sonMaclariGetir(CS2_ID, 'cs-form');
    tumMaclariGetir();
});