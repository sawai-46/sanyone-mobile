// Data Definitions
const STORES = ['蒲郡', '東', '豊川', '高師', '魚町'];

// Default fixed values from Excel
const DATA = {
    sunday_small: {
        title: "日曜日出荷 小粒",
        is_calc_required: true,
        others_fixed: { '東': 70, '豊川': 90, '高師': 70, '魚町': 50 } // Sum = 280
    },
    sunday_fuku: {
        title: "日曜日出荷 フクユタカ",
        is_calc_required: false,
        fixed: { '蒲郡': 97, '東': 90, '豊川': 60, '高師': 80, '魚町': 50 }
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
    if (!qty || qty <= 0) return [];

    const boxes = [];
    let remaining = qty;

    // Logic:
    // 31-60: Purple (Max 60 per box?) - User said "31 to 60 is Purple"
    // 13-30: Pink
    // 1-12: One Touch

    // The user requirement is slightly ambiguous on how to split large numbers.
    // "31 to 60 is Purple, 13 to 30 is Pink..."
    // Usually this implies box capacity.
    // Let's assume we fill largest boxes first.

    // However, the user prompt says:
    // "31 to 60 is 'Purple', 13 to 30 is 'Pink', 1 to 12 is 'One Touch'"
    // This sounds like a mapping for a SINGLE box if the quantity falls in that range.
    // But what if quantity is 100?
    // Usually shipment packing fills standard boxes.
    // Let's assume standard max capacities: Purple=60, Pink=30, OneTouch=12.

    while (remaining > 0) {
        if (remaining >= 31) {
            // Use Purple
            // But wait, if we have 70? 60 (Purple) + 10 (OneTouch)?
            // Or is it just a label for the range?
            // "Box count and stickers... 31-60 is Purple..."
            // I will implement a greedy fill strategy with these capacities.
            // Purple capacity: 60
            // Pink capacity: 30
            // OneTouch capacity: 12

            // Actually, let's look at the ranges again.
            // If I have 40 -> 1 Purple.
            // If I have 20 -> 1 Pink.
            // If I have 10 -> 1 OneTouch.

            // What if I have 90? (Gamagori base)
            // 60 (Purple) + 30 (Pink)?

            // Let's try to fill with Purple (60) first.
            if (remaining > 30) {
                boxes.push({ type: '紫', color: 'box-purple', count: 1 });
                remaining -= 60; // Assume full box is up to 60
            } else if (remaining > 12) {
                boxes.push({ type: 'ピンク', color: 'box-pink', count: 1 });
                remaining -= 30;
            } else {
                boxes.push({ type: 'ワンタッチ', color: 'box-onetouch', count: 1 });
                remaining -= 12;
            }
        } else if (remaining >= 13) {
            boxes.push({ type: 'ピンク', color: 'box-pink', count: 1 });
            remaining -= 30;
        } else {
            boxes.push({ type: 'ワンタッチ', color: 'box-onetouch', count: 1 });
            remaining -= 12;
        }

        // Safety break for negative remaining (logic above subtracts capacity)
        if (remaining < 0) remaining = 0;
    }

    // Consolidate identical boxes
    const consolidated = [];
    boxes.forEach(b => {
        const existing = consolidated.find(c => c.type === b.type);
        if (existing) existing.count++;
        else consolidated.push({ ...b });
    });

    return consolidated;
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
        boxInfo.forEach(b => {
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

        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.onclick = function () {
            this.classList.toggle('checked');
            checkMissionClear();
        };

        item.innerHTML = `
            <div class="checkbox"></div>
            <div>${store}: 最終確認 (箱数・個数)</div>
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
