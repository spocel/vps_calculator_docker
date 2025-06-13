
(function() {
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion !== APP_VERSION) {
        console.log('检测到新版本，清除缓存...');
        const theme = localStorage.getItem('theme');
        const imgHostSettings = localStorage.getItem('imgHostSettings');
        localStorage.clear();
        if (theme) localStorage.setItem('theme', theme);
        if (imgHostSettings) localStorage.setItem('imgHostSettings', imgHostSettings);
        localStorage.setItem('app_version', APP_VERSION);
    }
})();

const imgHost = {
    type: "LskyPro", // 图床类型, 仅支持 LskyPro / EasyImages
    url: "https://image.dooo.ng", // 图床地址, 带上协议头
    token: "", // LskyPro 可为空则使用游客上传, 在 /user/tokens 生成
    copyFormat: "markdown" // 默认为URL格式
};

document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题
    initTheme();
    
    // 初始化日期选择器
    flatpickr.localize(flatpickr.l10ns.zh);
    initializeDatePickers();
    
    // 初始化其他功能
    fetchExchangeRate();
    setDefaultTransactionDate();
    
    // 添加事件监听器 - 适配Material Web组件
    document.getElementById('currency').addEventListener('change', fetchExchangeRate);
    document.getElementById('calculateBtn').addEventListener('click', calculateAndSend);
    document.getElementById('screenshotBtn').addEventListener('click', captureAndUpload);

    // 等待Material Web组件加载完成后添加事件监听器
    setTimeout(() => {
        const currencySelect = document.getElementById('currency');
        if (currencySelect && currencySelect.addEventListener) {
            currencySelect.addEventListener('change', fetchExchangeRate);
        }
    }, 100);

    initSettings();
    
    // 添加设置按钮事件监听 - 适配侧边栏
    document.getElementById('settingsToggle').addEventListener('click', openSettingsSidebar);
    document.getElementById('closeSidebar').addEventListener('click', closeSettingsSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSettingsSidebar);
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('resetSettings').addEventListener('click', resetSettings);
    document.querySelector('.toggle-password').addEventListener('click', togglePasswordVisibility);

    // 初始化流量计算器
    initTrafficCalculator();

    // ESC键关闭侧边栏
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSettingsSidebar();
        }
    });
});

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

/**
 * 实时汇率获取 @pengzhile
 * 代码来源: https://linux.do/t/topic/227730/27
 * 
 * 该函数用于从API获取最新汇率并计算与人民币的兑换比率
 */
