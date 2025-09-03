import { Expense, Income, MonthlyArchive, MonthlyComparison } from './types';

// Date utility functions
export const getCurrentMonth = (): string => {
  return new Date().toISOString().slice(0, 7); // YYYY-MM format
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatMonthYear = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};

export const getMonthName = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long' });
};

export const getYear = (monthString: string): string => {
  const [year] = monthString.split('-');
  return year;
};

// Data filtering and calculation utilities
export const filterCurrentMonthData = (expenses: Expense[], income: Income[]): { expenses: Expense[], income: Income[] } => {
  const currentMonth = getCurrentMonth();
  
  const currentMonthExpenses = expenses.filter(expense => 
    expense.date.startsWith(currentMonth)
  );
  
  const currentMonthIncome = income.filter(incomeItem => 
    incomeItem.date.startsWith(currentMonth)
  );
  
  return {
    expenses: currentMonthExpenses,
    income: currentMonthIncome
  };
};

export const calculateTotalAmount = (items: (Expense | Income)[]): number => {
  return items.reduce((total, item) => total + item.amount, 0);
};

export const calculateCategoryBreakdown = (expenses: Expense[]): { [category: string]: number } => {
  return expenses.reduce((breakdown, expense) => {
    breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
    return breakdown;
  }, {} as { [category: string]: number });
};

export const calculateSourceBreakdown = (income: Income[]): { [source: string]: number } => {
  return income.reduce((breakdown, incomeItem) => {
    breakdown[incomeItem.source] = (breakdown[incomeItem.source] || 0) + incomeItem.amount;
    return breakdown;
  }, {} as { [source: string]: number });
};

// Monthly archive utilities
export const createMonthlyArchive = (month: string, expenses: Expense[], income: Income[]): MonthlyArchive => {
  const totalSpent = calculateTotalAmount(expenses);
  const totalIncome = calculateTotalAmount(income);
  const netAmount = totalIncome - totalSpent;
  
  return {
    month,
    expenses,
    income,
    totalSpent,
    totalIncome,
    netAmount,
    createdAt: new Date().toISOString()
  };
};

export const compareMonths = (currentMonth: MonthlyArchive, previousMonth?: MonthlyArchive): MonthlyComparison => {
  const spendingChange = previousMonth 
    ? currentMonth.totalSpent - previousMonth.totalSpent
    : 0;
    
  const incomeChange = previousMonth 
    ? currentMonth.totalIncome - previousMonth.totalIncome
    : 0;
    
  const netChange = previousMonth 
    ? currentMonth.netAmount - previousMonth.netAmount
    : 0;
  
  return {
    currentMonth,
    previousMonth,
    spendingChange,
    incomeChange,
    netChange
  };
};

// Validation utilities
export const validateAmount = (amount: string): boolean => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount > 0;
};

export const validateFormData = (formData: { amount: string; description: string }): boolean => {
  return validateAmount(formData.amount);
};

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Projection calculation
export const calculateMonthlyProjection = (currentAmount: number, daysInMonth: number): number => {
  const today = new Date().getDate();
  const daysRemaining = daysInMonth - today;
  
  // If it's the first day of the month or no data yet, return current amount
  if (today <= 1 || currentAmount === 0) {
    return currentAmount;
  }
  
  const dailyAverage = currentAmount / today;
  const projection = currentAmount + (dailyAverage * daysRemaining);
  
  return projection;
};

// Generate month list for picker
export const generateMonthList = (): string[] => {
  const months: string[] = [];
  const currentDate = new Date();
  
  // Generate last 12 months in ascending order (oldest to newest)
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthString = date.toISOString().slice(0, 7);
    months.push(monthString);
  }
  
  return months;
};

// Generate month list with entries only
export const generateMonthListWithEntries = (expenses: any[], income: any[], monthlyArchives: any[]): string[] => {
  const monthsWithEntries = new Set<string>();
  
  // Add months from current expenses
  expenses.forEach(expense => {
    const month = expense.date.slice(0, 7); // YYYY-MM format
    monthsWithEntries.add(month);
  });
  
  // Add months from current income
  income.forEach(incomeItem => {
    const month = incomeItem.date.slice(0, 7); // YYYY-MM format
    monthsWithEntries.add(month);
  });
  
  // Add months from archived data
  monthlyArchives.forEach(archive => {
    monthsWithEntries.add(archive.month);
  });
  
  // Convert to array and sort in ascending order
  return Array.from(monthsWithEntries).sort();
};

// Month picker utilities
export const openMonthPicker = (setShowMonthPicker: (show: boolean) => void): void => {
  setShowMonthPicker(true);
};

export const isCurrentMonth = (month: string): boolean => {
  return month === getCurrentMonth();
};

// Monthly report utilities
export const generateMonthlyReport = (month: string, expenses: Expense[], income: Income[]) => {
  const monthExpenses = expenses.filter(expense => expense.date.startsWith(month));
  const monthIncome = income.filter(incomeItem => incomeItem.date.startsWith(month));
  
  const totalSpent = calculateTotalAmount(monthExpenses);
  const totalIncome = calculateTotalAmount(monthIncome);
  const netAmount = totalIncome - totalSpent;
  
  const categoryBreakdown = calculateCategoryBreakdown(monthExpenses);
  const topCategories = Object.entries(categoryBreakdown)
    .filter(([_, total]) => total > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5);
  
  return {
    month,
    totalSpent,
    totalIncome,
    netAmount,
    transactionCount: monthExpenses.length + monthIncome.length,
    topCategories
  };
};

// Enhanced projection calculations
export const calculateProjectionData = (totalSpent: number, totalIncome: number) => {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = today.getDate();
  const daysRemaining = daysInMonth - daysPassed;
  const avgDailySpending = daysPassed > 0 ? totalSpent / daysPassed : 0;
  
  const projectedSpending = calculateMonthlyProjection(totalSpent, daysInMonth);
  const projectedIncome = calculateMonthlyProjection(totalIncome, daysInMonth);
  const projectedNet = projectedIncome - projectedSpending;
  
  return {
    projectedSpending,
    projectedIncome,
    projectedNet,
    avgDailySpending,
    daysPassed,
    daysRemaining,
    daysInMonth
  };
};