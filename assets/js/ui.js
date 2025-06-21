// 主题切换功能
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // 检查本地存储中的主题设置
    const currentTheme = localStorage.getItem('theme');

    // 应用保存的主题或系统主题
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
    } else if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-moon';
    } else if (prefersDarkScheme.matches) {
        // 如果没有保存的主题但系统偏好暗色模式
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        // 默认使用亮色主题
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }

    // 切换主题
    themeToggle.addEventListener('click', function() {
        let theme;
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            theme = 'light';
            themeIcon.className = 'fas fa-moon';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            theme = 'dark';
            themeIcon.className = 'fas fa-sun';
        }

        // 保存主题设置到本地存储
        localStorage.setItem('theme', theme);
    });
}

function initializeDatePickers() {
    flatpickr("#expiryDate", {
        dateFormat: "Y-m-d",
        locale: "zh",
        placeholder: "选择到期日期",
        minDate: "today",
        onChange: function(_selectedDates, dateStr) {
            const transactionPicker = document.getElementById('transactionDate')._flatpickr;
            transactionPicker.set('maxDate', dateStr);
            validateDates();
        }
    });

    flatpickr("#transactionDate", {
        dateFormat: "Y-m-d",
        locale: "zh",
        placeholder: "选择交易日期",
        onChange: validateDates
    });
}

function validateDates() {
    const expiryDateInput = document.getElementById('expiryDate').value;
    const transactionDateInput = document.getElementById('transactionDate').value;
    
    if (!expiryDateInput || !transactionDateInput) return;

    const expiryDate = new Date(expiryDateInput);
    const transactionDate = new Date(transactionDateInput);
    const today = new Date();

    // 设置所有时间为当天的开始（00:00:00）
    expiryDate.setHours(0, 0, 0, 0);
    transactionDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (expiryDate <= today) {
        showNotification('到期日期必须晚于今天', 'error');
        document.getElementById('expiryDate').value = '';
        return;
    }

    if (transactionDate > expiryDate) {
        showNotification('交易日期不能晚于到期日期', 'error');
        setDefaultTransactionDate();
        return;
    }

    if (expiryDate.getTime() === transactionDate.getTime()) {
        showNotification('交易日期不能等于到期日期', 'error');
        setDefaultTransactionDate();
        return;
    }

    updateRemainingDays();
}

function updateRemainingDays() {
    const expiryDate = document.getElementById('expiryDate').value;
    const transactionDate = document.getElementById('transactionDate').value;

    if (expiryDate && transactionDate) {
        const remainingDays = calculateRemainingDays(expiryDate, transactionDate);
        
        // 检查是否存在remainingDays元素
        const remainingDaysElement = document.getElementById('remainingDays');
        if (remainingDaysElement) {
            remainingDaysElement.textContent = remainingDays;
            
            if (remainingDays === 0) {
                showNotification('剩余天数为0，请检查日期设置', 'warning');
            }
        }
    }
}

function setDefaultTransactionDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;
    document.getElementById('transactionDate').value = defaultDate;
    if (document.getElementById('transactionDate')._flatpickr) {
        document.getElementById('transactionDate')._flatpickr.setDate(defaultDate);
    }
}

function updateResults(result, data) {
    document.getElementById('resultDate').innerText = data.transactionDate;
    document.getElementById('resultForeignRate').innerText = data.customRate.toFixed(3);
    
    // 计算年化价格
    const price = parseFloat(data.price);
    const cycleText = getCycleText(data.cycle);
    document.getElementById('resultPrice').innerText = `${price.toFixed(2)} 人民币/${cycleText}`;
    
    document.getElementById('resultDays').innerText = data.time;
    document.getElementById('resultExpiry').innerText = data.expiryDate;
    
    const resultValueElement = document.getElementById('resultValue');
    let copyIcon = document.createElement('i');
    copyIcon.className = 'fas fa-copy copy-icon';
    copyIcon.title = '复制到剪贴板';

    resultValueElement.innerHTML = '';
    resultValueElement.appendChild(document.createTextNode(`${result.remainingValue} 元 `));
    resultValueElement.appendChild(copyIcon);
    
    if (parseFloat(result.remainingValue) >= 1000) {
        resultValueElement.classList.add('high-value-result');
    } else {
        resultValueElement.classList.remove('high-value-result');
    }
    
    resultValueElement.style.cursor = 'pointer';
    
    resultValueElement.addEventListener('click', function() {
        copyToClipboard(result.remainingValue);
    });
    
    copyIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        copyToClipboard(result.remainingValue);
    });

    document.getElementById('calcResult').scrollIntoView({ behavior: 'smooth' });
}

function copyToClipboard(text) {
    // 使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('已复制到剪贴板！', 'success');
        }).catch(() => {
            // 回退到传统方法
            fallbackCopyToClipboard(text);
        });
    } else {
        // 回退到传统方法
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);

    textarea.select();
    try {
        document.execCommand('copy');
        showNotification('已复制到剪贴板！', 'success');
    } catch (err) {
        showNotification('复制失败，请手动复制', 'error');
    }

    document.body.removeChild(textarea);
}

function showNotification(message, type) {
    const notifications = document.getElementById('notifications') || createNotificationsContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    if (notifications.firstChild) {
        notifications.insertBefore(notification, notifications.firstChild);
    } else {
        notifications.appendChild(notification);
    }

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        
        setTimeout(() => {
            notification.remove();
            
            if (notifications.children.length === 0) {
                notifications.remove();
            }
        }, 300);
    }, 3000);
}