function fetchExchangeRate() {
  const currency = document.getElementById('currency').value;
  fetch(`https://777100.xyz/`)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! 状态: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const originRate = data.rates[currency];
    const targetRate = data.rates.CNY;
    const rate = targetRate/originRate;
	
    const utcDate = new Date(data.timestamp);
    const eastEightTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));

    const year = eastEightTime.getUTCFullYear();
    const month = String(eastEightTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(eastEightTime.getUTCDate()).padStart(2, '0');
    const hours = String(eastEightTime.getUTCHours()).padStart(2, '0');
    const minutes = String(eastEightTime.getUTCMinutes()).padStart(2, '0');
    
    const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}`;
    
    document.getElementById('exchangeRate').value = rate.toFixed(3);
    document.getElementById('customRate').value = rate.toFixed(3);
    // 更新Material Web组件的supporting-text
    const exchangeRateField = document.getElementById('exchangeRate');
    exchangeRateField.setAttribute('supporting-text', `更新时间: ${formattedDate}`);
  })
  .catch(error => {
    console.error('Error fetching the exchange rate:', error);
    showNotification('获取汇率失败，请稍后再试。', 'error');
  });
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

function calculateRemainingDays(expiryDate, transactionDate) {
    const expiry = new Date(expiryDate);
    const transaction = new Date(transactionDate);

    // 设置所有时间为当天的开始（00:00:00）
    expiry.setHours(0, 0, 0, 0);
    transaction.setHours(0, 0, 0, 0);
    
    // 如果到期日早于或等于交易日期，返回0
    if (expiry <= transaction) {
        return 0;
    }

    // 计算天数差异
    const timeDiff = expiry.getTime() - transaction.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    return daysDiff;
}

function getCycleStartDate(expiryDateStr, cycleMonths) {
  const end   = new Date(expiryDateStr);
  const start = new Date(end);
  start.setMonth(start.getMonth() - cycleMonths);

  if (start.getDate() !== end.getDate()) {
    start.setDate(0);
  }
  return start;
}

function calculateAndSend() {
  const customRate      = parseFloat(document.getElementById('customRate').value);
  const amount          = parseFloat(document.getElementById('amount').value);
  const cycle           = parseInt(document.getElementById('cycle').value); // 1,3,6,12...
  const expiryDate      = document.getElementById('expiryDate').value;     // yyyy-mm-dd
  const transactionDate = document.getElementById('transactionDate').value;

  if (!(customRate && amount && cycle && expiryDate && transactionDate)) {
    showNotification('请填写所有字段并确保输入有效', 'error');
    return;
  }


  const localAmount = amount * customRate;

  // 整个计费周期的天数
  const cycleStart       = getCycleStartDate(expiryDate, cycle);
  const totalCycleDays   = calculateRemainingDays(expiryDate, cycleStart.toISOString().slice(0,10));

  // 当前剩余天数
  const remainingDays    = calculateRemainingDays(expiryDate, transactionDate);

  // 真实日费 & 剩余价值
  const dailyValue       = localAmount / totalCycleDays;
  const remainingValue   = (dailyValue * remainingDays).toFixed(2);

  const data = {
    price: localAmount,
    time:  remainingDays,
    customRate,
    amount,
    cycle,
    expiryDate,
    transactionDate,
    bidAmount: 0
  };
  updateResults({ remainingValue }, data);
  showNotification('计算完成！', 'success');

  if (parseFloat(remainingValue) >= 1000) {
    triggerConfetti();
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
 * 捕获计算结果并上传到图床
 */
function captureAndUpload() {
    // 检查是否有计算结果
    const resultValue = document.getElementById('resultValue');
    if (resultValue.textContent.trim() === '0.000 元') {
        showNotification('请先计算剩余价值再截图', 'error');
        return;
    }

    // 显示加载中通知
    showNotification('正在生成截图...', 'info');
    
    // 使用 html2canvas 捕获结果区域
    html2canvas(document.getElementById('calcResult'), {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-background-color'),
        scale: 2, // 使用2倍缩放以获得更清晰的图像
        logging: false,
        useCORS: true
    }).then(function(canvas) {
        showNotification('截图生成成功，正在上传...', 'info');
        
        // 转换为 base64 数据 URL
        const imageData = canvas.toDataURL('image/png');
        
        // 上传到选定的图床
        uploadImage(imageData);
    }).catch(function(error) {
        console.error('截图生成失败:', error);
        showNotification('截图生成失败，请重试', 'error');
    });
}

/**
 * 将图片上传到配置的图床
 * @param {string} imageData - base64 格式的图像数据
 */
function uploadImage(imageData) {
    // 从 base64 数据创建 Blob
    const byteString = atob(imageData.split(',')[1]);
    const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], {type: mimeType});
    const file = new File([blob], "calculator-result.png", {type: mimeType});
    
    // 根据图床类型选择不同的上传方法
    switch(imgHost.type) {
        case 'LskyPro':
            uploadToLskyPro(file);
            break;
        case 'EasyImages':
            uploadToEasyImages(file);
            break;
        default:
            showNotification(`不支持的图床类型: ${imgHost.type}，请设置为 LskyPro 或 EasyImages`, 'error');
    }
}

/**
 * 上传到 LskyPro 图床
 * 代码参考: https://greasyfork.org/zh-CN/scripts/487553-nodeseek-%E7%BC%96%E8%BE%91%E5%99%A8%E5%A2%9E%E5%BC%BA
 * 
 * @param {File} file - 要上传的文件
 */
function uploadToLskyPro(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = {
        'Accept': 'application/json'
    };
    
    if (imgHost.token) {
        headers['Authorization'] = `Bearer ${imgHost.token}`;
    }
    
    fetch(`${imgHost.url}/api/v1/upload`, {
        method: 'POST',
        headers: headers,
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === true && data.data && data.data.links) {
            // 获取图片URL
            const imageUrl = data.data.links.url;
            let clipboardText = imageUrl;
            
            // 如果设置为Markdown格式，则生成Markdown格式的文本
            if (imgHost.copyFormat === 'markdown') {
                clipboardText = `![剩余价值计算结果](${imageUrl})`;
            }
            
            // 复制到剪贴板
            copyToClipboard(clipboardText);
            
            // 显示通知，指明使用了哪种格式
            const formatText = imgHost.copyFormat === 'markdown' ? 'Markdown格式' : '链接';
            showNotification(`截图上传成功，${formatText}已复制到剪贴板！`, 'success');
        } else {
            showNotification('图片上传失败', 'error');
            console.error('上传响应异常:', data);
        }
    })
    .catch(error => {
        console.error('上传图片失败:', error);
        showNotification('上传图片失败，请重试', 'error');
    });
}

/**
 * 上传到 EasyImages 图床 
 * 代码参考: https://greasyfork.org/zh-CN/scripts/487553-nodeseek-%E7%BC%96%E8%BE%91%E5%99%A8%E5%A2%9E%E5%BC%BA
 * 
 * @param {File} file - 要上传的文件
 */
function uploadToEasyImages(file) {
    const formData = new FormData();
    let url = imgHost.url;
    
    if (imgHost.token) {
        // 使用后端API
        url += '/api/index.php';
        formData.append('token', imgHost.token);
        formData.append('image', file);
    } else {
        // 使用前端API
        url += '/app/upload.php';
        formData.append('file', file);
        formData.append('sign', Math.floor(Date.now() / 1000));
    }
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.code === 200 && data.url) {
            // 获取图片URL
            const imageUrl = data.url;
            let clipboardText = imageUrl;
            
            // 如果设置为Markdown格式，则生成Markdown格式的文本
            if (imgHost.copyFormat === 'markdown') {
                clipboardText = `![剩余价值计算结果](${imageUrl})`;
            }
            
            // 复制到剪贴板
            copyToClipboard(clipboardText);
            
            // 显示通知，指明使用了哪种格式
            const formatText = imgHost.copyFormat === 'markdown' ? 'Markdown格式' : '链接';
            showNotification(`截图上传成功，${formatText}已复制到剪贴板！`, 'success');
        } else {
            showNotification('图片上传失败', 'error');
            console.error('上传响应异常:', data);
        }
    })
    .catch(error => {
        console.error('上传图片失败:', error);
        showNotification('上传图片失败，请重试', 'error');
    });
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

// 官方流量单价计算器
const OfficialPriceCalculator = {
    // 计算官方流量单价
    calculate(params) {
        const {
            monthlyTraffic,
            billingCycle,
            originalPrice,
            exchangeRate
        } = params;
        
        try {
            // 基础计算
            const originalPriceInCNY = originalPrice * exchangeRate;
            const totalTraffic = monthlyTraffic * billingCycle;
            const monthlyPrice = originalPriceInCNY / billingCycle;
            const dailyPrice = monthlyPrice / 30;
            
            // 流量单价计算
            const unitPricePerGB = totalTraffic > 0 ? originalPriceInCNY / totalTraffic : 0;
            const unitPricePer100GB = unitPricePerGB * 100;
            
            return {
                // 基础信息
                monthlyTraffic: monthlyTraffic,
                billingCycle: billingCycle,
                totalTraffic: totalTraffic,
                
                // 价格信息
                originalPriceInCNY: originalPriceInCNY.toFixed(2),
                monthlyPrice: monthlyPrice.toFixed(2),
                dailyPrice: dailyPrice.toFixed(2),
                
                // 流量单价
                unitPricePerGB: unitPricePerGB.toFixed(4),
                unitPricePer100GB: unitPricePer100GB.toFixed(2),
                
                // 汇率信息
                exchangeRate: exchangeRate.toFixed(4)
            };
        } catch (error) {
            throw new Error('官方单价计算错误: ' + error.message);
        }
    },
    
    // 验证输入数据
    validateInputs(data) {
        const errors = [];
        
        if (!data.monthlyTraffic || data.monthlyTraffic <= 0) {
            errors.push('月流量配额必须大于0');
        }
        
        if (!data.originalPrice || data.originalPrice <= 0) {
            errors.push('套餐原价必须大于0');
        }
        
        if (!data.billingCycle || data.billingCycle <= 0) {
            errors.push('请选择计费周期');
        }
        
        if (!data.exchangeRate || data.exchangeRate <= 0) {
            errors.push('汇率必须大于0');
        }
        
        return errors;
    }
};

// VPS流量价值计算器核心逻辑
const TrafficCalculator = {
    // 计算总流量配额（按实际时间计算）
    calculateTotalTraffic(monthlyTraffic, transactionDate, endDate) {
        const transaction = new Date(transactionDate);
        const end = new Date(endDate);
        
        // 设置时间为当天开始
        transaction.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        // 计算实际天数
        const totalDays = Math.ceil((end - transaction) / (1000 * 60 * 60 * 24));
        
        // 月流量配额按30天计算，按实际天数分配
        return (monthlyTraffic / 30) * totalDays;
    },
    
    // 计算剩余流量
    calculateRemainingTraffic(totalTraffic, usedTraffic) {
        return Math.max(0, totalTraffic - usedTraffic);
    },
    

    
    // 处理价格输入（优先人民币）
    processPriceInput(actualPriceCNY, actualPriceForeign, exchangeRate) {
        if (actualPriceCNY && actualPriceCNY > 0) {
            return {
                finalPrice: actualPriceCNY,
                currency: 'CNY',
                source: 'direct'
            };
        } else if (actualPriceForeign && actualPriceForeign > 0 && exchangeRate > 0) {
            return {
                finalPrice: actualPriceForeign * exchangeRate,
                currency: 'CNY',
                source: 'converted',
                originalAmount: actualPriceForeign
            };
        }
        throw new Error('请输入有效的购买价格');
    },
    
    // 性价比评级
    getValueRating(ratio) {
        if (ratio >= 2.0) return { level: 'S', text: '超值', color: 'success' };
        if (ratio >= 1.5) return { level: 'A', text: '优秀', color: 'primary' };  
        if (ratio >= 1.2) return { level: 'B', text: '良好', color: 'secondary' };
        if (ratio >= 1.0) return { level: 'C', text: '一般', color: 'warning' };
        return { level: 'D', text: '较差', color: 'error' };
    },
    
    // 主计算方法
    calculate(params) {
        const {
            monthlyTraffic,
            usedTraffic, 
            billingCycle,
            originalPrice,
            actualPriceCNY,
            actualPriceForeign,
            exchangeRate,
            transactionDate,
            endDate
        } = params;
        
        try {
            // 1. 基础流量计算
            const totalTraffic = this.calculateTotalTraffic(monthlyTraffic, transactionDate, endDate);
            const remainingTraffic = this.calculateRemainingTraffic(totalTraffic, usedTraffic);
            const usageRate = totalTraffic > 0 ? ((usedTraffic / totalTraffic) * 100).toFixed(1) : '0';
            
            // 2. 价格处理 - 优先人民币
            const actualPriceInfo = this.processPriceInput(actualPriceCNY, actualPriceForeign, exchangeRate);
            const actualPriceInCNY = actualPriceInfo.finalPrice;
            const originalPriceInCNY = originalPrice * exchangeRate;
            
            // 3. 单价计算（人民币/100GB）
            // 官方流量单价 = (套餐原价 ÷ 计费周期月数) ÷ 月流量配额 × 100
            const monthlyOriginalPrice = originalPriceInCNY / billingCycle;
            const originalUnitPrice = monthlyTraffic > 0 ? (monthlyOriginalPrice / monthlyTraffic) * 100 : 0;
            
            // 实际流量单价 = 实际价格 ÷ 剩余流量 × 100（购买剩余套餐的单价）
            const actualUnitPrice = remainingTraffic > 0 ? (actualPriceInCNY / remainingTraffic) * 100 : 0;
            
            // 4. 价值与节省分析
            // 剩余流量官方价值 = 剩余流量 × 官方流量单价 ÷ 100
            const remainingTrafficOriginalValue = (remainingTraffic / 100) * originalUnitPrice;
            
            // 总节省金额 = 剩余流量官方价值 - 实际价格（购买剩余套餐节省的钱）
            const totalSavedAmount = remainingTrafficOriginalValue - actualPriceInCNY;
            
            // 剩余流量节省金额（等同于总节省金额，因为买的就是剩余流量）
            const remainingSavedAmount = totalSavedAmount;
            
            // 5. 性价比分析
            // 折扣率 = 节省金额 ÷ 剩余流量官方价值 × 100
            const discountRate = remainingTrafficOriginalValue > 0 ? ((totalSavedAmount / remainingTrafficOriginalValue) * 100).toFixed(1) : '0';
            // 性价比 = 剩余流量官方价值 ÷ 实际价格
            const costEfficiencyRatio = actualPriceInCNY > 0 ? (remainingTrafficOriginalValue / actualPriceInCNY) : 0;
            
            // 6. 计算剩余天数（简化版）
            const transaction = new Date(transactionDate);
            const end = new Date(endDate);
            const now = new Date();
            
            // 设置时间为当天开始
            transaction.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            now.setHours(0, 0, 0, 0);
            
            const totalDays = Math.ceil((end - transaction) / (1000 * 60 * 60 * 24));
            const remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
            
            // 7. 性价比评级
            const valueRating = this.getValueRating(costEfficiencyRatio);
            
            return {
                // 基础流量信息
                totalTraffic: Math.round(totalTraffic),
                remainingTraffic: Math.round(remainingTraffic),
                usageRate: usageRate + '%',
                
                // 计算详情（用于调试和展示）
                actualDays: totalDays,
                dailyTrafficQuota: (monthlyTraffic / 30).toFixed(2),
                billingCycleMonths: billingCycle,
                monthlyOriginalPrice: monthlyOriginalPrice.toFixed(2),
                actualPurchasePrice: actualPriceInCNY.toFixed(2),
                
                // 单价信息
                originalUnitPrice: originalUnitPrice.toFixed(2),
                actualUnitPrice: actualUnitPrice.toFixed(2),
                unitPriceSavings: (originalUnitPrice - actualUnitPrice).toFixed(2),
                
                // 价值分析
                remainingTrafficOriginalValue: remainingTrafficOriginalValue.toFixed(2),
                actualTotalPaid: actualPriceInCNY.toFixed(2),
                
                // 节省分析
                totalSavedAmount: totalSavedAmount.toFixed(2),
                remainingSavedAmount: remainingSavedAmount.toFixed(2),
                discountRate: discountRate + '%',
                costEfficiencyRatio: costEfficiencyRatio.toFixed(2),
                
                // 时间信息
                totalDays: totalDays,
                remainingDays: remainingDays,
                
                // 性价比评级
                valueRating: valueRating,
                
                // 价格来源信息
                priceSource: actualPriceInfo
            };
        } catch (error) {
            throw new Error('计算过程中发生错误: ' + error.message);
        }
    }
};

// VPS流量计算器数据验证
const TrafficValidation = {
    // 验证流量计算输入数据
    validateTrafficInputs(data) {
        const errors = [];
        
        // 流量验证
        if (!data.monthlyTraffic || data.monthlyTraffic <= 0) {
            errors.push('月流量配额必须大于0');
        }
        
        if (data.usedTraffic < 0) {
            errors.push('已使用流量不能为负数');
        }
        
        // 计算实际总流量配额进行验证
        if (data.transactionDate && data.endDate) {
            const transaction = new Date(data.transactionDate);
            const end = new Date(data.endDate);
            transaction.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            const totalDays = Math.ceil((end - transaction) / (1000 * 60 * 60 * 24));
            const totalTraffic = (data.monthlyTraffic / 30) * totalDays;
            
            if (data.usedTraffic > totalTraffic) {
                errors.push(`已使用流量不能超过总配额 (${totalTraffic.toFixed(1)} GB)`);
            }
        }
        
        // 价格验证
        if (!data.originalPrice || data.originalPrice <= 0) {
            errors.push('套餐原价必须大于0');
        }
        
        // 验证至少有一个有效的实际价格
        const hasValidCNYPrice = data.actualPriceCNY && data.actualPriceCNY > 0;
        const hasValidForeignPrice = data.actualPriceForeign && data.actualPriceForeign > 0 && data.exchangeRate > 0;
        
        if (!hasValidCNYPrice && !hasValidForeignPrice) {
            errors.push('请输入人民币价格或外币价格+汇率');
        }
        
        // 计费周期验证
        if (!data.billingCycle || data.billingCycle <= 0) {
            errors.push('请选择计费周期');
        }
        
        // 汇率验证
        if (!data.exchangeRate || data.exchangeRate <= 0) {
            errors.push('汇率必须大于0');
        }
        
        // 日期验证
        if (!data.transactionDate) {
            errors.push('请选择购买日期');
        }
        
        if (!data.endDate) {
            errors.push('请选择到期时间');
        }
        
        if (data.transactionDate && data.endDate) {
            const transactionDate = new Date(data.transactionDate);
            const endDate = new Date(data.endDate);
            const today = new Date();
            
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            transactionDate.setHours(0, 0, 0, 0);
            
            if (endDate <= today) {
                errors.push('套餐结束日期必须晚于今天');
            }
            
            if (transactionDate > endDate) {
                errors.push('购买日期不能晚于结束日期');
            }
        }
        
        return errors;
    }
};

// VPS流量计算器事件处理器
const TrafficEventHandlers = {
    // 获取流量计算器汇率
    fetchTrafficExchangeRate() {
        const currency = document.getElementById('trafficCurrency').value;
        const exchangeRateField = document.getElementById('trafficExchangeRate');
        
        // 显示加载状态
        const refreshBtn = document.getElementById('refreshTrafficRate');
        if (refreshBtn) {
            refreshBtn.querySelector('i').className = 'fas fa-spinner fa-spin';
        }
        
        fetch(`https://777100.xyz/`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! 状态: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('汇率数据:', data); // 调试日志
            
            // 使用与原始汇率获取逻辑相同的计算方式
            const originRate = data.rates[currency];
            const targetRate = data.rates.CNY;
            const exchangeRate = targetRate/originRate;
            
            if (exchangeRate && exchangeRate > 0) {
                exchangeRateField.value = exchangeRate.toFixed(4);
                
                // 更新汇率更新时间，使用与原始逻辑相同的时间格式
                const utcDate = new Date(data.timestamp);
                const eastEightTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));

                const year = eastEightTime.getUTCFullYear();
                const month = String(eastEightTime.getUTCMonth() + 1).padStart(2, '0');
                const day = String(eastEightTime.getUTCDate()).padStart(2, '0');
                const hours = String(eastEightTime.getUTCHours()).padStart(2, '0');
                const minutes = String(eastEightTime.getUTCMinutes()).padStart(2, '0');
                
                const updateTimeText = `${year}/${month}/${day} ${hours}:${minutes}`;
                
                // 使用setTimeout确保Material Web组件已经渲染完成
                setTimeout(() => {
                    if (exchangeRateField) {
                        exchangeRateField.setAttribute('supporting-text', `最后更新: ${updateTimeText}`);
                    }
                }, 100);
                
                showNotification(`${currency}汇率已更新: ${exchangeRate.toFixed(4)}`, 'success');
            } else {
                console.error('汇率数据无效:', data);
                showNotification(`获取${currency}汇率失败，请手动输入`, 'warning');
                this.setDefaultTrafficExchangeRate(currency);
            }
        })
        .catch(error => {
            console.error('获取汇率失败:', error);
            showNotification('获取汇率失败，可手动输入汇率', 'warning');
            this.setDefaultTrafficExchangeRate(currency);
        })
        .finally(() => {
            // 恢复刷新按钮状态
            if (refreshBtn) {
                refreshBtn.querySelector('i').className = 'fas fa-sync-alt';
            }
        });
    },
    
    // 设置默认汇率（当获取失败时）
    setDefaultTrafficExchangeRate(currency) {
        // 使用与主汇率计算器相同的数据结构
        const defaultData = {
            rates: {
                'USD': 1.0,
                'EUR': 0.923,
                'GBP': 0.792,
                'JPY': 151.04,
                'KRW': 1317.5,
                'HKD': 7.786,
                'TWD': 30.85,
                'SGD': 1.33,
                'AUD': 1.495,
                'CAD': 1.355,
                'CNY': 7.25
            }
        };
        
        const originRate = defaultData.rates[currency];
        const targetRate = defaultData.rates.CNY;
        const defaultRate = targetRate / originRate;
        const exchangeRateField = document.getElementById('trafficExchangeRate');
        
        if (exchangeRateField && !exchangeRateField.value) {
            exchangeRateField.value = defaultRate.toFixed(4);
            setTimeout(() => {
                exchangeRateField.setAttribute('supporting-text', `使用默认汇率，可手动修改`);
            }, 100);
        }
    },
    
    // 初始化流量计算器日期选择器
    initializeTrafficDatePickers() {
        // 到期日期选择器
        flatpickr("#trafficExpiryDate", {
            dateFormat: "Y-m-d",
            locale: "zh",
            placeholder: "选择到期日期",
            minDate: "today",
            onChange: function(_selectedDates, dateStr) {
                const transactionPicker = document.getElementById('trafficTransactionDate')._flatpickr;
                if (transactionPicker) {
                    transactionPicker.set('maxDate', dateStr);
                }
                // 移除自动设置默认日期的逻辑，只在确实需要时才设置
                TrafficEventHandlers.validateTrafficDates();
            }
        });

        // 购买日期选择器
        flatpickr("#trafficTransactionDate", {
            dateFormat: "Y-m-d",
            locale: "zh",
            placeholder: "选择购买日期",
            onChange: this.validateTrafficDates.bind(this)
        });
    },
    
    // 验证流量计算器日期
    validateTrafficDates() {
        const expiryDateInput = document.getElementById('trafficExpiryDate').value;
        const transactionDateInput = document.getElementById('trafficTransactionDate').value;
        
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
            document.getElementById('trafficExpiryDate').value = '';
            return;
        }

        if (transactionDate > expiryDate) {
            showNotification('购买日期不能晚于到期日期', 'error');
            // 只有当购买日期确实晚于到期日期时才重置
            return;
        }

        if (expiryDate.getTime() === transactionDate.getTime()) {
            showNotification('购买日期不能等于到期日期', 'error');
            // 只有当日期确实相等时才提示错误，不清空日期
            return;
        }
    },
    
    // 设置默认交易日期
    setDefaultTrafficTransactionDate() {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        document.getElementById('trafficTransactionDate').value = formattedDate;
    },
    
    // 流量计算按钮点击事件
    calculateTrafficValue() {
        try {
            // 收集输入数据
            const inputData = {
                monthlyTraffic: parseFloat(document.getElementById('monthlyTraffic').value) || 0,
                usedTraffic: parseFloat(document.getElementById('usedTraffic').value) || 0,
                billingCycle: parseInt(document.getElementById('trafficCycle').value) || 0,
                originalPrice: parseFloat(document.getElementById('originalPrice').value) || 0,
                actualPriceCNY: parseFloat(document.getElementById('actualPriceCNY').value) || 0,
                actualPriceForeign: parseFloat(document.getElementById('actualPriceForeign').value) || 0,
                exchangeRate: parseFloat(document.getElementById('trafficExchangeRate').value) || 0,
                transactionDate: document.getElementById('trafficTransactionDate').value,
                endDate: document.getElementById('trafficExpiryDate').value
            };
            
            // 验证输入数据
            const validationErrors = TrafficValidation.validateTrafficInputs(inputData);
            if (validationErrors.length > 0) {
                showNotification(validationErrors[0], 'error');
                return;
            }
            
            // 执行计算
            const result = TrafficCalculator.calculate(inputData);
            
            // 更新结果显示
            this.updateTrafficResults(result);
            
            // 显示成功通知
            showNotification('流量价值计算完成', 'success');
            
            // 触发成功动画
            if (parseFloat(result.totalSavedAmount) > 0) {
                triggerConfetti();
            }
            
        } catch (error) {
            console.error('流量计算错误:', error);
            showNotification(error.message, 'error');
        }
    },
    
    // 更新流量计算结果显示
    updateTrafficResults(result) {
        // 基础流量信息
        document.getElementById('trafficTotalTraffic').textContent = `${result.totalTraffic} GB`;
        document.getElementById('trafficRemainingTraffic').textContent = `${result.remainingTraffic} GB`;
        document.getElementById('trafficUsageRate').textContent = result.usageRate;
        
        // 添加计算说明到各个元素的hover提示
        const totalTrafficElement = document.getElementById('trafficTotalTraffic');
        if (totalTrafficElement && result.actualDays && result.dailyTrafficQuota) {
            totalTrafficElement.title = `计算方式: ${result.dailyTrafficQuota} GB/天 × ${result.actualDays} 天 = ${result.totalTraffic} GB`;
        }
        
        // 官方流量单价的计算说明
        const originalUnitPriceElement = document.getElementById('trafficOriginalUnitPrice');
        if (originalUnitPriceElement && result.monthlyOriginalPrice && result.billingCycleMonths) {
            originalUnitPriceElement.title = `计算方式: (套餐原价 ÷ ${result.billingCycleMonths}月) ÷ 月流量 = ${result.monthlyOriginalPrice} ÷ ${document.getElementById('monthlyTraffic').value}GB × 100 = ${result.originalUnitPrice}元/100GB`;
        }
        
        // 实际流量单价的计算说明
        const actualUnitPriceElement = document.getElementById('trafficActualUnitPrice');
        if (actualUnitPriceElement && result.actualPurchasePrice) {
            actualUnitPriceElement.title = `计算方式: 实际价格 ÷ 剩余流量 = ${result.actualPurchasePrice} ÷ ${result.remainingTraffic}GB × 100 = ${result.actualUnitPrice}元/100GB`;
        }
        
        // 价格对比分析
        document.getElementById('trafficOriginalUnitPrice').textContent = `${result.originalUnitPrice} 元/100GB`;
        document.getElementById('trafficActualUnitPrice').textContent = `${result.actualUnitPrice} 元/100GB`;
        document.getElementById('trafficOriginalValue').textContent = `${result.remainingTrafficOriginalValue} 元`;
        
        // 节省与性价比
        document.getElementById('trafficTotalSaved').textContent = `${result.totalSavedAmount} 元`;
        document.getElementById('trafficDiscountRate').textContent = result.discountRate;
        
        // 性价比评级
        const ratingElement = document.getElementById('trafficValueRating');
        const ratingBadge = ratingElement.querySelector('.rating-badge');
        if (ratingBadge) {
            ratingBadge.textContent = result.valueRating.level;
            ratingBadge.className = `rating-badge rating-${result.valueRating.color}`;
            ratingBadge.title = result.valueRating.text;
        }
        
                // 时间和性价比信息
        document.getElementById('trafficRemainingDays').textContent = `${result.remainingDays} 天`;
        document.getElementById('trafficCostEfficiency').textContent = `${result.costEfficiencyRatio}:1`;
        
        // 显示结果区域
        document.getElementById('trafficResult').style.display = 'block';
        
        // 滚动到结果区域
        document.getElementById('trafficResult').scrollIntoView({ behavior: 'smooth' });
    },
    
    // 官方单价计算
    calculateOfficialPrice() {
        try {
            // 收集输入数据
            const inputData = {
                monthlyTraffic: parseFloat(document.getElementById('monthlyTraffic').value) || 0,
                billingCycle: parseInt(document.getElementById('trafficCycle').value) || 0,
                originalPrice: parseFloat(document.getElementById('originalPrice').value) || 0,
                exchangeRate: parseFloat(document.getElementById('trafficExchangeRate').value) || 0
            };
            
            // 验证输入数据
            const validationErrors = OfficialPriceCalculator.validateInputs(inputData);
            if (validationErrors.length > 0) {
                showNotification(validationErrors[0], 'error');
                return;
            }
            
            // 执行计算
            const result = OfficialPriceCalculator.calculate(inputData);
            
            // 更新结果显示
            this.updateOfficialPriceResults(result);
            
            // 显示成功通知
            showNotification('官方流量单价计算完成', 'success');
            
        } catch (error) {
            console.error('官方单价计算错误:', error);
            showNotification(error.message, 'error');
        }
    },
    
    // 更新官方单价计算结果显示
    updateOfficialPriceResults(result) {
        // 基础套餐信息
        document.getElementById('officialMonthlyTraffic').textContent = `${result.monthlyTraffic} GB`;
        document.getElementById('officialBillingCycle').textContent = getCycleFullText(result.billingCycle);
        document.getElementById('officialTotalTraffic').textContent = `${result.totalTraffic} GB`;
        
        // 价格信息
        document.getElementById('officialOriginalPrice').textContent = `${result.originalPriceInCNY} 元`;
        document.getElementById('officialMonthlyPrice').textContent = `${result.monthlyPrice} 元/月`;
        
        // 流量单价 - 只显示每100GB的单价
        document.getElementById('officialUnitPrice100GB').textContent = `${result.unitPricePer100GB} 元/100GB`;
        
        // 汇率信息
        document.getElementById('officialExchangeRate').textContent = result.exchangeRate;
        
        // 显示结果区域
        document.getElementById('officialPriceResult').style.display = 'block';
        
        // 滚动到结果区域
        document.getElementById('officialPriceResult').scrollIntoView({ behavior: 'smooth' });
    },
    
    // 切换计算模式
    toggleCalculationMode(mode) {
        const trafficCalculator = document.querySelector('.traffic-calculator');
        const fullAnalysisBtn = document.getElementById('fullAnalysisMode');
        const officialPriceBtn = document.getElementById('officialPriceMode');
        const calculateBtn = document.getElementById('calculateTrafficBtn');
        const trafficResult = document.getElementById('trafficResult');
        const officialPriceResult = document.getElementById('officialPriceResult');
        
        if (mode === 'official') {
            // 切换到官方单价模式
            trafficCalculator.classList.add('official-price-mode');
            fullAnalysisBtn.classList.remove('active');
            officialPriceBtn.classList.add('active');
            calculateBtn.innerHTML = '<i class="fas fa-calculator" slot="icon"></i>计算官方单价';
            
            // 隐藏完整分析结果
            trafficResult.style.display = 'none';
            
        } else {
            // 切换到完整分析模式
            trafficCalculator.classList.remove('official-price-mode');
            fullAnalysisBtn.classList.add('active');
            officialPriceBtn.classList.remove('active');
            calculateBtn.innerHTML = '<i class="fas fa-chart-bar" slot="icon"></i>计算流量价值';
            
            // 隐藏官方单价结果
            officialPriceResult.style.display = 'none';
        }
    },
    
    // 清除计算结果
    clearResults() {
        // 隐藏所有结果区域
        document.getElementById('trafficResult').style.display = 'none';
        document.getElementById('officialPriceResult').style.display = 'none';
    }
};

