let lastGenerated = []; // 저장을 위한 최근 생성 번호 보관

const DB = RAW_DATA.trim().split('\n').filter(l => l.trim() !== "").map(line => {
    const cols = line.trim().split(/\s+/);
    return { round: cols[0], nums: cols.slice(1, 7).map(Number) };
});

let aiWeights = new Array(46).fill(1);
let pairMatrix = Array.from(Array(46), () => new Array(46).fill(0));

function trainAI() {
    if(DB.length < 1) return;
    DB.forEach((row) => {
        row.nums.forEach(n => aiWeights[n] += 2);
        for(let i=0; i<row.nums.length; i++) {
            for(let j=i+1; j<row.nums.length; j++) {
                pairMatrix[row.nums[i]][row.nums[j]] += 1;
                pairMatrix[row.nums[j]][row.nums[i]] += 1;
            }
        }
    });
    const statusEl = document.getElementById('ai-status');
    if (statusEl) {
        statusEl.innerText = `신경망 학습 완료: ${DB.length}개 유닛`;
    }
}

function generate(count) {
    if(DB.length === 0) return;
    const displayGroup = document.getElementById('ball-display-group');
    const resultList = document.getElementById('result-list');
    displayGroup.innerHTML = '';
    resultList.innerHTML = '';
    lastGenerated = [];

    for(let i=0; i<count; i++) {
        let pick = generateSingleAI();
        lastGenerated.push(pick);
        renderMainBalls(pick);
        analyzeHistory(pick, i+1, count);
    }

    const now = new Date();
    const timeStr = now.toLocaleString();
    const stamp = document.getElementById('draw-info-stamp');
    if (stamp) {
        stamp.innerText = `${timeStr} | ${getDeviceInfo()}`;
    }
}

function generateSingleAI() {
    let pick = [];
    let tempWeights = [...aiWeights];
    let first = weightedRandom(tempWeights);
    pick.push(first);
    while(pick.length < 6) {
        let dynamicWeights = [...tempWeights];
        pick.forEach(p => { for(let i=1; i<=45; i++) { dynamicWeights[i] += pairMatrix[p][i] * 3; } });
        let next = weightedRandom(dynamicWeights, pick);
        if(!pick.includes(next)) pick.push(next);
    }
    return pick.sort((a,b) => a-b);
}

function weightedRandom(weights, exclude = []) {
    let totalWeight = 0;
    for(let i=1; i<=45; i++) { if(!exclude.includes(i)) totalWeight += weights[i]; }
    let rnd = Math.random() * totalWeight;
    for(let i=1; i<=45; i++) {
        if(exclude.includes(i)) continue;
        rnd -= weights[i];
        if(rnd <= 0) return i;
    }
    return Math.floor(Math.random() * 45) + 1;
}

function renderMainBalls(pick) {
    const container = document.getElementById('ball-display-group');
    const div = document.createElement('div');
    div.className = 'ball-display';
    pick.forEach(n => {
        div.innerHTML += `<div class="ball" style="background:${getLottoColor(n)}">${n}</div>`;
    });
    container.appendChild(div);
}

function analyzeHistory(pick, setIndex, totalCount) {
    const list = document.getElementById('result-list');
    let matchesFound = [];
    DB.forEach(row => {
        const intersection = row.nums.filter(n => pick.includes(n));
        const count = intersection.length;
        if (count >= 3) {
            matchesFound.push({ round: row.round, nums: row.nums, count: count, rank: count === 6 ? 1 : count === 5 ? 3 : count === 4 ? 4 : 5 });
        }
    });
    matchesFound.sort((a, b) => a.rank - b.rank);

    if (totalCount > 1) {
        const divider = document.createElement('div');
        divider.className = 'group-divider';
        divider.innerHTML = `<span>세트 #${setIndex} 분석 내역</span><span>${matchesFound.length}건 발견</span>`;
        list.appendChild(divider);
    }

    if (matchesFound.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'empty-msg';
        msg.innerText = "분석 결과 유니크한 패턴입니다.";
        list.appendChild(msg);
    } else {
        matchesFound.forEach(res => {
            const badgeClass = res.rank === 1 ? 'rank-1' : res.rank === 3 ? 'rank-3' : 'rank-4';
            let ballsHtml = res.nums.map(n => {
                const isMatch = pick.includes(n);
                const color = isMatch ? getLottoColor(n) : 'var(--border)'; // Use var(--border) for unmatched
                // For direct style attribute, we need hex or rgb if not handled by CSS class.
                // But wait, 'var(--border)' works in style attribute in modern browsers.
                // However, previous code used hex. Let's stick to hex if possible or simple colors.
                // Actually, let's use a class or transparent.
                // The previous code used '#f2f2f7'.
                // Let's use a dynamic color based on theme? 
                // Better: keep inline style for color but use CSS var for bg.
                // Reverting to CSS class logic would be better but I'm in JS.
                // Let's just use empty background for unmatched or a standard gray.
                return `<div class="mini-ball ${isMatch?'highlight':''}" style="background-color:${color}; color:${isMatch?'#fff':''}">${n}</div>`;
            }).join('');
            const row = document.createElement('div');
            row.className = 'match-row';
            row.innerHTML = `<div class="info-side"><div class="round-info">${res.round} 회차</div><div class="mini-balls">${ballsHtml}</div></div><span class="rank-badge ${badgeClass}">${res.rank}등</span>`;
            list.appendChild(row);
        });
    }
}

function getLottoColor(n) {
    if (n <= 10) return '#FFCC00'; // Apple Yellow
    if (n <= 20) return '#007AFF'; // Apple Blue
    if (n <= 30) return '#FF3B30'; // Apple Red
    if (n <= 40) return '#8E8E93'; // Apple Gray
    return '#34C759';              // Apple Green
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "ANDROID NODE";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS NODE";
    return "TERMINAL";
}

// 파일 저장 기능
function saveToFile() {
    if(lastGenerated.length === 0) { alert("번호를 먼저 생성해주세요."); return; }
    
    let content = "--- AI NEURAL LOTTO 추첨 리포트 ---\\n";
    content += "추첨일시: " + new Date().toLocaleString() + "\\n";
    content += "접속기종: " + getDeviceInfo() + "\\n\\n";
    
    lastGenerated.forEach((nums, i) => {
        content += `[조합 #${i+1}] : ${nums.join(', ')}\\n`;
    });
    
    content += "\\n--- 분석 완료 ---";

    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Lotto_Analysis_${new Date().getTime()}.txt`;
    a.click();
}

// Theme Handling
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const toggleBtn = document.getElementById('theme-toggle');
    
    let theme = 'light';
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        theme = 'dark';
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    if(toggleBtn) toggleBtn.innerText = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    const toggleBtn = document.getElementById('theme-toggle');
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    if(toggleBtn) toggleBtn.innerText = newTheme === 'dark' ? '☀️' : '🌙';
}

window.onload = function() {
    initTheme();
    trainAI();
};
