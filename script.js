// Data Definitions
const STORES = ['蒲郡', '東', '豊川', '高師', '魚町'];

// Default fixed values from Excel
const DATA = {
    sunday_small: {
        title: "日曜日出荷 小粒",
        is_calc_required: true,
        others_fixed: { '東': 70, '豊川': 90, '高師': 70, '魚町': 20 } // Sum = 250
    },
    sunday_fuku: {
        title: "日曜日出荷 フクユタカ",
        is_calc_required: false,
        fixed: { '蒲郡': 126, '東': 80, '豊川': 100, '高師': 60, '魚町': 20 }
    },
    weekday_small: {
        title: "平日出荷 小粒",
        is_calc_required: false,
        fixed: { '蒲郡': 139, '東': 60, '豊川': 90, '高師': 60, '魚町': 40 }
    },
    weekday_fuku: {
        title: "平日出荷 フクユタカ",
        is_calc_required: false,
        fixed: { '蒲郡': 97, '東': 90, '豊川': 60, '高師': 80, '魚町': 50 }
    }
};

let currentMode = null;
let currentQuantities = {};

function selectMode(mode) {
    currentMode = mode;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('current-mode-title').innerText = DATA[mode].title;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const totalInput = document.getElementById('total-input-section');
    if (DATA[mode].is_calc_required) {
        totalInput.classList.remove('hidden');
        document.getElementById('total-qty').value = '';
        document.getElementById('total-qty').focus();
        currentQuantities = {};
        renderStores(); // Render empty or with 0
    } else {
        totalInput.classList.add('hidden');
        currentQuantities = { ...DATA[mode].fixed };
        renderStores();
    }

    // Reset checklist
    renderChecklist();
}

function showMenu() {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('mission-clear').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function calculate() {
    if (!currentMode || !DATA[currentMode].is_calc_required) return;

    const totalStr = document.getElementById('total-qty').value;
    const total = parseInt(totalStr);

    if (isNaN(total)) {
        currentQuantities = {};
        renderStores();
        return;
    }

    const others = DATA[currentMode].others_fixed;
    let othersSum = 0;
    for (let key in others) {
        othersSum += others[key];
    }

    const gamagoriQty = total - othersSum;

    currentQuantities = {
        '蒲郡': gamagoriQty,
        ...others
    };

    renderStores();
}

function getBoxInfo(qty) {
    if (!qty || qty <= 0) return { consolidated: [], details: [] };

    const boxes = [];
    let remaining = qty;

    while (remaining > 0) {
        if (remaining >= 31) {
            if (remaining > 30) {
                const amount = Math.min(remaining, 60);
                boxes.push({ type: '紫', color: 'box-purple', amount: amount });
                remaining -= amount;
            } else if (remaining > 12) {
                const amount = Math.min(remaining, 30);
                boxes.push({ type: 'ピンク', color: 'box-pink', amount: amount });
                remaining -= amount;
            } else {
                const amount = Math.min(remaining, 12);
                boxes.push({ type: 'ワンタッチ', color: 'box-onetouch', amount: amount });
                remaining -= amount;
            }
        } else if (remaining >= 13) {
            const amount = Math.min(remaining, 30);
            boxes.push({ type: 'ピンク', color: 'box-pink', amount: amount });
            remaining -= amount;
        } else {
            const amount = Math.min(remaining, 12);
            boxes.push({ type: 'ワンタッチ', color: 'box-onetouch', amount: amount });
            remaining -= amount;
        }

        if (remaining < 0) remaining = 0;
    }

    // Consolidate identical boxes for display
    const consolidated = [];
    boxes.forEach(b => {
        const existing = consolidated.find(c => c.type === b.type);
        if (existing) existing.count++;
        else consolidated.push({ type: b.type, color: b.color, count: 1 });
    });

    return { consolidated: consolidated, details: boxes };
}

function renderStores() {
    const container = document.getElementById('store-list');
    container.innerHTML = '';

    STORES.forEach(store => {
        const qty = currentQuantities[store];
        if (qty === undefined) return;

        const card = document.createElement('div');
        card.className = 'store-card';

        let qtyDisplay = `${qty}個`;
        if (store === '蒲郡' && currentMode === 'sunday_small') {
            const base = 90;
            const alpha = qty - base;
            if (alpha >= 0) {
                qtyDisplay += ` <span class="gamagori-breakdown">(90 + ${alpha})</span>`;
            } else {
                qtyDisplay += ` <span class="gamagori-breakdown">(不足: ${alpha})</span>`;
            }
        }

        const boxInfo = getBoxInfo(qty);
        let boxHtml = '';
        let totalBoxes = 0;
        boxInfo.consolidated.forEach(b => {
            boxHtml += `<div class="box-badge ${b.color}">${b.type} x${b.count}</div>`;
            totalBoxes += b.count;
        });

        // Calculate Stickers
        // Each box needs: 3 Store Name stickers, 1 Product Name sticker
        const storeStickers = totalBoxes * 3;
        const productStickers = totalBoxes * 1;

        card.innerHTML = `
            <div class="store-header">
                <span class="store-name">${store}</span>
                <span class="store-qty">${qtyDisplay}</span>
            </div>
            <div class="box-section">
                <div class="box-info-container">
                    ${boxHtml}
                </div>
                <div class="sticker-info">
                    <span class="sticker-badge store-sticker">店名シール: ${storeStickers}枚</span>
                    <span class="sticker-badge product-sticker">品名シール: ${productStickers}枚</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    renderChecklist();
}

function renderChecklist() {
    const container = document.getElementById('checklist');
    container.innerHTML = '';

    if (Object.keys(currentQuantities).length === 0) return;

    STORES.forEach(store => {
        if (currentQuantities[store] === undefined) return;

        const qty = currentQuantities[store];
        const boxInfo = getBoxInfo(qty);
        const totalBoxes = boxInfo.details.length;
        const breakdown = boxInfo.details.map(b => b.amount).join('+');

        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.onclick = function () {
            this.classList.toggle('checked');
            checkMissionClear();
        };

        item.innerHTML = `
            <div class="checkbox"></div>
            <div>${store}: ${totalBoxes}箱 ${breakdown}</div>
        `;
        container.appendChild(item);
    });
}

function checkMissionClear() {
    const items = document.querySelectorAll('.checklist-item');
    const checked = document.querySelectorAll('.checklist-item.checked');

    if (items.length > 0 && items.length === checked.length) {
        document.getElementById('mission-clear').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('mission-clear').onclick = function () {
                this.classList.add('hidden');
            }
        }, 1000);
    }
}