// 初始化流量计算器
function initTrafficCalculator() {
    // 延迟初始化，确保Material Web组件完全加载
    setTimeout(() => {
        // 初始化流量计算器日期选择器
        TrafficEventHandlers.initializeTrafficDatePickers();
        
        // 设置默认购买日期
        TrafficEventHandlers.setDefaultTrafficTransactionDate();
        
        // 设置默认汇率（避免空值导致的错误）
        const currency = document.getElementById('trafficCurrency')?.value || 'USD';
        TrafficEventHandlers.setDefaultTrafficExchangeRate(currency);
        
        // 延迟获取实时汇率
        setTimeout(() => {
            TrafficEventHandlers.fetchTrafficExchangeRate();
        }, 500);
    }, 300);
    
    // 等待Material Web组件加载完成后添加事件监听器
    setTimeout(() => {
        // 币种变化事件
        const trafficCurrencySelect = document.getElementById('trafficCurrency');
        if (trafficCurrencySelect && trafficCurrencySelect.addEventListener) {
            trafficCurrencySelect.addEventListener('change', () => {
                TrafficEventHandlers.fetchTrafficExchangeRate();
            });
        }
        
        // 汇率刷新按钮事件
        const refreshTrafficRateBtn = document.getElementById('refreshTrafficRate');
        if (refreshTrafficRateBtn) {
            refreshTrafficRateBtn.addEventListener('click', () => {
                TrafficEventHandlers.fetchTrafficExchangeRate();
            });
        }
        
        // 汇率输入验证
        const trafficExchangeRateField = document.getElementById('trafficExchangeRate');
        if (trafficExchangeRateField) {
            trafficExchangeRateField.addEventListener('input', () => {
                const value = parseFloat(trafficExchangeRateField.value);
                if (value && value > 0) {
                    setTimeout(() => {
                        trafficExchangeRateField.setAttribute('supporting-text', '手动输入的汇率');
                    }, 100);
                } else if (trafficExchangeRateField.value !== '') {
                    setTimeout(() => {
                        trafficExchangeRateField.setAttribute('supporting-text', '汇率必须大于0');
                    }, 100);
                }
            });
        }
        
        // 模式切换按钮事件
        const fullAnalysisBtn = document.getElementById('fullAnalysisMode');
        const officialPriceBtn = document.getElementById('officialPriceMode');
        
        if (fullAnalysisBtn) {
            fullAnalysisBtn.addEventListener('click', () => {
                TrafficEventHandlers.toggleCalculationMode('full');
            });
        }
        
        if (officialPriceBtn) {
            officialPriceBtn.addEventListener('click', () => {
                TrafficEventHandlers.toggleCalculationMode('official');
            });
        }

        // 计算按钮点击事件（根据模式执行不同计算）
        const calculateTrafficBtn = document.getElementById('calculateTrafficBtn');
        if (calculateTrafficBtn) {
            calculateTrafficBtn.addEventListener('click', () => {
                const trafficCalculator = document.querySelector('.traffic-calculator');
                if (trafficCalculator.classList.contains('official-price-mode')) {
                    TrafficEventHandlers.calculateOfficialPrice();
                } else {
                    TrafficEventHandlers.calculateTrafficValue();
                }
            });
        }
        
        // 流量计算器截图按钮事件
        const trafficScreenshotBtn = document.getElementById('trafficScreenshotBtn');
        if (trafficScreenshotBtn) {
            trafficScreenshotBtn.addEventListener('click', () => {
                captureTrafficResult();
            });
        }
        
        // 官方单价截图按钮事件
        const officialPriceScreenshotBtn = document.getElementById('officialPriceScreenshotBtn');
        if (officialPriceScreenshotBtn) {
            officialPriceScreenshotBtn.addEventListener('click', () => {
                captureOfficialPriceResult();
            });
        }
    }, 200);
}

