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

        // 溢价模式切换开关事件
        const premiumModeSwitch = document.getElementById('premiumModeSwitch');
        const actualPriceCNYField = document.getElementById('actualPriceCNY');
        const priceInputGroup = actualPriceCNYField?.closest('.price-input-group');
        
        if (premiumModeSwitch && actualPriceCNYField) {
            premiumModeSwitch.addEventListener('change', () => {
                const isPremiumMode = premiumModeSwitch.selected;
                
                console.log('溢价模式切换:', isPremiumMode); // 调试日志
                
                if (isPremiumMode) {
                    // 切换到溢价模式
                    actualPriceCNYField.label = '溢价金额';
                    actualPriceCNYField.supportingText = '在官方价值基础上的溢价';
                    priceInputGroup?.classList.add('premium-mode');
                    console.log('已切换到溢价模式'); // 调试日志
                } else {
                    // 切换到直接价格模式
                    actualPriceCNYField.label = '实际价格';
                    actualPriceCNYField.supportingText = '人民币';
                    priceInputGroup?.classList.remove('premium-mode');
                    console.log('已切换到直接价格模式'); // 调试日志
                }
                
                // 清空当前输入值，避免模式切换时的数据混淆
                actualPriceCNYField.value = '';
            });
        } else {
            console.error('溢价模式切换元素未找到:', {
                premiumModeSwitch: !!premiumModeSwitch,
                actualPriceCNYField: !!actualPriceCNYField
            });
        }
    }, 200);
}