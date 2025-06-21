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