function createNotificationsContainer() {
    const container = document.createElement('div');
    container.id = 'notifications';
    document.body.appendChild(container);
    return container;
}

/**
 * 初始化设置界面
 */
function initSettings() { 
    const savedSettings = localStorage.getItem('imgHostSettings');
        
    if (savedSettings) {
        // 不是第一次启动，加载保存的设置
        const parsedSettings = JSON.parse(savedSettings);
                
        imgHost.type = parsedSettings.type || imgHost.type;
        imgHost.url = parsedSettings.url || imgHost.url;
        imgHost.token = parsedSettings.token || imgHost.token;
        imgHost.copyFormat = parsedSettings.copyFormat || imgHost.copyFormat;
                
        document.getElementById('imgHostType').value = imgHost.type;
        document.getElementById('imgHostUrl').value = imgHost.url;
        document.getElementById('imgHostToken').value = imgHost.token || '';

        if (imgHost.copyFormat === 'markdown') {
            document.getElementById('copyFormatMarkdown').checked = true;
        } else {
            document.getElementById('copyFormatUrl').checked = true;
        }
        
    } else {

        // 也可以在这里设置默认值到UI
        document.getElementById('imgHostType').value = imgHost.type;
        document.getElementById('imgHostUrl').value = imgHost.url;
        document.getElementById('imgHostToken').value = '';
        
        if (imgHost.copyFormat === 'markdown') {
            document.getElementById('copyFormatMarkdown').checked = true;
        } else {
            document.getElementById('copyFormatUrl').checked = true;
        }
    }
}

/**
 * 打开设置侧边栏
 */
function openSettingsSidebar() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.add('active');
    overlay.classList.add('active');

    // 防止背景滚动
    document.body.style.overflow = 'hidden';
}

/**
 * 关闭设置侧边栏
 */
function closeSettingsSidebar() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.remove('active');
    overlay.classList.remove('active');

    // 恢复背景滚动
    document.body.style.overflow = '';
}

/**
 * 保存设置 - 适配Material Web组件
 */
function saveSettings() {
    const type = document.getElementById('imgHostType').value;
    const url = document.getElementById('imgHostUrl').value;
    const token = document.getElementById('imgHostToken').value;

    // 获取选中的复制格式 - 适配Material Web md-radio组件
    let copyFormat = 'markdown';
    const markdownRadio = document.getElementById('copyFormatMarkdown');
    const urlRadio = document.getElementById('copyFormatUrl');

    if (markdownRadio && markdownRadio.checked) {
        copyFormat = 'markdown';
    } else if (urlRadio && urlRadio.checked) {
        copyFormat = 'url';
    }
    
    if (!url) {
        showNotification('图床地址不能为空', 'error');
        return;
    }
    
    // 确保URL格式正确
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showNotification('图床地址必须包含 http:// 或 https://', 'error');
        return;
    }
    
    // 更新imgHost对象 - 使用对象属性更新而不是重新赋值
    imgHost.type = type;
    imgHost.url = url;
    imgHost.token = token;
    imgHost.copyFormat = copyFormat;

    try {
        localStorage.setItem('imgHostSettings', JSON.stringify(imgHost));
        showNotification('设置已保存', 'success');
        closeSettingsSidebar();
    } catch (error) {
        showNotification('设置保存失败，可能是浏览器限制', 'error');
    }
}


function resetSettings() {
    if (confirm('确定要恢复默认设置吗？')) {
        // 使用对象属性更新
        imgHost.type = "LskyPro";
        imgHost.url = "https://image.dooo.ng";
        imgHost.token = "";
        imgHost.copyFormat = "markdown";
        
        // 更新表单值
        document.getElementById('imgHostType').value = imgHost.type;
        document.getElementById('imgHostUrl').value = imgHost.url;
        document.getElementById('imgHostToken').value = imgHost.token;
        document.getElementById('copyFormatMarkdown').checked = true;
        
        // 保存到本地存储
        try {
            localStorage.setItem('imgHostSettings', JSON.stringify(imgHost));
            showNotification('已恢复默认设置', 'success');
        } catch (error) {
            showNotification('设置重置失败，可能是浏览器限制', 'error');
        }
    }
}


function togglePasswordVisibility() {
    const passwordInput = document.getElementById('imgHostToken');
    const toggleBtn = document.querySelector('.toggle-password i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}


function triggerConfetti() {
    confetti({
        particleCount: 15,
        angle: 60,
        spread: 40,
        origin: { x: 0 },
        colors: ['#FFD700'],
        zIndex: 2000
    });
    
    confetti({
        particleCount: 15,
        angle: 120,
        spread: 40,
        origin: { x: 1 },
        colors: ['#FFD700'],
        zIndex: 2000
    });  
}

function getCycleText(cycle) {
    switch(parseInt(cycle)) {
        case 1: return '月';
        case 3: return '季度';
        case 6: return '半年';
        case 12: return '年';
        case 24: return '两年';
        case 36: return '三年';
        case 48: return '四年';
        case 60: return '五年';
        default: return '未知周期';
    }
}

function getCycleFullText(cycle) {
    switch(parseInt(cycle)) {
        case 1: return '1个月';
        case 3: return '3个月';
        case 6: return '6个月';
        case 12: return '12个月';
        case 24: return '24个月';
        case 36: return '36个月';
        case 48: return '48个月';
        case 60: return '60个月';
        default: return '未知周期';
    }
}