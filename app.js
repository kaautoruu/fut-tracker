// --- AYARLAR ---
const PROXY_URL = 'https://script.google.com/macros/s/AKfycbwjhx5zoguEanyX1VvnZRdq6wb68lxdhIpiHR912DJHB7koMuWVeuL7DeE-mMiBKKctgQ/exec'; 
const VALO_ID = '128578';
const CS2_ID = '136955';
const ACADEMY_ID = '137866';
const PANDA_IDS = [VALO_ID, CS2_ID, ACADEMY_ID];

let EXTERNAL_DATA = { valorant: {}, cs2: {}, links: {} };

// --- TEMA SİSTEMİ ---
function toggleTheme() {
    const doc = document.documentElement;
    const currentTheme = doc.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    doc.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// --- FİLTRELEME ---
function filtrele(targetType, element) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if(element) element.classList.add('active');
    
    const filter = targetType.toLowerCase() === 'csgo' ? 'cs2' : targetType.toLowerCase();
    document.querySelectorAll('.match-card').forEach(card => {
        card.style.display = (filter === 'all' || card.classList.contains(filter)) ? 'block' : 'none';
    });
}

// --- GERİ SAYIM GÜNCELLEME ---
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

            let parts = [];
            if (months > 0) parts.push(`${months} Ay`);
            if (weeks % 4 > 0 && months < 3) parts.push(`${weeks % 4} Hafta`);
            if (days % 7 > 0 && weeks < 4) parts.push(`${days % 7} Gün`);
            if (hours % 24 > 0 && days < 7) parts.push(`${hours % 24} Saat`);
            if (mins % 60 > 0 && hours < 24) parts.push(`${mins % 60} Dakika`);
            if (secs % 60 > 0 && mins < 60) parts.push(`${secs % 60} Saniye`);

            timer.innerHTML = `KALAN: ` + (parts.length > 0 ? parts.slice(0, 2).join(' ') : "Başlıyor...");
        } else {
            timer.innerHTML = `<span style="color:#00e701; font-weight:bold;">CANLI VEYA TAMAMLANDI</span>`;
        }
    });
}

// --- VERİ ÇEKME ---
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

async function sonMaclariGetir(teamId, containerId) {
    const url = `https://api.pandascore.co/teams/${teamId}/matches?filter[status]=finished&per_page=5`;
    try {
        const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`);
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
    await loadData();
    
    try {
        const promises = PANDA_IDS.map(id => 
            fetch(`${PROXY_URL}?url=${encodeURIComponent(`https://api.pandascore.co/teams/${id}/matches?filter[status]=not_started`)}`).then(r => r.json())
        );

        const results = await Promise.all(promises);
        let allMatches = results.flat().filter(m => m && m.id);
        container.innerHTML = '';
        allMatches.sort((a, b) => new Date(a.begin_at) - new Date(b.begin_at));

        allMatches.forEach(match => {
            const isAcademy = match.opponents.some(o => o.opponent.id.toString() === ACADEMY_ID);
            const opponent = match.opponents.find(o => !PANDA_IDS.includes(o.opponent.id.toString()));
            const futSide = match.opponents.find(o => PANDA_IDS.includes(o.opponent.id.toString()));
            const rakipName = opponent ? opponent.opponent.name : "TBD";
            const gameType = match.videogame.slug.includes('valorant') ? 'valorant' : 'cs2';
            
            const card = document.createElement('div');
            card.className = `match-card ${gameType}`;
            card.onclick = () => card.classList.toggle('active');

            let futKey = isAcademy ? "fut academy" : "fut esports";
            let futPlayers = (EXTERNAL_DATA[gameType] && EXTERNAL_DATA[gameType][futKey]) 
                ? EXTERNAL_DATA[gameType][futKey].map(p => getPlayerHtml(p, gameType)).join('') : "<li>Yükleniyor...</li>";

            card.innerHTML = `
                <div class="card-header">
                    <span class="branch-badge">${isAcademy ? "VAL / VCL" : gameType.toUpperCase()}</span>
                    <span class="status"><span class="live-dot"></span>GELECEK</span>
                </div>
                <div class="team-wrapper">
                    <div class="team-container"><img src="${futSide?.opponent.image_url || ''}" class="team-logo"><div class="team">${isAcademy ? "ACADEMY" : "FUT"}</div></div>
                    <div class="vs">vs</div>
                    <div class="team-container"><div class="team">${rakipName}</div><img src="${opponent?.opponent.image_url || ''}" class="team-logo"></div>
                </div>
                <div class="countdown-timer" data-time="${match.begin_at}">...</div>
                <div class="match-details">
                    <div class="players-grid">
                        <div class="player-list"><strong>FUT</strong><ul>${futPlayers}</ul></div>
                        <div class="player-list"><strong>RAKİP</strong><ul><li>Bilgi yakında...</li></ul></div>
                    </div>
                </div>`;
            container.appendChild(card);
        });
    } catch (e) { container.innerHTML = "Maçlar yüklenemedi."; }
}

// --- EVENT LISTENERS (Hataları Bitiren Kısım) ---
document.addEventListener('DOMContentLoaded', () => {
    // Tema yükle
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Butonları bağla
    document.getElementById('theme-switch')?.addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(btn.getAttribute('data-type') === 'coming-soon') {
                alert(btn.getAttribute('data-name') + " yakında!");
            } else {
                filtrele(btn.getAttribute('data-filter'), btn);
            }
        });
    });

    // Başlat
    setInterval(updateCountdowns, 1000);
    sonMaclariGetir(VALO_ID, 'valo-form');
    sonMaclariGetir(CS2_ID, 'cs-form');
    tumMaclariGetir();
});