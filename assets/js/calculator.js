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