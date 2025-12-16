let originalJsonObj = null;
let allNodes = []; // 存储所有节点（包括结构节点和叶子节点）
let showStructure = true; // 默认显示结构

function loadDemo() {
    const demo = {
        "userInfo": {
            "basic": { "name": "Alice", "age": 25 },
            "contact": { "email": "alice@test.com", "phone": "13800000000" }
        },
        "orders": [
            { "id": "1001", "items": [{"name": "Book", "price": 99}] }
        ]
    };
    document.getElementById('inputJson').value = JSON.stringify(demo, null, 4);
    parseAndRender();
}

function formatInput() {
    try {
        const v = document.getElementById('inputJson').value;
        if(v) document.getElementById('inputJson').value = JSON.stringify(JSON.parse(v), null, 4);
    } catch(e) { showToast('格式错误', 'error'); }
}

function resetAll() {
    document.getElementById('inputJson').value = '';
    document.getElementById('outputJson').value = '';
    document.getElementById('fieldList').innerHTML = '<div class="empty-state">等待解析...</div>';
    document.getElementById('countLabel').textContent = '';
    originalJsonObj = null;
    allNodes = [];
}

function toggleStructureMode() {
    showStructure = !showStructure;
    const btn = document.getElementById('structureBtn');
    if(showStructure) {
        btn.classList.add('active');
        btn.innerHTML = '🙈 隐藏结构';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '👁️ 显示结构';
    }
    renderTree(); // 重新渲染
}

function parseAndRender() {
    const input = document.getElementById('inputJson').value.trim();
    if (!input) { showToast('无内容', 'error'); return; }
    try {
        originalJsonObj = JSON.parse(input);
        allNodes = [];
        // 递归收集所有节点
        traverse(originalJsonObj, '', 0, 'Root', false);
        renderTree();
    } catch (e) { showToast('解析失败', 'error'); }
}

// 递归函数：收集所有节点类型
function traverse(obj, path, level, key, parentIsArray) {
    const isArray = Array.isArray(obj);
    const isObject = typeof obj === 'object' && obj !== null;

    // 1. 如果是对象或数组（非根节点），添加“结构节点”
    if ((isObject || isArray) && path !== '') {
        allNodes.push({
            type: 'structure',
            path: path,
            key: key,
            level: level,
            isArrayItem: parentIsArray,
            structureType: isArray ? '[]' : '{}'
        });
    } else if (!isObject && !isArray) {
        // 2. 如果是值（叶子节点），添加“数据节点”
        allNodes.push({
            type: 'leaf',
            path: path,
            key: key,
            value: obj,
            level: level,
            isArrayItem: parentIsArray
        });
        return; // 叶子节点没有子级，直接返回
    }

    // 递归子级
    if (isObject) {
        // 如果当前是结构节点，子级 level + 1。
        // 注意：Root节点本身不占一行结构行，所以Root的子级level从0开始
        const nextLevel = (path === '') ? 0 : level + 1;

        if (isArray) {
            obj.forEach((item, idx) => {
                const nextPath = path ? `${path}[${idx}]` : `[${idx}]`;
                traverse(item, nextPath, nextLevel, `[${idx}]`, true);
            });
        } else {
            for (const k in obj) {
                const nextPath = path ? `${path}.${k}` : k;
                traverse(obj[k], nextPath, nextLevel, k, false);
            }
        }
    }
}