// 流量计算器截图功能
function captureTrafficResult() {
    const resultElement = document.getElementById('trafficResult');
    if (!resultElement) {
        showNotification('找不到流量计算结果区域', 'error');
        return;
    }
    
    html2canvas(resultElement, {
        backgroundColor: 'var(--md-sys-color-background)',
        scale: 2,
        useCORS: true
    }).then(canvas => {
        canvas.toBlob(blob => {
            if (blob) {
                uploadImage(blob);
            } else {
                showNotification('截图生成失败', 'error');
            }
        }, 'image/png');
    }).catch(error => {
        console.error('截图失败:', error);
        showNotification('截图失败，请重试', 'error');
    });
}

// 官方单价结果截图功能
function captureOfficialPriceResult() {
    const resultElement = document.getElementById('officialPriceResult');
    if (!resultElement) {
        showNotification('找不到官方单价结果区域', 'error');
        return;
    }
    
    html2canvas(resultElement, {
        backgroundColor: 'var(--md-sys-color-background)',
        scale: 2,
        useCORS: true
    }).then(canvas => {
        canvas.toBlob(blob => {
            if (blob) {
                uploadImage(blob);
            } else {
                showNotification('截图生成失败', 'error');
            }
        }, 'image/png');
    }).catch(error => {
        console.error('截图失败:', error);
        showNotification('截图失败，请重试', 'error');
    });
}
