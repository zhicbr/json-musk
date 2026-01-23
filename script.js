// --- 敏感规则配置 ---
const SENSITIVE_KEYS = [
    'password', 'passwd', 'secret', 'token', 'key', 'auth', 'credential', // 认证/隐私类
    'confidential', 'sensitive', 'private', 'personal',                  // 隐私补充
    'phone', 'mobile', 'tel', 'cell',                                   // 电话类
    'email', 'mail',                                                    // 邮箱类
    'address', 'addr', 'location', 'district', 'city', 'province',      // 地址类
    'ssn', 'id', 'identity', 'license', 'no', 'number', 'code',         // 证件/编号类
    'passport', 'cvv', 'pin', 'iban',                                   // 证件/金融编号补充
    'name', 'fullname', 'user', 'nickname',                             // 姓名/用户类
    'credit', 'card', 'salary', 'income', 'bank', 'account',            // 财务类
    'amount', 'balance', 'price', 'money', 'pay',                       // 财务补充
    'social', 'security', 'dob', 'birth',                               // 社保/出生日期类
    'health', 'medical', 'diagnosis', 'prescription', 'patient'        // 健康医疗类
];

// 敏感数据正则模式

const SENSITIVE_REGEX = [
    /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/,                 // 手机号（国际通用格式）
    /\b1[3-9]\d{9}\b/,                                                  // 手机号（国内11位专用）
    /\d{3}[-]?\d{2}[-]?\d{4}/,                                          // 社会安全号(SSN)
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,                   // 邮箱（通用格式）
    /\b(?:\d[ -]*?){13,16}\b/,                                          // 信用卡号
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,                                  // 出生日期
    /\b(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\b/, // 修正的IPv4
    /(api[_-]?key|secret|token)[:=]\s*["']?[a-zA-Z0-9]{20,}["']?/i,    // 修复：将(?i)改为/i标志
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,                // JWT令牌
    /AKIA[0-9A-Z]{16}/,                                                 // AWS Access Key
    /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/,                 // 私钥
    /\b\d{15}|\d{18}|\d{17}X\b/i,                                       // 身份证号
    /\b\d{16,19}\b/                                                     // 银行卡号
];

let originalJsonObj = null;
let allNodes = []; // 存储所有节点
let showStructure = true; // 默认显示结构

// --- 示例数据 ---
function loadDemo() {
    const demo = {
        "userInfo": {
            "name": "张三",
            "age": 28,
            "idCard": "110101199003071234",
            "contact": { 
                "email": "zhangsan@example.com", 
                "mobile": "13812345678",
                "address": "北京市朝阳区科技园路88号"
            }
        },
        "account": {
            "balance": 99999.00,
            "creditCard": "6222021001112222333",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        },
        "publicInfo": {
            "status": "active",
            "role": "admin",
            "remark": "此字段不敏感"
        }
    };
    document.getElementById('inputJson').value = JSON.stringify(demo, null, 4);
    parseAndRender();
}

// --- 核心逻辑 ---

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
    renderTree(); 
}

function parseAndRender() {
    const input = document.getElementById('inputJson').value.trim();
    if (!input) { showToast('无内容', 'error'); return; }
    try {
        originalJsonObj = JSON.parse(input);
        allNodes = [];
        // 递归收集节点并进行智能识别
        traverse(originalJsonObj, '', 0, 'Root', false);
        renderTree();
        
        // 统计初始识别数量
        const autoSelected = allNodes.filter(n => n.type === 'leaf' && n.isChecked).length;
        if(autoSelected > 0) showToast(`智能识别并勾选了 ${autoSelected} 个敏感字段`);
        
    } catch (e) { console.error(e); showToast('解析失败: JSON 格式错误', 'error'); }
}

// 判断字段是否敏感
function checkSensitivity(key, value) {
    if(!key) return false;
    const k = String(key).toLowerCase();
    
    // 1. Key 规则匹配 (只要 Key 包含敏感词)
    if (SENSITIVE_KEYS.some(sk => k.includes(sk))) return true;

    // 2. Value 规则匹配 (正则)
    if (value && typeof value === 'string') {
        if (SENSITIVE_REGEX.some(rx => rx.test(value))) return true;
    }
    
    return false;
}

function traverse(obj, path, level, key, parentIsArray) {
    const isArray = Array.isArray(obj);
    const isObject = typeof obj === 'object' && obj !== null;

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
        // 叶子节点：在此处进行默认勾选判定
        const isSensitive = checkSensitivity(key, obj);
        allNodes.push({
            type: 'leaf',
            path: path,
            key: key,
            value: obj,
            level: level,
            isArrayItem: parentIsArray,
            isChecked: isSensitive // <--- 核心：状态存储在数据模型中
        });
        return;
    }

    if (isObject) {
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

function renderTree() {
    const container = document.getElementById('fieldList');
    const searchVal = document.getElementById('filterInput').value.toLowerCase();
    container.innerHTML = '';
    
    if (allNodes.length === 0) return;

    const visibleNodes = allNodes.filter(node => {
        if (!showStructure && node.type === 'structure') return false;
        if (searchVal) {
            if (node.type === 'structure') return false; 
            return String(node.key).toLowerCase().includes(searchVal) || 
                   String(node.value).toLowerCase().includes(searchVal);
        }
        return true;
    });

    const leafCount = visibleNodes.filter(n => n.type === 'leaf').length;
    const totalSelected = allNodes.filter(n => n.type === 'leaf' && n.isChecked).length;
    document.getElementById('countLabel').textContent = `显示: ${leafCount} | 已选: ${totalSelected}`;

    const fragment = document.createDocumentFragment();

    visibleNodes.forEach((node, idx) => {
        const row = document.createElement('div');
        row.className = node.type === 'structure' ? 'field-row is-structure' : 'field-row is-leaf';
        row.title = node.path;

        // 缩进线
        const guideContainer = document.createElement('div');
        guideContainer.className = 'indent-guide-container';
        if (!searchVal) {
            for (let i = 0; i < node.level; i++) {
                const guide = document.createElement('div');
                guide.className = 'indent-guide active';
                guide.style.setProperty('--guide-color', `var(--guide-c${i % 5})`);
                guideContainer.appendChild(guide);
            }
        }
        row.appendChild(guideContainer);

        const content = document.createElement('label');
        content.className = 'row-content';
        
        if (node.type === 'leaf') {
            content.htmlFor = `chk_node_${idx}`; // 使用唯一ID
            
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'field-checkbox';
            chk.id = `chk_node_${idx}`;
            chk.value = node.path;
            
            // 绑定状态：读取 Model
            chk.checked = node.isChecked;
            
            // 绑定事件：更新 Model
            chk.onchange = (e) => {
                node.isChecked = e.target.checked;
                // 更新计数 Label
                const total = allNodes.filter(n => n.type === 'leaf' && n.isChecked).length;
                const currentLeafs = document.querySelectorAll('.field-row.is-leaf').length; // 当前视图的leaf
                document.getElementById('countLabel').textContent = `显示: ${currentLeafs} | 已选: ${total}`;
            };
            
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
            // Modified: 移除字符串截断，以便配合 CSS 横向滚动查看完整内容
            // if(v.length > 40) v = v.substring(0,40)+'...';
            valSpan.textContent = v;
            content.appendChild(valSpan);

        } else {
            const keySpan = document.createElement('span');
            keySpan.style.color = '#64748b';
            keySpan.textContent = node.key;
            content.appendChild(keySpan);
            
            const mark = document.createElement('span');
            mark.className = 'json-type-mark';
            mark.textContent = node.structureType;
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

// 全选/全不选：只影响当前视图可见的节点
function toggleAll(checked) {
    const inputs = document.querySelectorAll('.field-checkbox');
    inputs.forEach(chk => {
        chk.checked = checked;
        // 同步更新 Model
        const path = chk.value;
        const node = allNodes.find(n => n.path === path);
        if(node) node.isChecked = checked;
    });
    
    // 更新计数
    const total = allNodes.filter(n => n.type === 'leaf' && n.isChecked).length;
    const currentLeafs = document.querySelectorAll('.field-row.is-leaf').length;
    document.getElementById('countLabel').textContent = `显示: ${currentLeafs} | 已选: ${total}`;
}

function processMasking() {
    if (!originalJsonObj) return;
    const processed = JSON.parse(JSON.stringify(originalJsonObj));
    
    // 核心修改：基于 Model (allNodes) 进行打码，而不是基于 DOM
    // 这样即使搜索过滤后（DOM中不存在），已勾选的字段依然会被处理
    const nodesToMask = allNodes.filter(n => n.type === 'leaf' && n.isChecked);
    
    let cnt = 0;
    nodesToMask.forEach(node => {
        const masked = maskStr(node.value);
        if(node.path === '') document.getElementById('outputJson').value = masked;
        else setVal(processed, node.path, masked);
        cnt++;
    });

    if(!(allNodes.length>0 && allNodes[0].path==='')) {
        document.getElementById('outputJson').value = JSON.stringify(processed, null, 4);
    }
    showToast(`成功脱敏 ${cnt} 个字段`);
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