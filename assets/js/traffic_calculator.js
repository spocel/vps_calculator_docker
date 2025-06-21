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
    
    // 处理价格输入（支持溢价模式）
    processPriceInput(actualPriceCNY, isPremiumMode, premiumAmount, remainingTrafficOriginalValue) {
        if (isPremiumMode && premiumAmount !== undefined && remainingTrafficOriginalValue !== undefined) {
            // 溢价模式：实际价格 = 剩余流量官方价值 + 溢价
            const finalPrice = remainingTrafficOriginalValue + premiumAmount;
            return {
                finalPrice: finalPrice,
                currency: 'CNY',
                source: 'premium',
                premiumAmount: premiumAmount,
                baseValue: remainingTrafficOriginalValue
            };
        } else if (actualPriceCNY && actualPriceCNY > 0) {
            // 直接价格模式
            return {
                finalPrice: actualPriceCNY,
                currency: 'CNY',
                source: 'direct'
            };
        }
        throw new Error('请输入有效的购买价格或溢价金额');
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
            isPremiumMode,
            premiumAmount,
            exchangeRate,
            transactionDate,
            endDate
        } = params;
        
        try {
            // 1. 基础流量计算
            const totalTraffic = this.calculateTotalTraffic(monthlyTraffic, transactionDate, endDate);
            const remainingTraffic = this.calculateRemainingTraffic(totalTraffic, usedTraffic);
            const usageRate = totalTraffic > 0 ? ((usedTraffic / totalTraffic) * 100).toFixed(1) : '0';
            
            const originalPriceInCNY = originalPrice * exchangeRate;
            
            // 2. 先计算官方流量单价和剩余流量官方价值
            // 官方流量单价 = (套餐原价 ÷ 计费周期月数) ÷ 月流量配额 × 100
            const monthlyOriginalPrice = originalPriceInCNY / billingCycle;
            const originalUnitPrice = monthlyTraffic > 0 ? (monthlyOriginalPrice / monthlyTraffic) * 100 : 0;
            
            // 剩余流量官方价值 = 剩余流量 × 官方流量单价 ÷ 100
            const remainingTrafficOriginalValue = (remainingTraffic / 100) * originalUnitPrice;
            
            // 3. 价格处理 - 支持溢价模式
            const actualPriceInfo = this.processPriceInput(
                actualPriceCNY, 
                isPremiumMode, 
                premiumAmount, 
                remainingTrafficOriginalValue
            );
            const actualPriceInCNY = actualPriceInfo.finalPrice;
            
            // 4. 实际流量单价计算
            // 实际流量单价 = 实际价格 ÷ 剩余流量 × 100（购买剩余套餐的单价）
            const actualUnitPrice = remainingTraffic > 0 ? (actualPriceInCNY / remainingTraffic) * 100 : 0;
            
            // 5. 价值与节省分析
            // 总节省金额 = 剩余流量官方价值 - 实际价格（购买剩余套餐节省的钱）
            const totalSavedAmount = remainingTrafficOriginalValue - actualPriceInCNY;
            
            // 剩余流量节省金额（等同于总节省金额，因为买的就是剩余流量）
            const remainingSavedAmount = totalSavedAmount;
            
            // 6. 性价比分析
            // 折扣率 = 节省金额 ÷ 剩余流量官方价值 × 100
            const discountRate = remainingTrafficOriginalValue > 0 ? ((totalSavedAmount / remainingTrafficOriginalValue) * 100).toFixed(1) : '0';
            // 性价比 = 剩余流量官方价值 ÷ 实际价格
            const costEfficiencyRatio = actualPriceInCNY > 0 ? (remainingTrafficOriginalValue / actualPriceInCNY) : 0;
            
            // 7. 计算剩余天数（简化版）
            const transaction = new Date(transactionDate);
            const end = new Date(endDate);
            const now = new Date();
            
            // 设置时间为当天开始
            transaction.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            now.setHours(0, 0, 0, 0);
            
            const totalDays = Math.ceil((end - transaction) / (1000 * 60 * 60 * 24));
            const remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
            
            // 8. 性价比评级
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
        
        // 验证价格输入（支持溢价模式）
        if (data.isPremiumMode) {
            // 溢价模式：验证溢价金额（允许负数，表示打折出售）
            if (data.premiumAmount === undefined || data.premiumAmount === null) {
                errors.push('溢价模式下请输入溢价金额');
            }
        } else {
            // 直接价格模式：验证人民币价格（允许负数和0值，表示低价出售）
            if (data.actualPriceCNY === undefined || data.actualPriceCNY === null || data.actualPriceCNY === '') {
                errors.push('请输入实际价格');
            }
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
                    // 获取当前购买日期
                    const currentTransactionDate = document.getElementById('trafficTransactionDate').value;
                    
                    // 设置到期日期为购买日期的最大值
                    transactionPicker.set('maxDate', dateStr);
                    
                    // 如果购买日期被意外清空且之前有有效值，尝试恢复
                    const newTransactionDate = document.getElementById('trafficTransactionDate').value;
                    if (!newTransactionDate && currentTransactionDate) {
                        // 检查原购买日期是否仍然有效（小于等于新的到期日期）
                        const originalDate = new Date(currentTransactionDate);
                        const expiryDate = new Date(dateStr);
                        
                        if (originalDate <= expiryDate) {
                            // 原购买日期仍然有效，恢复它
                            transactionPicker.setDate(currentTransactionDate);
                            console.log('恢复购买日期:', currentTransactionDate); // 调试日志
                        }
                    }
                }
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
            // 收集基础输入数据
            const inputData = {
                monthlyTraffic: parseFloat(document.getElementById('monthlyTraffic').value) || 0,
                usedTraffic: parseFloat(document.getElementById('usedTraffic').value) || 0,
                billingCycle: parseInt(document.getElementById('trafficCycle').value) || 0,
                originalPrice: parseFloat(document.getElementById('originalPrice').value) || 0,
                actualPriceCNY: parseFloat(document.getElementById('actualPriceCNY').value) || 0,
                exchangeRate: parseFloat(document.getElementById('trafficExchangeRate').value) || 0,
                transactionDate: document.getElementById('trafficTransactionDate').value,
                endDate: document.getElementById('trafficExpiryDate').value
            };
            
            // 收集溢价模式相关数据
            const premiumModeSwitch = document.getElementById('premiumModeSwitch');
            const isPremiumMode = premiumModeSwitch ? premiumModeSwitch.selected : false;
            
            inputData.isPremiumMode = isPremiumMode;
            
            console.log('溢价模式状态:', isPremiumMode, '溢价金额:', inputData.actualPriceCNY); // 调试日志
            
            if (isPremiumMode) {
                // 溢价模式下，actualPriceCNY字段输入的是溢价金额
                inputData.premiumAmount = inputData.actualPriceCNY;
                inputData.actualPriceCNY = 0; // 清零，将在计算中自动计算
                console.log('溢价模式：溢价金额设置为', inputData.premiumAmount); // 调试日志
            } else {
                inputData.premiumAmount = 0;
                console.log('直接价格模式：实际价格为', inputData.actualPriceCNY); // 调试日志
            }
            
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

// 流量计算器截图功能
function captureTrafficResult() {
    const resultElement = document.getElementById('trafficResult');
    if (!resultElement || resultElement.style.display === 'none') {
        showNotification('请先计算流量价值再截图', 'error');
        return;
    }
    
    // 检查是否有有效的计算结果
    const totalSavedElement = document.getElementById('trafficTotalSaved');
    if (!totalSavedElement || totalSavedElement.textContent.trim() === '0.00 元') {
        showNotification('请先计算流量价值再截图', 'error');
        return;
    }

    // 显示加载中通知
    showNotification('正在生成截图...', 'info');
    
    // 使用 html2canvas 捕获结果区域，参数与原始截图功能保持一致
    html2canvas(resultElement, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-background') || '#ffffff',
        scale: 2, // 使用2倍缩放以获得更清晰的图像
        logging: false,
        useCORS: true
    }).then(function(canvas) {
        showNotification('截图生成成功，正在上传...', 'info');
        
        // 转换为 base64 数据 URL，与原始函数保持一致
        const imageData = canvas.toDataURL('image/png');
        
        // 上传到选定的图床
        uploadImage(imageData);
    }).catch(function(error) {
        console.error('截图生成失败:', error);
        showNotification('截图生成失败，请重试', 'error');
    });
}