// 渲染列表
function renderTree() {
    const container = document.getElementById('fieldList');
    const searchVal = document.getElementById('filterInput').value.toLowerCase();
    container.innerHTML = '';
    
    if (allNodes.length === 0) return;

    // 过滤逻辑
    const visibleNodes = allNodes.filter(node => {
        // 1. 结构开关过滤
        if (!showStructure && node.type === 'structure') return false;
        
        // 2. 搜索过滤 (简单实现：如果搜索有值，只显示匹配的叶子节点，结构暂时隐藏避免混乱)
        if (searchVal) {
            if (node.type === 'structure') return false; // 搜索模式下只看值
            return String(node.key).toLowerCase().includes(searchVal) || 
                   String(node.value).toLowerCase().includes(searchVal);
        }
        return true;
    });

    // 统计叶子节点数量
    const leafCount = visibleNodes.filter(n => n.type === 'leaf').length;
    document.getElementById('countLabel').textContent = `可选字段: ${leafCount}`;

    const fragment = document.createDocumentFragment();

    visibleNodes.forEach((node, idx) => {
        const row = document.createElement('div');
        // 区分样式类
        row.className = node.type === 'structure' ? 'field-row is-structure' : 'field-row is-leaf';
        row.title = node.path;

        // A. 缩进参考线 (Rainbow)
        const guideContainer = document.createElement('div');
        guideContainer.className = 'indent-guide-container';
        // 搜索模式下不显示缩进，因为结构被打散了
        if (!searchVal) {
            for (let i = 0; i < node.level; i++) {
                const guide = document.createElement('div');
                guide.className = 'indent-guide active';
                guide.style.setProperty('--guide-color', `var(--guide-c${i % 5})`);
                guideContainer.appendChild(guide);
            }
        }
        row.appendChild(guideContainer);

        // B. 内容
        const content = document.createElement('label');
        content.className = 'row-content';
        
        if (node.type === 'leaf') {
            // --- 数据节点 ---
            content.htmlFor = `chk_${idx}`; // 点击行触发checkbox
            
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'field-checkbox';
            chk.id = `chk_${idx}`;
            chk.value = node.path;
            chk.checked = true;
            content.appendChild(chk);

            const keySpan = document.createElement('span');
            keySpan.className = node.isArrayItem ? 'json-idx' : 'json-key';
            keySpan.textContent = node.key;
            content.appendChild(keySpan);

            const sep = document.createElement('span');
            sep.textContent = ': ';
            sep.style.color = '#94a3b8';
            sep.style.marginRight = '4px';
            content.appendChild(sep);

            const valSpan = document.createElement('span');
            valSpan.className = 'json-val';
            let v = String(node.value);
            if(v.length > 40) v = v.substring(0,40)+'...';
            valSpan.textContent = v;
            content.appendChild(valSpan);

        } else {
            // --- 结构节点 ---
            // 结构节点没有Checkbox，只是标签
            
            // 简单的类型图标
            const icon = document.createElement('span');
            icon.className = 'structure-icon';
            // icon.textContent = node.structureType === '[]' ? '[ ]' : '{ }';
            // content.appendChild(icon);

            const keySpan = document.createElement('span');
            keySpan.style.color = '#64748b';
            keySpan.textContent = node.key;
            content.appendChild(keySpan);
            
            const mark = document.createElement('span');
            mark.className = 'json-type-mark';
            mark.textContent = node.structureType; // 显示 {} 或 []
            content.appendChild(mark);
        }

        row.appendChild(content);
        fragment.appendChild(row);
    });
    
    if(visibleNodes.length === 0) {
        container.innerHTML = '<div class="empty-state">未找到匹配字段</div>';
    } else {
        container.appendChild(fragment);
    }
}

function toggleAll(checked) {
    const inputs = document.querySelectorAll('.field-checkbox');
    inputs.forEach(i => i.checked = checked);
}

function processMasking() {
    if (!originalJsonObj) return;
    const processed = JSON.parse(JSON.stringify(originalJsonObj));
    const checked = document.querySelectorAll('.field-checkbox:checked');
    let cnt = 0;
    
    // 构建一个 Map 方便查找 path 对应的 value
    // (allNodes 里包含了 value，可以直接用)
    checked.forEach(chk => {
        const p = chk.value;
        const node = allNodes.find(n => n.type === 'leaf' && n.path === p);
        if(node) {
            const masked = maskStr(node.value);
            if(p === '') document.getElementById('outputJson').value = masked;
            else setVal(processed, p, masked);
            cnt++;
        }
    });

    if(!(allNodes.length>0 && allNodes[0].path==='')) {
        document.getElementById('outputJson').value = JSON.stringify(processed, null, 4);
    }
    showToast(`已打码 ${cnt} 个字段`);
}

function maskStr(v) {
    if(v==null) return v;
    let s = String(v);
    let len = s.length;
    if(len<=1) return s;
    if(len==2) return s[0]+'*';
    if(len>8) return s.substring(0,2) + '****' + s.substring(len-2);
    return s[0] + '*'.repeat(len-2) + s[len-1];
}

function setVal(obj, path, val) {
    const parts = path.split(/[\.\[\]]/).filter(x=>x);
    let cur = obj;
    for(let i=0; i<parts.length-1; i++) {
        let k = isNaN(parts[i]) ? parts[i] : Number(parts[i]);
        cur = cur[k];
    }
    let last = parts[parts.length-1];
    if(!isNaN(last)) last = Number(last);
    cur[last] = val;
}

function copyResult() {
    const t = document.getElementById('outputJson');
    if(t.value) { t.select(); document.execCommand('copy'); showToast('已复制'); }
}
function showToast(m,t) {
    const d=document.getElementById('toast'); d.textContent=m;
    d.style.background=t=='error'?'#ef4444':'#1e293b';
    d.classList.add('show'); setTimeout(()=>d.classList.remove('show'),2000);
}