// 官方单价结果截图功能
function captureOfficialPriceResult() {
    const resultElement = document.getElementById('officialPriceResult');
    if (!resultElement || resultElement.style.display === 'none') {
        showNotification('请先计算官方单价再截图', 'error');
        return;
    }
    
    // 检查是否有有效的计算结果
    const unitPriceElement = document.getElementById('officialUnitPrice100GB');
    if (!unitPriceElement || unitPriceElement.textContent.trim() === '0.00 元/100GB') {
        showNotification('请先计算官方单价再截图', 'error');
        return;
    }

    // 显示加载中通知
    showNotification('正在生成截图...', 'info');
    
    // 使用 html2canvas 捕获结果区域，参数与原始截图功能保持一致
    html2canvas(resultElement, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-background') || '#ffffff',
        scale: 2, // 使用2倍缩放以获得更清晰的图像
        logging: false,
        useCORS: true
    }).then(function(canvas) {
        showNotification('截图生成成功，正在上传...', 'info');
        
        // 转换为 base64 数据 URL，与原始函数保持一致
        const imageData = canvas.toDataURL('image/png');
        
        // 上传到选定的图床
        uploadImage(imageData);
    }).catch(function(error) {
        console.error('截图生成失败:', error);
        showNotification('截图生成失败，请重试', 'error');
    });
}