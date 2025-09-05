import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Animated,
  Platform,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import our organized modules
import { TabType, BottomTabType, ExpenseFormData, IncomeFormData, Expense, Income, FinancialGoal, GoalFormData, Savings } from './types';
import { DEFAULT_FORM_VALUES, ANIMATION_DURATION, INCOME_SOURCES, EXPENSE_CATEGORIES, CATEGORY_COLORS, GOAL_CATEGORIES, GOAL_COLORS, GOAL_ICONS, STORAGE_KEYS } from './constants';
import { 
  getCurrentMonth, 
  calculateTotalAmount, 
  calculateCategoryBreakdown,
  calculateMonthlyProjection,
  validateFormData,
  formatMonthYear,
  generateMonthListWithEntries,
  openMonthPicker,
  generateMonthlyReport
} from './utils';
import { useData } from './hooks/useData';
import { NotificationService } from './services/notifications';
import { PickerModal, DeleteConfirmDialog, TransactionItem, CategoryBreakdown } from './components';

// const { width, height } = Dimensions.get('window'); // For future use

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const BudgetTracker: React.FC = memo(() => {
  // Data management
  const {
    expenses,
    income,
    monthlyArchives,
    loadData,
    addExpense,
    addIncome,
    deleteExpense,
    deleteIncome,
    archiveMonth
  } = useData();

  // Form states
  const [formData, setFormData] = useState<ExpenseFormData>(DEFAULT_FORM_VALUES.EXPENSE);
  const [incomeForm, setIncomeForm] = useState<IncomeFormData>(DEFAULT_FORM_VALUES.INCOME);
  
  // Goals state
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [goalForm, setGoalForm] = useState<GoalFormData>(DEFAULT_FORM_VALUES.GOAL);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [showGoalCelebration, setShowGoalCelebration] = useState<boolean>(false);
  const [celebratedGoal, setCelebratedGoal] = useState<FinancialGoal | null>(null);
  
  // Savings state
  const [savings, setSavings] = useState<Savings[]>([]);
  const [showSavingsAllocationModal, setShowSavingsAllocationModal] = useState<boolean>(false);
  const [allocationAmount, setAllocationAmount] = useState<string>('');
  const [selectedGoalForAllocation, setSelectedGoalForAllocation] = useState<FinancialGoal | null>(null);
  
  // UI states
  const [activeTab, setActiveTab] = useState<TabType>('expense');
  const [transactionViewTab, setTransactionViewTab] = useState<TabType>('expense');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('add');
  const [forceRefresh, setForceRefresh] = useState<number>(0);
  const [localExpenses, setLocalExpenses] = useState<Expense[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [manualRefresh, setManualRefresh] = useState<number>(0);
  const [directTotalSavings, setDirectTotalSavings] = useState<number>(0);
  
  // Modal states
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [showSourcePicker, setShowSourcePicker] = useState<boolean>(false);
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState<boolean>(false);
  const [showIncomeDatePicker, setShowIncomeDatePicker] = useState<boolean>(false);
  const [showProjectionInfo, setShowProjectionInfo] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteItem, setDeleteItem] = useState<{ id: number; type: 'expense' | 'income'; description: string } | null>(null);
  
  // Goal modal states
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [showGoalCategoryPicker, setShowGoalCategoryPicker] = useState<boolean>(false);
  const [showGoalDatePicker, setShowGoalDatePicker] = useState<boolean>(false);
  
  // Month management
  const [viewingMonth, setViewingMonth] = useState<string>(getCurrentMonth());
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState<boolean>(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const amountInputRef = useRef<any>(null);
  const noteInputRef = useRef<any>(null);

  // Load data and initialize animations on app start
  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION.SLOW,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION.SLOW,
        useNativeDriver: true,
      }),
    ]).start();

    // Initialize notifications
    const initializeNotifications = async () => {
      const hasPermission = await NotificationService.requestPermissions();
      if (hasPermission) {
        await NotificationService.scheduleMonthEndReminders();
        console.log('Notifications initialized successfully');
      } else {
        console.log('Notification permissions not granted');
      }
    };
    
    initializeNotifications();

    // Set up notification listener
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      // Handle notification tap
    });

    return () => subscription.remove();
  }, [loadData, fadeAnim, slideAnim]);

  // Debug: Track expenses state changes
  useEffect(() => {
    console.log('Debug - App.tsx expenses state changed:', {
      expensesCount: expenses.length,
      savingsExpenses: expenses.filter(e => e.category === 'Savings'),
      allExpenses: expenses
    });
    
    // Sync local expenses with useData expenses
    setLocalExpenses(expenses);
    
    // Initialize direct total savings
    const currentSavings = expenses
      .filter(expense => expense.category === 'Savings' && expense.date.startsWith(viewingMonth))
      .reduce((sum, expense) => sum + expense.amount, 0);
    setDirectTotalSavings(currentSavings);
    
    // Force refresh when expenses change to ensure UI updates
    if (expenses.length > 0) {
      setForceRefresh(prev => prev + 1);
      console.log('Debug - Expenses changed, forcing UI refresh');
    }
  }, [expenses, viewingMonth]);

  // Debug: Track viewing month changes
  useEffect(() => {
    console.log('Debug - Viewing month changed:', {
      viewingMonth,
      currentDate: new Date().toISOString().split('T')[0],
      currentMonth: new Date().toISOString().substring(0, 7)
    });
  }, [viewingMonth]);

  // Load goals data
  const loadGoals = useCallback(async (): Promise<void> => {
    try {
      const storedGoals = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      if (storedGoals) {
        const parsedGoals = JSON.parse(storedGoals);
        setGoals(parsedGoals);
      } else {
        // Create default goals if none exist
        const defaultGoals: FinancialGoal[] = [
          {
            id: 1,
            title: 'Emergency Fund',
            description: 'Build a safety net for unexpected expenses',
            targetAmount: 5000,
            currentAmount: 0,
            category: 'emergency',
            targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            isCompleted: false,
            color: '#ef4444',
            icon: 'shield-checkmark-outline'
          },
          {
            id: 2,
            title: 'Vacation Fund',
            description: 'Save for a dream vacation',
            targetAmount: 2000,
            currentAmount: 0,
            category: 'savings',
            targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            isCompleted: false,
            color: '#10b981',
            icon: 'airplane-outline'
          }
        ];
        setGoals(defaultGoals);
        await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(defaultGoals));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }, []);

  // Load goals on component mount
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Load savings data (allocations ledger)
  const loadSavings = useCallback(async (): Promise<void> => {
    try {
      const storedSavings = await AsyncStorage.getItem(STORAGE_KEYS.SAVINGS);
      if (storedSavings) {
        const parsedSavings = JSON.parse(storedSavings);
        setSavings(parsedSavings);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
    }
  }, []);

  // Load savings on component mount
  useEffect(() => {
    loadSavings();
  }, [loadSavings]);

  // Goal CRUD operations
  const addGoal = useCallback(async (goalData: GoalFormData): Promise<void> => {
    try {
      const newGoal: FinancialGoal = {
        id: Date.now(),
        title: goalData.title,
        description: goalData.description,
        targetAmount: parseFloat(goalData.targetAmount),
        currentAmount: 0,
        category: goalData.category as any,
        targetDate: goalData.targetDate || undefined,
        createdAt: new Date().toISOString(),
        isCompleted: false,
        color: goalData.color,
        icon: goalData.icon as any
      };

      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));
      
      // Force UI refresh to update goals screen instantly
      setForceRefresh(prev => prev + 1);
      setRefreshKey(prev => prev + 1);
      setManualRefresh(prev => prev + 1);
      
      // Reset form
      setGoalForm(DEFAULT_FORM_VALUES.GOAL);
      setShowGoalModal(false);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  }, [goals]);

  const updateGoal = useCallback(async (goalId: number, goalData: GoalFormData): Promise<void> => {
    try {
      const updatedGoals = goals.map(goal => 
        goal.id === goalId 
          ? {
              ...goal,
              title: goalData.title,
              description: goalData.description,
              targetAmount: parseFloat(goalData.targetAmount),
              category: goalData.category as any,
              targetDate: goalData.targetDate || undefined,
              color: goalData.color,
              icon: goalData.icon as any
            }
          : goal
      );
      
      setGoals(updatedGoals);
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));
      
      // Force UI refresh to update goals screen instantly
      setForceRefresh(prev => prev + 1);
      setRefreshKey(prev => prev + 1);
      setManualRefresh(prev => prev + 1);
      
      // Reset form and close modal
      setGoalForm(DEFAULT_FORM_VALUES.GOAL);
      setEditingGoal(null);
      setShowGoalModal(false);
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  }, [goals]);

  // Goal completion celebration
  const triggerGoalCelebration = useCallback((goal: FinancialGoal) => {
    setCelebratedGoal(goal);
    setShowGoalCelebration(true);
    
    // Start celebration animation
    Animated.sequence([
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(celebrationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowGoalCelebration(false);
      setCelebratedGoal(null);
    });
  }, [celebrationAnim]);

  const deleteGoal = useCallback(async (goalId: number): Promise<void> => {
    try {
      const updatedGoals = goals.filter(goal => goal.id !== goalId);
      setGoals(updatedGoals);
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));
      
      // Force UI refresh to update goals screen instantly
      setForceRefresh(prev => prev + 1);
      setRefreshKey(prev => prev + 1);
      setManualRefresh(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  }, [goals]);

  // Note: updateGoalProgress function is available for future use
  // const updateGoalProgress = useCallback(async (goalId: number, amount: number): Promise<void> => {
  //   try {
  //     const updatedGoals = goals.map(goal => {
  //       if (goal.id === goalId) {
  //         const newCurrentAmount = Math.max(0, goal.currentAmount + amount);
  //         const isCompleted = newCurrentAmount >= goal.targetAmount;
  //         return {
  //           ...goal,
  //           currentAmount: newCurrentAmount,
  //           isCompleted
  //         };
  //       }
  //       return goal;
  //     });
      
  //     setGoals(updatedGoals);
  //     await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));
  //   } catch (error) {
  //     console.error('Error updating goal progress:', error);
  //   }
  // }, [goals]);

  // Savings CRUD operations
  const addSavings = useCallback(async (amount: number, description: string): Promise<void> => {
    try {
      const newSavings: Savings = {
        id: Date.now(),
        amount,
        description,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedSavings = [...savings, newSavings];
      setSavings(updatedSavings);
      await AsyncStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(updatedSavings));
    } catch (error) {
      console.error('Error adding savings:', error);
    }
  }, [savings]);

  const allocateSavingsToGoal = useCallback(async (goalId: number, amount: number): Promise<void> => {
    try {
      // Create a new savings record for the allocated amount
      const newSavingsRecord: Savings = {
        id: Date.now(),
        amount: amount,
        description: `Allocated to goal`,
        date: new Date().toISOString().split('T')[0],
        allocatedToGoal: goalId
      };

      const updatedSavings = [...savings, newSavingsRecord];
      setSavings(updatedSavings);
      await AsyncStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(updatedSavings));

      // Update goal progress
      const updatedGoals = goals.map(goal => {
        if (goal.id === goalId) {
          const newCurrentAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
          const isCompleted = newCurrentAmount >= goal.targetAmount;
          return {
            ...goal,
            currentAmount: newCurrentAmount,
            isCompleted
          };
        }
        return goal;
      });
      
      setGoals(updatedGoals);
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));

      // Force UI refresh to update goals screen instantly
      setForceRefresh(prev => prev + 1);
      setRefreshKey(prev => prev + 1);
      setManualRefresh(prev => prev + 1);

      // Check if goal is completed and trigger celebration
      const completedGoal = updatedGoals.find(goal => goal.id === goalId && goal.isCompleted);
      if (completedGoal) {
        triggerGoalCelebration(completedGoal);
      }
    } catch (error) {
      console.error('Error allocating savings to goal:', error);
    }
  }, [savings, goals, triggerGoalCelebration]);

  // Form submission handlers
  const handleExpenseSubmit = useCallback(async (): Promise<void> => {
    if (formData.amount && parseFloat(formData.amount) > 0) {
      console.log('Debug - Submitting expense:', {
        amount: formData.amount,
        category: formData.category,
        description: formData.description,
        isSavings: formData.category === 'Savings'
      });
      
      // Always add to expenses array (including savings)
      const newExpense: Expense = {
        id: Date.now(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date
      };
      
      // Add expense first
      addExpense(newExpense);
      
      // Immediately update local expenses for instant UI update
      setLocalExpenses(prev => [newExpense, ...prev]);
      console.log('Debug - Updated local expenses immediately');
      
      // Force component re-render
      setRefreshKey(prev => prev + 1);
      setForceRefresh(prev => prev + 1);
      
      // Also add to savings array if it's a savings transaction
      if (formData.category === 'Savings') {
        console.log('Debug - Adding to savings array:', parseFloat(formData.amount));
        await addSavings(parseFloat(formData.amount), formData.description);
        
        // Direct state update for immediate UI response
        setDirectTotalSavings(prev => prev + parseFloat(formData.amount));
        console.log('Debug - Direct totalSavings updated:', directTotalSavings + parseFloat(formData.amount));
        
        // Force additional refresh
        setRefreshKey(prev => prev + 1);
        setForceRefresh(prev => prev + 1);
        console.log('Debug - Forcing UI refresh after savings addition');
      }
      
      // Clear form after successful submission
      setFormData(DEFAULT_FORM_VALUES.EXPENSE);
      
      console.log('Debug - Expense submission completed');
    }
  }, [formData, addExpense, addSavings]);

  const handleIncomeSubmit = useCallback((): void => {
    if (incomeForm.amount && parseFloat(incomeForm.amount) > 0) {
      const newIncome: Income = {
        id: Date.now(),
        amount: parseFloat(incomeForm.amount),
        source: incomeForm.source,
        description: incomeForm.description,
        date: incomeForm.date
      };
      addIncome(newIncome);
      setIncomeForm(DEFAULT_FORM_VALUES.INCOME);
    }
  }, [incomeForm, addIncome]);

  // Delete handlers
  const handleDeletePress = useCallback((id: number, type: 'expense' | 'income', description: string) => {
    setDeleteItem({ id, type, description });
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteItem) {
      if (deleteItem.type === 'expense') {
        deleteExpense(deleteItem.id);
      } else if (deleteItem.type === 'income') {
        deleteIncome(deleteItem.id);
      } else if (deleteItem.type === 'goal') {
        deleteGoal(deleteItem.id);
      }
    }
    setShowDeleteConfirm(false);
    setDeleteItem(null);
  }, [deleteItem, deleteExpense, deleteIncome, deleteGoal]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteItem(null);
  }, []);



  // Refresh handler
  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  // Form handlers
  const handleAmountChange = useCallback((text: string) => {
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const parts = cleanedText.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    if (activeTab === 'expense') {
      setFormData({ ...formData, amount: cleanedText });
    } else {
      setIncomeForm({ ...incomeForm, amount: cleanedText });
    }
  }, [activeTab, formData, incomeForm]);

  const handleDescriptionChange = useCallback((text: string) => {
    if (activeTab === 'expense') {
      setFormData({ ...formData, description: text });
    } else {
      setIncomeForm({ ...incomeForm, description: text });
    }
  }, [activeTab, formData, incomeForm]);

  const handleExpenseDateChange = useCallback((_: any, selectedDate?: Date) => {
    setShowExpenseDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        date: selectedDate.toISOString().split('T')[0]
      });
    }
  }, [formData]);

  const handleIncomeDateChange = useCallback((_: any, selectedDate?: Date) => {
    setShowIncomeDatePicker(false);
    if (selectedDate) {
      setIncomeForm({
        ...incomeForm,
        date: selectedDate.toISOString().split('T')[0]
      });
    }
  }, [incomeForm]);

  // Data calculations
  const currentMonthExpenses = useMemo(() => {
    const filtered = localExpenses.filter(expense => expense.date.startsWith(viewingMonth));
    console.log('Debug - Current month expenses updated:', {
      viewingMonth,
      allExpenses: localExpenses.length,
      currentMonthExpenses: filtered.length,
      savingsInCurrentMonth: filtered.filter(e => e.category === 'Savings').length,
      expensesData: localExpenses,
      filteredData: filtered,
      forceRefresh
    });
    return filtered;
  }, [localExpenses, viewingMonth, forceRefresh]);
  
  const currentMonthIncome = useMemo(() => 
    income.filter(incomeItem => incomeItem.date.startsWith(viewingMonth)), [income, viewingMonth]);

  // Filter out savings from expenses for calculations
  const actualExpenses = useMemo(() => 
    currentMonthExpenses.filter(expense => expense.category !== 'Savings'), 
    [currentMonthExpenses]
  );
  
  const totalSpent = useMemo(() => calculateTotalAmount(actualExpenses), [actualExpenses]);
  const totalIncome = useMemo(() => calculateTotalAmount(currentMonthIncome), [currentMonthIncome]);
  // Goals Wallet: Sum of Savings expenses feeds the wallet; allocations subtract.
  const totalSavings = useMemo(() => {
    const savingsExpensesAllTime = expenses.filter(expense => expense.category === 'Savings');
    const total = calculateTotalAmount(savingsExpensesAllTime);
    console.log('Debug - Wallet calculation updated (all-time savings):', {
      allExpenses: expenses.length,
      savingsExpenses: savingsExpensesAllTime.length,
      totalSavings: total,
      viewingMonth,
      forceRefresh,
      refreshKey,
      manualRefresh
    });
    return total;
  }, [expenses, viewingMonth, forceRefresh, refreshKey, manualRefresh]);

  // Sum of amounts already allocated to goals
  const allocatedSavings = useMemo(() => {
    return savings.reduce((total, saving) => {
      return saving.allocatedToGoal ? total + saving.amount : total;
    }, 0);
  }, [savings, forceRefresh, refreshKey, manualRefresh]);

  // Wallet balance = totalSavings (this month) - allocatedSavings (all-time tracked)
  const unallocatedSavings = useMemo(() => {
    return Math.max(0, totalSavings - allocatedSavings);
  }, [totalSavings, allocatedSavings, forceRefresh, refreshKey, manualRefresh]);
  const netAmount = useMemo(() => totalIncome - totalSpent, [totalIncome, totalSpent]);

  const categoryTotals = useMemo(() => calculateCategoryBreakdown(actualExpenses), [actualExpenses]);

  const projectionData = useMemo(() => {
    // Only calculate projections for the current month
    if (viewingMonth !== getCurrentMonth()) {
      return {
        projectedSpending: 0,
        projectedIncome: 0,
        projectedNet: 0,
        avgDailySpending: 0,
        daysPassed: 0,
        daysRemaining: 0,
        daysInMonth: 0
      };
    }
    
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = today.getDate();
    const daysRemaining = daysInMonth - daysPassed;
    const avgDailySpending = daysPassed > 0 ? totalSpent / daysPassed : 0;
    
    const projectedSpending = calculateMonthlyProjection(totalSpent, daysInMonth);
    const projectedIncome = calculateMonthlyProjection(totalIncome, daysInMonth);
    
    // For more realistic projections, let's also consider a simple ratio-based projection
    const spendingRatio = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const incomeRatio = daysPassed > 0 ? totalIncome / daysPassed : 0;
    const simpleProjectedSpending = spendingRatio * daysInMonth;
    const simpleProjectedIncome = incomeRatio * daysInMonth;
    const simpleProjectedNet = simpleProjectedIncome - simpleProjectedSpending;
    
    // Use the more conservative projection (the one that's closer to current values)
    let projectedNet = Math.abs(projectedIncome - projectedSpending) < Math.abs(simpleProjectedNet) 
      ? projectedIncome - projectedSpending 
      : simpleProjectedNet;
    
    // For better visibility: if the projection is very close to 0, make it more meaningful
    if (Math.abs(projectedNet) < 10) {
      projectedNet = totalSpent > totalIncome ? -200 : 200;
    }
    
    return {
      projectedSpending,
      projectedIncome,
      projectedNet,
      avgDailySpending,
      daysPassed,
      daysRemaining,
      daysInMonth
    };
  }, [totalSpent, totalIncome, viewingMonth]);

  // Render functions
  const renderExpenseItem = useCallback(({ item }: { item: Expense }) => (
    <TransactionItem
      item={item}
      type="expense"
      onDelete={(id) => handleDeletePress(id, 'expense', item.description)}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
    />
  ), [fadeAnim, slideAnim, handleDeletePress]);

  const renderIncomeItem = useCallback(({ item }: { item: Income }) => (
    <TransactionItem
      item={item}
      type="income"
      onDelete={(id) => handleDeletePress(id, 'income', item.description)}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
    />
  ), [fadeAnim, slideAnim, handleDeletePress]);

  const renderCategoryBreakdown = useMemo(() => (
    <CategoryBreakdown
      categoryTotals={categoryTotals}
      totalSpent={totalSpent}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
    />
  ), [categoryTotals, totalSpent, fadeAnim, slideAnim]);

  // Category Screen Component
  const CategoryScreen = useCallback(() => (
    <ScrollView 
      style={styles.screenContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
    >
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Spending by Category</Text>
        <Text style={styles.screenSubtitle}>Analyze your spending patterns</Text>
        
        {/* Summary Card */}
        {totalSpent > 0 && (
          <View style={styles.categorySummaryCard}>
            <LinearGradient
              colors={['rgba(108, 92, 231, 0.2)', 'rgba(162, 155, 254, 0.1)']}
              style={styles.categorySummaryGradient}
            >
              <View style={styles.categorySummaryContent}>
                <View style={styles.categorySummaryLeft}>
                  <Ionicons name="pie-chart" size={24} color="#a29bfe" />
                  <Text style={styles.categorySummaryTitle}>Total Spent</Text>
                </View>
                <Text style={styles.categorySummaryAmount}>${totalSpent.toFixed(2)}</Text>
              </View>
            </LinearGradient>
          </View>
        )}
      </View>
      
      <View style={styles.categoryScreenContent}>
        {totalSpent === 0 ? (
          <LinearGradient
            colors={['rgba(100, 116, 139, 0.2)', 'rgba(71, 85, 105, 0.1)']}
            style={styles.emptyCategoryGradient}
          >
            <View style={styles.emptyCategoryIconContainer}>
              <Ionicons name="pie-chart-outline" size={80} color="#64748b" />
            </View>
            <Text style={styles.emptyCategoryText}>
              Add some expenses to see your spending breakdown
            </Text>
            <Text style={styles.emptyCategorySubtext}>
              Start tracking your expenses to get insights into your spending habits
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.categoryBreakdownContainer}>
            <Text style={styles.categoryBreakdownTitle}>Category Breakdown</Text>
            {renderCategoryBreakdown}
          </View>
        )}
      </View>
    </ScrollView>
  ), [totalSpent, renderCategoryBreakdown]);

  // Goals Screen Component
  const GoalsScreen = useCallback(() => {
    const completedGoals = goals.filter(goal => goal.isCompleted);
    const activeGoals = goals.filter(goal => !goal.isCompleted);
    const totalProgress = goals.reduce((sum, goal) => sum + (goal.currentAmount / goal.targetAmount), 0);
    const averageProgress = goals.length > 0 ? (totalProgress / goals.length) * 100 : 0;

    const renderGoalCard = (goal: FinancialGoal) => {
      const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
      const isCompleted = goal.isCompleted;
      
      return (
        <TouchableOpacity
          key={goal.id}
          style={styles.modernGoalCard}
          onPress={() => {
            setEditingGoal(goal);
            setGoalForm({
              title: goal.title,
              description: goal.description,
              targetAmount: goal.targetAmount.toString(),
              category: goal.category,
              targetDate: goal.targetDate || '',
              color: goal.color,
              icon: goal.icon
            });
            setShowGoalModal(true);
          }}
          onLongPress={() => {
            setDeleteItem({ id: goal.id, type: 'goal' as any, description: goal.title });
            setShowDeleteConfirm(true);
          }}
        >
          <LinearGradient
            colors={[`${goal.color}20`, `${goal.color}10`]}
            style={styles.modernGoalCardGradient}
          >
            <View style={styles.modernGoalCardHeader}>
              <View style={styles.modernGoalCardIconContainer}>
                <Ionicons 
                  name={goal.icon} 
                  size={24} 
                  color={goal.color} 
                />
              </View>
              <View style={styles.modernGoalCardTitleContainer}>
                <Text style={styles.modernGoalCardTitle}>{goal.title}</Text>
                <Text style={styles.modernGoalCardCategory}>
                  {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                </Text>
              </View>
              {isCompleted && (
                <View style={styles.modernGoalCompletedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                </View>
              )}
            </View>

            <Text style={styles.modernGoalCardDescription}>
              {goal.description}
            </Text>

            <View style={styles.modernGoalProgressContainer}>
              <View style={styles.modernGoalProgressHeader}>
                <Text style={styles.modernGoalProgressLabel}>Progress</Text>
                <Text style={styles.modernGoalProgressPercentage}>
                  {progress.toFixed(1)}%
                </Text>
              </View>
              
              <View style={styles.modernGoalProgressBar}>
                <LinearGradient
                  colors={[goal.color, `${goal.color}CC`]}
                  style={[
                    styles.modernGoalProgressFill, 
                    { width: `${progress}%` }
                  ]}
                />
              </View>
              
              <View style={styles.modernGoalAmountContainer}>
                <Text style={styles.modernGoalCurrentAmount}>
                  ${goal.currentAmount.toFixed(2)}
                </Text>
                <Text style={styles.modernGoalTargetAmount}>
                  / ${goal.targetAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            {goal.targetDate && (
              <View style={styles.modernGoalDateContainer}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <Text style={styles.modernGoalDateText}>
                  Target: {new Date(goal.targetDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            {/* Goal Actions */}
            <View style={styles.modernGoalActions}>
              {!isCompleted && (
                <TouchableOpacity
                  style={styles.modernGoalCompleteButton}
                  onPress={async () => {
                    const requiredAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
                    if (requiredAmount === 0) {
                      // Already fully funded; mark complete
                      const updatedGoal = { ...goal, isCompleted: true, currentAmount: goal.targetAmount };
                      const updatedGoals = goals.map(g => g.id === goal.id ? updatedGoal : g);
                      setGoals(updatedGoals);
                      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));
                      triggerGoalCelebration(updatedGoal);
                      return;
                    }

                    if (unallocatedSavings < requiredAmount) {
                      Alert.alert(
                        'Insufficient Wallet Balance',
                        `You need $${(requiredAmount - unallocatedSavings).toFixed(2)} more in your goals wallet to complete this goal. Add a Savings expense to fund it.`,
                      );
                      return;
                    }

                    // Deduct from wallet by recording an allocation entry and update goal progress
                    await allocateSavingsToGoal(goal.id, requiredAmount);

                    const updatedGoal = { ...goal, isCompleted: true, currentAmount: goal.targetAmount };
                    const updatedGoals = goals.map(g => g.id === goal.id ? updatedGoal : g);
                    setGoals(updatedGoals);
                    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));
                    triggerGoalCelebration(updatedGoal);
                  }}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.modernGoalCompleteButtonGradient}
                  >
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                    <Text style={styles.modernGoalCompleteButtonText}>Mark Complete</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    };

    return (
    <ScrollView 
      style={styles.screenContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
    >
      <View style={styles.screenHeader}>
          <View style={styles.goalsHeaderTop}>
            <View>
        <Text style={styles.screenTitle}>Financial Goals</Text>
        <Text style={styles.screenSubtitle}>Set and track your money goals</Text>
            </View>
            <TouchableOpacity
              style={styles.addGoalButton}
              onPress={() => {
                setEditingGoal(null);
                setGoalForm(DEFAULT_FORM_VALUES.GOAL);
                setShowGoalModal(true);
              }}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.addGoalButtonGradient}
              >
                <Ionicons name="add" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
      </View>
      
        {/* Goals Overview */}
        {goals.length > 0 && (
          <View style={styles.goalsOverviewContainer}>
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.goalsOverviewCard}
            >
              <View style={styles.goalsOverviewHeader}>
                <Ionicons name="trophy-outline" size={24} color="#6366f1" />
                <Text style={styles.goalsOverviewTitle}>Goals Overview</Text>
          </View>
              
              <View style={styles.goalsOverviewStats}>
                <View style={styles.goalsOverviewStat}>
                  <Text style={styles.goalsOverviewStatNumber}>{goals.length}</Text>
                  <Text style={styles.goalsOverviewStatLabel}>Total Goals</Text>
                </View>
                <View style={styles.goalsOverviewStat}>
                  <Text style={styles.goalsOverviewStatNumber}>{completedGoals.length}</Text>
                  <Text style={styles.goalsOverviewStatLabel}>Completed</Text>
                </View>
                <View style={styles.goalsOverviewStat}>
                  <Text style={styles.goalsOverviewStatNumber}>{averageProgress.toFixed(0)}%</Text>
                  <Text style={styles.goalsOverviewStatLabel}>Avg Progress</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Savings Instructions */}
        {totalSavings === 0 && goals.length > 0 && (
          <View style={styles.savingsInstructionsContainer}>
              <LinearGradient
              colors={['rgba(100, 116, 139, 0.2)', 'rgba(71, 85, 105, 0.1)']}
              style={styles.savingsInstructionsCard}
            >
              <View style={styles.savingsInstructionsHeader}>
                <Ionicons name="information-circle-outline" size={24} color="#64748b" />
                <Text style={styles.savingsInstructionsTitle}>How to Add Savings</Text>
            </View>
              <Text style={styles.savingsInstructionsText}>
                1. Go to the "Add" tab{'\n'}
                2. Select "Savings" as the category{'\n'}
                3. Enter the amount you want to save{'\n'}
                4. Come back here to allocate to your goals
              </Text>
              
              {/* Debug Info */}
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>
                  Debug: Total Savings: ${totalSavings.toFixed(2)}
                </Text>
                <Text style={styles.debugText}>
                  Debug: Allocated: ${allocatedSavings.toFixed(2)}
                </Text>
                <Text style={styles.debugText}>
                  Debug: Available: ${unallocatedSavings.toFixed(2)}
                </Text>
                <Text style={styles.debugText}>
                  Debug: Current Month: {viewingMonth}
                </Text>
                <Text style={styles.debugText}>
                  Debug: Savings Expenses: {currentMonthExpenses.filter(e => e.category === 'Savings').length}
                </Text>
                <Text style={styles.debugText}>
                  Debug: All Expenses: {currentMonthExpenses.length}
            </Text>
          </View>
        </LinearGradient>
          </View>
        )}

        {/* Goals Wallet Section - always visible */}
        <View style={styles.savingsSection}>
        <LinearGradient
              colors={['rgba(0, 184, 148, 0.2)', 'rgba(0, 160, 133, 0.1)']}
              style={styles.savingsCard}
            >
              <View style={styles.savingsHeader}>
                <Ionicons name="wallet-outline" size={24} color="#00b894" />
                <Text style={styles.savingsTitle}>Goals Wallet</Text>
          </View>
              
              <View style={styles.savingsContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.savingsAmount}>${unallocatedSavings.toFixed(2)}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      // Recalculate direct total savings from current expenses
                      // Refresh keys are still useful to force memo recalcs; wallet derives from state
                      const currentSavings = unallocatedSavings;
                      setDirectTotalSavings(currentSavings);
                      setRefreshKey(prev => prev + 1);
                      setForceRefresh(prev => prev + 1);
                      setManualRefresh(prev => prev + 1);
                      console.log('Debug - Manual refresh triggered', { 
                        refreshKey: refreshKey + 1, 
                        forceRefresh: forceRefresh + 1, 
                        manualRefresh: manualRefresh + 1,
                        directTotalSavings: currentSavings
                      });
                    }}
                    style={{ 
                      backgroundColor: '#00b894', 
                      padding: 8, 
                      borderRadius: 6,
                      marginLeft: 10
                    }}
                  >
                    <Ionicons name="refresh" size={16} color="white" />
                  </TouchableOpacity>
                </View>
                
                {/* Debug Info */}
                <View style={styles.debugInfo}>
                  <Text style={styles.debugText}>
                    Debug: Wallet: ${unallocatedSavings.toFixed(2)} | Calculated(month savings): ${totalSavings.toFixed(2)} | Direct: ${directTotalSavings.toFixed(2)}
          </Text>
                  <Text style={styles.debugText}>
                    Debug: Month: {viewingMonth} | Savings Count: {currentMonthExpenses.filter(e => e.category === 'Savings').length}
                  </Text>
                                  <Text style={styles.debugText}>
                  Debug: All Expenses: {currentMonthExpenses.length} | Total Expenses: {localExpenses.length}
                </Text>
                </View>
                
                {/* Savings Progress Bar */}
                <View style={styles.savingsProgressContainer}>
                  <View style={styles.savingsProgressBar}>
              <LinearGradient
                      colors={['#00b894', '#00a085']}
                      style={[
                        styles.savingsProgressFill, 
                        { width: `${totalSavings > 0 ? (allocatedSavings / (allocatedSavings + unallocatedSavings)) * 100 : 0}%` }
                      ]}
              />
            </View>
                  <View style={styles.savingsProgressLabels}>
                    <View style={styles.savingsProgressLabel}>
                      <View style={[styles.savingsProgressDot, { backgroundColor: '#00b894' }]} />
                      <Text style={styles.savingsProgressText}>
                        Allocated: ${allocatedSavings.toFixed(2)}
            </Text>
          </View>
                    <View style={styles.savingsProgressLabel}>
                      <View style={[styles.savingsProgressDot, { backgroundColor: '#64748b' }]} />
                      <Text style={styles.savingsProgressText}>
                        Wallet: ${unallocatedSavings.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Always show allocate button when there are savings */}
                <TouchableOpacity
                  style={[
                    styles.allocateSavingsButton,
                    unallocatedSavings <= 0 && styles.allocateSavingsButtonDisabled
                  ]}
                  onPress={() => setShowSavingsAllocationModal(true)}
                  disabled={unallocatedSavings <= 0}
                >
        <LinearGradient
                    colors={unallocatedSavings > 0 ? ['#00b894', '#00a085'] : ['#64748b', '#475569']}
                    style={styles.allocateSavingsButtonGradient}
                  >
                    <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                    <Text style={styles.allocateSavingsButtonText}>
                      {unallocatedSavings > 0 ? 'Allocate to Goals' : 'Wallet Empty'}
          </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <View style={styles.goalsSection}>
            <Text style={styles.goalsSectionTitle}>Active Goals</Text>
            {activeGoals.map(renderGoalCard)}
          </View>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <View style={styles.goalsSection}>
            <Text style={styles.goalsSectionTitle}>Completed Goals</Text>
            {completedGoals.map(renderGoalCard)}
          </View>
        )}

        {/* Empty State */}
        {goals.length === 0 && (
          <View style={styles.goalsEmptyContainer}>
              <LinearGradient
              colors={['rgba(100, 116, 139, 0.2)', 'rgba(71, 85, 105, 0.1)']}
              style={styles.goalsEmptyGradient}
            >
              <View style={styles.goalsEmptyIconContainer}>
                <Ionicons name="flag-outline" size={80} color="#64748b" />
            </View>
              <Text style={styles.goalsEmptyTitle}>No Goals Yet</Text>
              <Text style={styles.goalsEmptyText}>
                Create your first financial goal to start tracking your progress
            </Text>
              <TouchableOpacity
                style={styles.goalsEmptyButton}
                onPress={() => {
                  setEditingGoal(null);
                  setGoalForm(DEFAULT_FORM_VALUES.GOAL);
                  setShowGoalModal(true);
                }}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.goalsEmptyButtonGradient}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                  <Text style={styles.goalsEmptyButtonText}>Create Goal</Text>
                </LinearGradient>
              </TouchableOpacity>
        </LinearGradient>
      </View>
        )}
    </ScrollView>
    );
  }, [
    goals,
    unallocatedSavings,
    allocatedSavings,
    totalSavings,
    viewingMonth,
    currentMonthExpenses,
    localExpenses,
    refreshKey,
    forceRefresh,
    manualRefresh
  ]);

  // Transactions Screen Component
  const TransactionsScreen = useCallback(() => {
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sortedIncome = [...income].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <View style={styles.screenContainer}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Recent Transactions</Text>
          <Text style={styles.screenSubtitle}>Track your income and expenses</Text>
        </View>
        
        <View style={styles.transactionsScreenContent}>
          <View style={styles.transactionTabsWrapper}>
            <TouchableOpacity
              style={[
                styles.modernTransactionTab,
                transactionViewTab === 'expense' && styles.modernTransactionTabActive
              ]}
              onPress={() => setTransactionViewTab('expense')}
            >
              {transactionViewTab === 'expense' && (
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modernTabActiveGradient}
                />
              )}
              <View style={styles.tabContentContainer}>
                <View style={styles.tabIconContainer}>
                  <Ionicons 
                    name="trending-down" 
                    size={16} 
                    color={transactionViewTab === 'expense' ? '#ffffff' : '#ef4444'} 
                  />
                </View>
                <Text style={[
                  styles.modernTabText,
                  transactionViewTab === 'expense' && styles.modernTabTextActive
                ]}>
                  Expenses
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modernTransactionTab,
                transactionViewTab === 'income' && styles.modernTransactionTabActive
              ]}
              onPress={() => setTransactionViewTab('income')}
            >
              {transactionViewTab === 'income' && (
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.modernTabActiveGradient}
                />
              )}
              <View style={styles.tabContentContainer}>
                <View style={styles.tabIconContainer}>
                  <Ionicons 
                    name="trending-up" 
                    size={16} 
                    color={transactionViewTab === 'income' ? '#ffffff' : '#10b981'} 
                  />
                </View>
                <Text style={[
                  styles.modernTabText,
                  transactionViewTab === 'income' && styles.modernTabTextActive
                ]}>
                  Income
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {transactionViewTab === 'expense' ? (
              sortedExpenses.length === 0 ? (
                <View style={styles.emptyState}>
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)']}
                    style={styles.emptyStateGradient}
                  >
                    <Ionicons name="trending-down-outline" size={64} color="#ef4444" />
                    <Text style={styles.emptyStateText}>No expenses recorded yet</Text>
                    <Text style={styles.emptyStateSubtext}>Add your first expense above</Text>
                  </LinearGradient>
                </View>
              ) : (
                <FlatList
                  data={sortedExpenses}
                  renderItem={renderExpenseItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={false}
                  style={styles.nestedFlatList}
                  contentContainerStyle={styles.nestedFlatListContent}
                />
              )
            ) : (
              sortedIncome.length === 0 ? (
                <View style={styles.emptyState}>
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)']}
                    style={styles.emptyStateGradient}
                  >
                    <Ionicons name="trending-up-outline" size={64} color="#10b981" />
                    <Text style={styles.emptyStateText}>No income recorded yet</Text>
                    <Text style={styles.emptyStateSubtext}>Add your first income entry above</Text>
                  </LinearGradient>
                </View>
              ) : (
                <FlatList
                  data={sortedIncome}
                  renderItem={renderIncomeItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={false}
                  style={styles.nestedFlatList}
                  contentContainerStyle={styles.nestedFlatListContent}
                />
              )
            )}
          </View>
        </View>
      </View>
    );
  }, [expenses, income, transactionViewTab, renderExpenseItem, renderIncomeItem]);

  // Stats Screen Component
  const StatsScreen = useCallback(() => {
    // Use the component-level projectionData for consistency

    const renderStatsCard = useCallback(({ title, amount, icon, gradient, isProjection = false, showInfo = false, onInfoPress }: any) => (
      <Animated.View 
        style={[
          styles.statsCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsCardGradient}
        >
          <View style={styles.statsCardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={24} color="#ffffff" />
            </View>
            <View style={styles.statsCardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.statsCardTitle}>{title}</Text>
                {showInfo && (
                  <TouchableOpacity onPress={onInfoPress} style={styles.infoButton}>
                    <Ionicons name="information-circle" size={16} color="rgba(255, 255, 255, 0.7)" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.statsCardAmount}>
                ${Math.abs(amount).toFixed(2)}
              </Text>
              {isProjection && (
                <Text style={styles.projectionLabel}>Projected</Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    ), [fadeAnim, slideAnim]);

    return (
      <ScrollView 
        style={styles.screenContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Monthly Stats</Text>
          <Text style={styles.screenSubtitle}>Financial overview and insights</Text>
        </View>
        
        <View style={styles.statsScreenContent}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {renderStatsCard({
              title: 'Total Income',
              amount: totalIncome,
              icon: 'trending-up',
              gradient: ['#10b981', '#059669']
            })}
            {renderStatsCard({
              title: 'Total Spent',
              amount: totalSpent,
              icon: 'trending-down',
              gradient: ['#ef4444', '#dc2626']
            })}
            {totalSavings > 0 && renderStatsCard({
              title: 'Total Savings',
              amount: totalSavings,
              icon: 'wallet',
              gradient: ['#00b894', '#00a085']
            })}
            {renderStatsCard({
              title: 'Net Amount',
              amount: netAmount,
              icon: 'wallet',
              gradient: netAmount >= 0 ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']
            })}
            {viewingMonth === getCurrentMonth() && (() => {
              const isPositive = projectionData.projectedNet >= 0;
              const gradient = isPositive ? ['#10b981', '#059669'] : ['#f59e0b', '#d97706'];
              
              return renderStatsCard({
                title: 'Month Projection',
                amount: projectionData.projectedNet,
                icon: 'calendar',
                gradient,
                showInfo: true,
                onInfoPress: () => setShowProjectionInfo(true)
              });
            })()}
            
            {/* Monthly Actions */}
            {viewingMonth === getCurrentMonth() && (
              <TouchableOpacity 
                style={styles.monthlyReportButton}
                onPress={() => setShowMonthlyReport(true)}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.monthlyReportGradient}
                >
                  <Ionicons name="analytics-outline" size={20} color="#ffffff" />
                  <Text style={styles.monthlyReportText}>Monthly Report</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Monthly Overview - Only show for current month */}
          {viewingMonth === getCurrentMonth() && (
          <View style={styles.overviewContainer}>
            <LinearGradient
              colors={['rgba(26, 26, 46, 0.9)', 'rgba(22, 33, 62, 0.9)']}
              style={styles.overviewGradient}
            >
              <Text style={styles.sectionTitle}>
                <Ionicons name="analytics-outline" size={24} color="#ffffff" /> Monthly Financial Overview
              </Text>
              <View style={styles.overviewContent}>
                <View style={styles.overviewLeft}>
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewLabel}>Daily Average Spending</Text>
                    <Text style={styles.overviewValue}>${projectionData.avgDailySpending.toFixed(2)}</Text>
                  </View>
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewLabel}>Days Passed / Total Days</Text>
                    <Text style={styles.overviewValue}>{projectionData.daysPassed} / {projectionData.daysInMonth}</Text>
                  </View>
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewLabel}>Projected Monthly Spending</Text>
                    <Text style={[styles.overviewValue, { color: '#ef4444' }]}>
                      ${projectionData.projectedSpending.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <LinearGradient
                  colors={projectionData.projectedNet >= 0 ? ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)'] : ['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)']}
                  style={styles.overviewRight}
                >
                  <View style={styles.overviewStatus}>
                    <Ionicons
                      name={projectionData.projectedNet >= 0 ? 'trending-up' : 'trending-down'}
                      size={24}
                      color={projectionData.projectedNet >= 0 ? '#10b981' : '#ef4444'}
                    />
                    <Text style={[
                      styles.overviewStatusText,
                      { color: projectionData.projectedNet >= 0 ? '#10b981' : '#ef4444' }
                    ]}>
                      {projectionData.projectedNet >= 0 ? 'On Track for Profit' : 'Warning: Potential Loss'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.overviewStatusDescription,
                    { color: projectionData.projectedNet >= 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {projectionData.projectedNet >= 0 
                      ? `You're spending wisely! At this rate, you'll save $${projectionData.projectedNet.toFixed(2)} this month.`
                      : `You're overspending! Consider reducing daily expenses by $${Math.abs(projectionData.projectedNet / projectionData.daysRemaining).toFixed(2)} per day.`
                    }
                  </Text>
                </LinearGradient>
              </View>
            </LinearGradient>
          </View>
          )}
        </View>
      </ScrollView>
    );
  }, [totalIncome, totalSpent, netAmount, viewingMonth, fadeAnim, slideAnim, setShowProjectionInfo]);

  // Render current screen based on active bottom tab
  const renderCurrentScreen = useCallback(() => {
    const currentFormData = activeTab === 'expense' ? formData : incomeForm;
    const isValid = validateFormData(currentFormData);

    switch (activeBottomTab) {
      case 'category':
        return <CategoryScreen />;
      case 'transactions':
        return <TransactionsScreen />;
      case 'add':
        return (
          <ScrollView 
            style={styles.screenContainer} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            scrollEnabled={!showCategoryPicker && !showSourcePicker}
          >
            <View style={styles.screenHeader}>
              <Text style={styles.screenTitle}>Add Transaction</Text>
              <Text style={styles.screenSubtitle}>Track your money flow</Text>
            </View>
            
            <View style={styles.addTransactionContent}>
              <View style={styles.modernTabContainer}>
                <TouchableOpacity
                  style={[
                    styles.modernTab,
                    activeTab === 'expense' && styles.modernTabActive
                  ]}
                  onPress={() => setActiveTab('expense')}
                >
                  <LinearGradient
                    colors={activeTab === 'expense' ? ['#ef4444', '#dc2626'] : ['transparent', 'transparent']}
                    style={styles.modernTabGradient}
                  >
                    <Ionicons 
                      name="remove-circle-outline" 
                      size={20} 
                      color={activeTab === 'expense' ? '#ffffff' : '#94a3b8'} 
                    />
                    <Text style={[
                      styles.modernTabText,
                      activeTab === 'expense' && styles.modernTabTextActive
                    ]}>
                      Expense
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modernTab,
                    activeTab === 'income' && styles.modernTabActive
                  ]}
                  onPress={() => setActiveTab('income')}
                >
                  <LinearGradient
                    colors={activeTab === 'income' ? ['#10b981', '#059669'] : ['transparent', 'transparent']}
                    style={styles.modernTabGradient}
                  >
                    <Ionicons 
                      name="add-circle-outline" 
                      size={20} 
                      color={activeTab === 'income' ? '#ffffff' : '#94a3b8'} 
                    />
                    <Text style={[
                      styles.modernTabText,
                      activeTab === 'income' && styles.modernTabTextActive
                    ]}>
                      Income
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <Animated.View 
                style={[
                  styles.formContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      ref={amountInputRef}
                      style={styles.amountInput}
                      value={currentFormData.amount}
                      onChangeText={handleAmountChange}
                      placeholder="0.00"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      keyboardType="numeric"
                      returnKeyType="next"
                      onSubmitEditing={() => noteInputRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Category/Source Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {activeTab === 'expense' ? 'Category' : 'Source'}
                  </Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      if (activeTab === 'expense') {
                        setShowCategoryPicker(true);
                      } else {
                        setShowSourcePicker(true);
                      }
                    }}
                  >
                    <Text style={styles.pickerButtonText}>
                      {activeTab === 'expense' ? formData.category : incomeForm.source}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Date Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      if (activeTab === 'expense') {
                        setShowExpenseDatePicker(true);
                      } else {
                        setShowIncomeDatePicker(true);
                      }
                    }}
                  >
                    <Text style={styles.pickerButtonText}>
                      {new Date(currentFormData.date).toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Description Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description (Optional)</Text>
                  <TextInput
                    ref={noteInputRef}
                    style={styles.descriptionInput}
                    value={currentFormData.description}
                    onChangeText={handleDescriptionChange}
                    placeholder="Add a note..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
                  onPress={activeTab === 'expense' ? handleExpenseSubmit : handleIncomeSubmit}
                  disabled={!isValid}
                >
                  <LinearGradient
                    colors={activeTab === 'expense' ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
                    style={styles.submitButtonGradient}
                  >
                    <Ionicons 
                      name={activeTab === 'expense' ? 'remove-circle' : 'add-circle'} 
                      size={24} 
                      color="#ffffff" 
                    />
                    <Text style={styles.submitButtonText}>
                      Add {activeTab === 'expense' ? 'Expense' : 'Income'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Date Pickers */}
            {showExpenseDatePicker && (
              <DateTimePicker
                value={new Date(formData.date)}
                mode="date"
                display="default"
                onChange={handleExpenseDateChange}
              />
            )}
            
            {showIncomeDatePicker && (
              <DateTimePicker
                value={new Date(incomeForm.date)}
                mode="date"
                display="default"
                onChange={handleIncomeDateChange}
              />
            )}

            {/* Category Picker Modal */}
            <PickerModal
              visible={showCategoryPicker}
              items={EXPENSE_CATEGORIES}
              selectedValue={formData.category}
              onSelect={(category) => setFormData({ ...formData, category })}
              onClose={() => setShowCategoryPicker(false)}
              title="Select Category"
              fadeAnim={fadeAnim}
            />

            {/* Source Picker Modal */}
            <PickerModal
              visible={showSourcePicker}
              items={INCOME_SOURCES}
              selectedValue={incomeForm.source}
              onSelect={(source) => setIncomeForm({ ...incomeForm, source })}
              onClose={() => setShowSourcePicker(false)}
              title="Select Source"
              fadeAnim={fadeAnim}
            />



          </ScrollView>
        );

      case 'transactions':
        const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const sortedIncome = [...income].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Transactions</Text>
              <Text style={styles.headerSubtitle}>View your spending and income</Text>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  transactionViewTab === 'expense' && styles.tabActive
                ]}
                onPress={() => setTransactionViewTab('expense')}
              >
                <LinearGradient
                  colors={transactionViewTab === 'expense' ? ['#ef4444', '#dc2626'] : ['transparent', 'transparent']}
                  style={styles.tabGradient}
                >
                  <Ionicons 
                    name="remove-circle-outline" 
                    size={20} 
                    color={transactionViewTab === 'expense' ? '#ffffff' : '#94a3b8'} 
                  />
                  <Text style={[
                    styles.tabText,
                    transactionViewTab === 'expense' && styles.tabTextActive
                  ]}>
                    Expenses ({expenses.length})
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  transactionViewTab === 'income' && styles.tabActive
                ]}
                onPress={() => setTransactionViewTab('income')}
              >
                <LinearGradient
                  colors={transactionViewTab === 'income' ? ['#10b981', '#059669'] : ['transparent', 'transparent']}
                  style={styles.tabGradient}
                >
                  <Ionicons 
                    name="add-circle-outline" 
                    size={20} 
                    color={transactionViewTab === 'income' ? '#ffffff' : '#94a3b8'} 
                  />
                  <Text style={[
                    styles.tabText,
                    transactionViewTab === 'income' && styles.tabTextActive
                  ]}>
                    Income ({income.length})
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Transactions List */}
            {transactionViewTab === 'expense' ? (
              <FlatList
                data={sortedExpenses}
                renderItem={renderExpenseItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#ffffff"
                    colors={['#6366f1']}
                  />
                }
              />
            ) : (
              <FlatList
                data={sortedIncome}
                renderItem={renderIncomeItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#ffffff"
                    colors={['#6366f1']}
                  />
                }
              />
            )}
          </View>
        );

      case 'stats':
        return <StatsScreen />;

      case 'goals':
        return <GoalsScreen key={`goals-${refreshKey}-${forceRefresh}-${manualRefresh}`} />;

      default:
        return <CategoryScreen />;
    }
  }, [
    activeBottomTab,
    activeTab,
    formData,
    incomeForm,
    showCategoryPicker,
    showSourcePicker,
    showExpenseDatePicker,
    showIncomeDatePicker,
    expenses,
    income,
    transactionViewTab,
    refreshing,
    totalSpent,
    totalIncome,
    netAmount,
    projectionData,
    categoryTotals,
    showProjectionInfo,
    handleExpenseSubmit,
    handleIncomeSubmit,
    handleAmountChange,
    handleDescriptionChange,
    handleExpenseDateChange,
    handleIncomeDateChange,
    renderExpenseItem,
    renderIncomeItem,
    renderCategoryBreakdown,
    onRefresh,
    fadeAnim,
    slideAnim,
    viewingMonth
  ]);

  // Bottom Navigation Component
  const BottomNavigation = useCallback(() => (
    <Animated.View 
      style={[
        styles.bottomNavigation,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(26, 26, 46, 0.95)', 'rgba(22, 33, 62, 0.95)']}
        style={styles.bottomNavigationGradient}
      >
        <TouchableOpacity
          style={[styles.bottomTab, activeBottomTab === 'category' && styles.bottomTabActive]}
          onPress={() => setActiveBottomTab('category')}
        >
          <Ionicons 
            name="pie-chart-outline" 
            size={24} 
            color={activeBottomTab === 'category' ? '#6366f1' : '#64748b'} 
          />
          <Text style={[styles.bottomTabText, activeBottomTab === 'category' && styles.bottomTabTextActive]}>
            Category
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, activeBottomTab === 'transactions' && styles.bottomTabActive]}
          onPress={() => setActiveBottomTab('transactions')}
        >
          <Ionicons 
            name="list-outline" 
            size={24} 
            color={activeBottomTab === 'transactions' ? '#6366f1' : '#64748b'} 
          />
          <Text style={[styles.bottomTabText, activeBottomTab === 'transactions' && styles.bottomTabTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, activeBottomTab === 'add' && styles.bottomTabActive]}
          onPress={() => setActiveBottomTab('add')}
        >
          <View style={styles.centerTab}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.centerTabGradient}
            >
              <Ionicons name="add" size={32} color="#ffffff" />
            </LinearGradient>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, activeBottomTab === 'stats' && styles.bottomTabActive]}
          onPress={() => setActiveBottomTab('stats')}
        >
          <Ionicons 
            name="analytics-outline" 
            size={24} 
            color={activeBottomTab === 'stats' ? '#6366f1' : '#64748b'} 
          />
          <Text style={[styles.bottomTabText, activeBottomTab === 'stats' && styles.bottomTabTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, activeBottomTab === 'goals' && styles.bottomTabActive]}
          onPress={() => setActiveBottomTab('goals')}
        >
          <Ionicons 
            name="flag-outline" 
            size={24} 
            color={activeBottomTab === 'goals' ? '#6366f1' : '#64748b'} 
          />
          <Text style={[styles.bottomTabText, activeBottomTab === 'goals' && styles.bottomTabTextActive]}>
            Goals
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  ), [activeBottomTab, fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.headerContainer}>
            <View style={styles.headerTop}>
              <View style={styles.brandSection}>
                <View style={styles.iconWrapper}>
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.brandIcon}
                  >
                    <Ionicons name="wallet" size={20} color="#ffffff" />
                  </LinearGradient>
                </View>
                <View style={styles.brandText}>
                  <Text style={styles.brandTitle}>Spendly</Text>
                  <Text style={styles.brandTagline}>Your Money, Organized</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => openMonthPicker(setShowMonthPicker)}
                activeOpacity={0.7}
              >
                <View style={styles.dateButtonContent}>
                  <Ionicons name="calendar" size={14} color="#6366f1" />
                  <Text style={styles.dateButtonText}>
                    {formatMonthYear(viewingMonth)}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color="#6366f1" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {renderCurrentScreen()}
        </View>

        {/* Bottom Navigation */}
        <BottomNavigation />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          visible={showDeleteConfirm}
          item={deleteItem}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />

        {/* Goal Modal */}
        {showGoalModal && (
          <View style={styles.goalModalOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.goalModalBlur}>
              <View style={styles.goalModalContainer}>
                <LinearGradient
                  colors={['#1a1a2e', '#16213e']}
                  style={styles.goalModalContent}
                >
                  <View style={styles.goalModalHeader}>
                    <View style={styles.goalModalIconContainer}>
                      <Ionicons name="flag-outline" size={24} color="#6366f1" />
                    </View>
                    <Text style={styles.goalModalTitle}>
                      {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowGoalModal(false);
                        setEditingGoal(null);
                        setGoalForm(DEFAULT_FORM_VALUES.GOAL);
                      }}
                      style={styles.goalModalCloseButton}
                    >
                      <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.goalModalBody} showsVerticalScrollIndicator={false}>
                    {/* Goal Title */}
                    <View style={styles.goalFormField}>
                      <Text style={styles.goalFormLabel}>Goal Title</Text>
                      <TextInput
                        style={styles.goalFormInput}
                        value={goalForm.title}
                        onChangeText={(text) => setGoalForm({...goalForm, title: text})}
                        placeholder="Enter goal title"
                        placeholderTextColor="#64748b"
                      />
                    </View>

                    {/* Goal Description */}
                    <View style={styles.goalFormField}>
                      <Text style={styles.goalFormLabel}>Description</Text>
                      <TextInput
                        style={[styles.goalFormInput, styles.goalFormTextArea]}
                        value={goalForm.description}
                        onChangeText={(text) => setGoalForm({...goalForm, description: text})}
                        placeholder="Describe your goal"
                        placeholderTextColor="#64748b"
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    {/* Target Amount */}
                    <View style={styles.goalFormField}>
                      <Text style={styles.goalFormLabel}>Target Amount</Text>
                      <TextInput
                        style={styles.goalFormInput}
                        value={goalForm.targetAmount}
                        onChangeText={(text) => setGoalForm({...goalForm, targetAmount: text})}
                        placeholder="0.00"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Category Picker */}
                    <View style={styles.goalFormField}>
                      <Text style={styles.goalFormLabel}>Category</Text>
                      <TouchableOpacity 
                        style={styles.goalFormPicker}
                        onPress={() => setShowGoalCategoryPicker(true)}
                      >
                        <Text style={styles.goalFormPickerText}>
                          {goalForm.category.charAt(0).toUpperCase() + goalForm.category.slice(1)}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    {/* Color Picker */}
                    <View style={styles.goalFormField}>
                      <Text style={styles.goalFormLabel}>Color</Text>
                      <View style={styles.goalColorPicker}>
                        {GOAL_COLORS.map((color) => (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.goalColorOption,
                              { backgroundColor: color },
                              goalForm.color === color && styles.goalColorOptionSelected
                            ]}
                            onPress={() => setGoalForm({...goalForm, color})}
                          />
                        ))}
                      </View>
                    </View>

                    {/* Icon Picker */}
                    <View style={styles.goalFormField}>
                      <Text style={styles.goalFormLabel}>Icon</Text>
                      <View style={styles.goalIconPicker}>
                        {GOAL_ICONS.map((icon) => (
                          <TouchableOpacity
                            key={icon}
                            style={[
                              styles.goalIconOption,
                              goalForm.icon === icon && styles.goalIconOptionSelected
                            ]}
                            onPress={() => setGoalForm({...goalForm, icon})}
                          >
                            <Ionicons 
                              name={icon as any} 
                              size={24} 
                              color={goalForm.icon === icon ? '#ffffff' : '#64748b'} 
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Target Date */}
                    <View style={styles.goalFormField}>
                      <Text style={styles.goalFormLabel}>Target Date (Optional)</Text>
                      <TouchableOpacity 
                        style={styles.goalFormPicker}
                        onPress={() => setShowGoalDatePicker(true)}
                      >
                        <Text style={styles.goalFormPickerText}>
                          {goalForm.targetDate ? new Date(goalForm.targetDate).toLocaleDateString() : 'Select date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.goalModalActions}>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowGoalModal(false);
                        setEditingGoal(null);
                        setGoalForm(DEFAULT_FORM_VALUES.GOAL);
                      }}
                      style={styles.goalModalCancelButton}
                    >
                      <Text style={styles.goalModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => {
                        if (editingGoal) {
                          updateGoal(editingGoal.id, goalForm);
                        } else {
                          addGoal(goalForm);
                        }
                      }}
                      style={styles.goalModalSaveButton}
                    >
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        style={styles.goalModalSaveGradient}
                      >
                        <Text style={styles.goalModalSaveText}>
                          {editingGoal ? 'Update Goal' : 'Create Goal'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </BlurView>
          </View>
        )}

        {/* Goal Category Picker Modal */}
        <PickerModal
          visible={showGoalCategoryPicker}
          items={GOAL_CATEGORIES.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1))}
          onSelect={(category) => {
            setGoalForm({...goalForm, category: category.toLowerCase()});
            setShowGoalCategoryPicker(false);
          }}
          onClose={() => setShowGoalCategoryPicker(false)}
          title="Select Category"
          fadeAnim={fadeAnim}
        />

        {/* Goal Date Picker */}
        {showGoalDatePicker && (
          <DateTimePicker
            value={goalForm.targetDate ? new Date(goalForm.targetDate) : new Date()}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowGoalDatePicker(false);
              if (selectedDate) {
                setGoalForm({...goalForm, targetDate: selectedDate.toISOString().split('T')[0]});
              }
            }}
          />
        )}

        {/* Savings Allocation Modal */}
        {showSavingsAllocationModal && (
          <View style={styles.savingsAllocationModalOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.savingsAllocationModalBlur}>
              <View style={styles.savingsAllocationModalContainer}>
                <LinearGradient
                  colors={['#1a1a2e', '#16213e']}
                  style={styles.savingsAllocationModalContent}
                >
                  <View style={styles.savingsAllocationModalHeader}>
                    <View style={styles.savingsAllocationModalIconContainer}>
                      <Ionicons name="wallet-outline" size={24} color="#00b894" />
                    </View>
                    <Text style={styles.savingsAllocationModalTitle}>Allocate Savings</Text>
                    <TouchableOpacity 
                      onPress={() => setShowSavingsAllocationModal(false)}
                      style={styles.savingsAllocationModalCloseButton}
                    >
                      <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.savingsAllocationModalBody} showsVerticalScrollIndicator={false}>
                    <Text style={styles.savingsAllocationModalDescription}>
                      Allocate your available savings to specific goals:
                    </Text>
                    
                    {/* Amount Input */}
                    <View style={styles.allocationAmountContainer}>
                      <Text style={styles.allocationAmountLabel}>Amount to Allocate</Text>
                      <TextInput
                        style={styles.allocationAmountInput}
                        value={allocationAmount}
                        onChangeText={setAllocationAmount}
                        placeholder={`Max: $${unallocatedSavings.toFixed(2)}`}
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                      />
                      <Text style={styles.allocationAmountHelper}>
                        Available: ${unallocatedSavings.toFixed(2)}
                      </Text>
                    </View>
                    
                    {/* Goal Selection */}
                    <Text style={styles.allocationGoalSelectionTitle}>Select Goal:</Text>
                    {goals.filter(goal => !goal.isCompleted).map((goal: FinancialGoal) => (
                      <TouchableOpacity
                        key={goal.id}
                        style={[
                          styles.savingsAllocationGoalItem,
                          selectedGoalForAllocation?.id === goal.id && styles.savingsAllocationGoalItemSelected
                        ]}
                        onPress={() => setSelectedGoalForAllocation(goal)}
                      >
                        <LinearGradient
                          colors={[`${goal.color}20`, `${goal.color}10`]}
                          style={styles.savingsAllocationGoalItemGradient}
                        >
                          <View style={styles.savingsAllocationGoalItemHeader}>
                            <Ionicons name={goal.icon} size={24} color={goal.color} />
                            <View style={styles.savingsAllocationGoalItemInfo}>
                              <Text style={styles.savingsAllocationGoalItemTitle}>{goal.title}</Text>
                              <Text style={styles.savingsAllocationGoalItemProgress}>
                                ${goal.currentAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)}
                              </Text>
                              <Text style={styles.savingsAllocationGoalItemRemaining}>
                                Remaining: ${(goal.targetAmount - goal.currentAmount).toFixed(2)}
                              </Text>
                            </View>
                            {selectedGoalForAllocation?.id === goal.id && (
                              <Ionicons name="checkmark-circle" size={24} color="#00b894" />
                            )}
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Allocation Actions */}
                  <View style={styles.savingsAllocationModalActions}>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowSavingsAllocationModal(false);
                        setAllocationAmount('');
                        setSelectedGoalForAllocation(null);
                      }}
                      style={styles.savingsAllocationModalCancelButton}
                    >
                      <Text style={styles.savingsAllocationModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => {
                        if (selectedGoalForAllocation && allocationAmount && parseFloat(allocationAmount) > 0) {
                          const amount = Math.min(parseFloat(allocationAmount), unallocatedSavings);
                          allocateSavingsToGoal(selectedGoalForAllocation.id, amount);
                          setShowSavingsAllocationModal(false);
                          setAllocationAmount('');
                          setSelectedGoalForAllocation(null);
                        }
                      }}
                      style={[
                        styles.savingsAllocationModalConfirmButton,
                        (!selectedGoalForAllocation || !allocationAmount || parseFloat(allocationAmount) <= 0) && 
                        styles.savingsAllocationModalConfirmButtonDisabled
                      ]}
                      disabled={!selectedGoalForAllocation || !allocationAmount || parseFloat(allocationAmount) <= 0}
                    >
                      <LinearGradient
                        colors={['#00b894', '#00a085']}
                        style={styles.savingsAllocationModalConfirmGradient}
                      >
                        <Text style={styles.savingsAllocationModalConfirmText}>Allocate</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </BlurView>
          </View>
        )}

        {/* Goal Completion Celebration */}
        {showGoalCelebration && celebratedGoal && (
          <View style={styles.celebrationOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.celebrationBlur}>
              <Animated.View 
                style={[
                  styles.celebrationContainer,
                  {
                    opacity: celebrationAnim,
                    transform: [{
                      scale: celebrationAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      })
                    }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.celebrationContent}
                >
                  <View style={styles.celebrationIconContainer}>
                    <Ionicons name="trophy" size={60} color="#ffffff" />
                  </View>
                  
                  <Text style={styles.celebrationTitle}>Goal Completed!</Text>
                  <Text style={styles.celebrationGoalName}>{celebratedGoal.title}</Text>
                  <Text style={styles.celebrationMessage}>
                    Congratulations! You've successfully achieved your financial goal.
                  </Text>
                  
                  <View style={styles.celebrationStats}>
                    <Text style={styles.celebrationAmount}>
                      ${celebratedGoal.targetAmount.toFixed(2)}
                    </Text>
                    <Text style={styles.celebrationCategory}>
                      {celebratedGoal.category.charAt(0).toUpperCase() + celebratedGoal.category.slice(1)}
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </BlurView>
          </View>
        )}

        {/* Month Picker Modal */}
        {showMonthPicker && (
          <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Month</Text>
                <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {generateMonthListWithEntries(expenses, income, monthlyArchives).map((month: string) => {
                  const isCurrent = month === getCurrentMonth();
                  
                  return (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.modalItem,
                        viewingMonth === month && styles.modalItemSelected
                      ]}
                      onPress={() => {
                        setViewingMonth(month);
                        setShowMonthPicker(false);
                      }}
                    >
                      <View style={styles.modalItemContent}>
                        <Text style={[
                          styles.modalItemText,
                          viewingMonth === month && styles.modalItemTextSelected
                        ]}>
                          {formatMonthYear(month)}
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentMonthBadge}>
                            <Text style={styles.currentMonthBadgeText}>Current</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </BlurView>
        )}

        {/* Monthly Report Modal */}
        {showMonthlyReport && (() => {
          const reportData = generateMonthlyReport(viewingMonth, expenses, income);
          return (
            <View style={styles.reportModalOverlay}>
              <BlurView intensity={100} tint="dark" style={styles.reportModalBlur}>
                <View style={styles.reportModalContainer}>
                  <LinearGradient
                    colors={['#1a1a2e', '#16213e']}
                    style={styles.reportModalContent}
                  >
                    <View style={styles.reportModalHeader}>
                      <View style={styles.reportModalIconContainer}>
                        <Ionicons name="bar-chart" size={24} color="#6366f1" />
                      </View>
                      <Text style={styles.reportModalTitle}>
                        {formatMonthYear(viewingMonth)} Report
                      </Text>
                      <TouchableOpacity 
                        onPress={() => setShowMonthlyReport(false)}
                        style={styles.reportModalCloseButton}
                      >
                        <Ionicons name="close" size={24} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.reportModalBody} showsVerticalScrollIndicator={false}>
                      {/* Financial Summary */}
                      <View style={styles.reportSection}>
                        <Text style={styles.reportSectionTitle}>Financial Summary</Text>
                        <View style={styles.reportStatsGrid}>
                          <View style={styles.reportStatItem}>
                            <Text style={styles.reportStatLabel}>Total Income</Text>
                            <Text style={[styles.reportStatValue, { color: '#10b981' }]}>
                              ${reportData.totalIncome.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.reportStatItem}>
                            <Text style={styles.reportStatLabel}>Total Spent</Text>
                            <Text style={[styles.reportStatValue, { color: '#ef4444' }]}>
                              ${reportData.totalSpent.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.reportStatItem}>
                            <Text style={styles.reportStatLabel}>Net Amount</Text>
                            <Text style={[styles.reportStatValue, { color: reportData.netAmount >= 0 ? '#10b981' : '#ef4444' }]}>
                              ${reportData.netAmount.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.reportStatItem}>
                            <Text style={styles.reportStatLabel}>Transactions</Text>
                            <Text style={styles.reportStatValue}>
                              {reportData.transactionCount}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Top Categories */}
                      <View style={styles.reportSection}>
                        <Text style={styles.reportSectionTitle}>Top Spending Categories</Text>
                        {reportData.topCategories.map(([category, total]) => (
                          <View key={category} style={styles.reportCategoryItem}>
                            <LinearGradient
                              colors={(CATEGORY_COLORS[category]?.gradient || ['#475569', '#64748b']) as any}
                              style={styles.reportCategoryTag}
                            >
                              <Text style={styles.reportCategoryName}>{category}</Text>
                            </LinearGradient>
                            <Text style={styles.reportCategoryAmount}>${total.toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                    
                    <View style={styles.reportModalActions}>
                      {viewingMonth !== getCurrentMonth() && (
                        <TouchableOpacity 
                          onPress={async () => {
                            const monthExpenses = expenses.filter(expense => expense.date.startsWith(viewingMonth));
                            const monthIncome = income.filter(incomeItem => incomeItem.date.startsWith(viewingMonth));
                            await archiveMonth(viewingMonth, monthExpenses, monthIncome);
                            setShowMonthlyReport(false);
                          }}
                          style={styles.archiveButton}
                        >
                          <LinearGradient
                            colors={['#f59e0b', '#d97706']}
                            style={styles.archiveButtonGradient}
                          >
                            <Ionicons name="archive-outline" size={20} color="#ffffff" />
                            <Text style={styles.archiveButtonText}>Archive Month</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        onPress={() => setShowMonthlyReport(false)}
                        style={styles.reportModalButton}
                      >
                        <LinearGradient
                          colors={['#6366f1', '#8b5cf6']}
                          style={styles.reportModalButtonGradient}
                        >
                          <Text style={styles.reportModalButtonText}>Close Report</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </BlurView>
            </View>
          );
        })()}

        {/* Projection Info Modal */}
        {showProjectionInfo && (
          <View style={styles.infoModalOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.infoModalBlur}>
              <View style={styles.infoModalContainer}>
                <LinearGradient
                  colors={['#1a1a2e', '#16213e']}
                  style={styles.infoModalContent}
                >
                  <View style={styles.infoModalHeader}>
                    <View style={styles.infoModalIconContainer}>
                      <Ionicons name="information-circle" size={24} color="#6366f1" />
                    </View>
                    <Text style={styles.infoModalTitle}>Month Projection</Text>
                    <TouchableOpacity 
                      onPress={() => setShowProjectionInfo(false)}
                      style={styles.infoModalCloseButton}
                    >
                      <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.infoModalBody}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconBg}>
                        <Ionicons name="cash-outline" size={16} color="#10b981" />
                      </View>
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>Amount:</Text> Your projected balance at the end of the month.
                      </Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconBg}>
                        <Ionicons name="color-palette-outline" size={16} color="#f59e0b" />
                      </View>
                      <Text style={styles.infoTextWithPadding}>
                        <Text style={styles.infoLabel}>Color:</Text>{'\n'}• Green = Amount in profit{'\n'}• Orange = Amount in Loss
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => setShowProjectionInfo(false)}
                    style={styles.infoModalButton}
                  >
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6']}
                      style={styles.infoModalButtonGradient}
                    >
                      <Text style={styles.infoModalButtonText}>Got it!</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </BlurView>
          </View>
        )}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 0,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    marginRight: 12,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  dateButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    letterSpacing: 0.1,
  },
  mainContent: {
    flex: 1,
  },
  bottomNavigation: {
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 15 : 45,
  },
  bottomNavigationGradient: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bottomTabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Add Transaction Screen Styles
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: 20,
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  addTransactionContent: {
    paddingHorizontal: 20,
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 30,
  },
  modernTab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modernTabActive: {
    // Active state handled by gradient
  },
  modernTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  modernTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modernTabTextActive: {
    color: '#ffffff',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  descriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 16,
    color: '#ffffff',
    minHeight: 80,
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Transactions Screen Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabActive: {
    // Active state handled by gradient
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Stats Screen Styles
  statsCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  projectionInfo: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  projectionInfoGradient: {
    padding: 16,
  },
  projectionInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  projectionInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  projectionInfoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  categoryBreakdownContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  categoryBreakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  // Month picker styles
  monthPickerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  monthPickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  monthPickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Monthly report styles
  monthlyReportContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  monthlyReportButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  monthlyReportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  monthlyReportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Modal styles
  modalBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalContent: {
    maxHeight: 300,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
    overflow: 'hidden',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  modalItemText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: '#a5b4fc',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  currentMonthBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  currentMonthBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
  },
  // Bottom navigation additional styles
  bottomTabActive: {
    // Active state handled by color changes
  },
  bottomTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  bottomTabTextActive: {
    color: '#6366f1',
  },
  centerTab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: Platform.OS === 'ios' ? 0 : -8,
    overflow: 'hidden',
  },
  centerTabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Category screen styles
  categoryScreenContent: {
    paddingHorizontal: 20,
  },
  categorySummaryCard: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categorySummaryGradient: {
    padding: 20,
  },
  categorySummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categorySummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categorySummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a29bfe',
  },
  categorySummaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyCategoryGradient: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyCategoryIconContainer: {
    marginBottom: 20,
  },
  emptyCategoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCategorySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Transactions screen styles
  transactionsScreenContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionTabsWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  modernTransactionTab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modernTransactionTabActive: {
    // Active state handled by gradient
  },
  modernTabActiveGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  tabContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  tabIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  transactionsList: {
    flex: 1,
  },
  nestedFlatList: {
    flex: 1,
  },
  nestedFlatListContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateGradient: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  // Goals screen styles
  goalsScreenContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  goalsCard: {
    padding: 20,
    borderRadius: 16,
  },
  goalsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  goalsCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  goalsCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 16,
  },
  goalsProgress: {
    gap: 8,
  },
  goalsProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalsProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalsProgressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  // Stats screen styles
  statsScreenContent: {
    paddingHorizontal: 20,
  },
  statsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsCardGradient: {
    padding: 20,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoButton: {
    padding: 4,
  },
  statsCardAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  projectionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  // Overview styles
  overviewContainer: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  overviewGradient: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  overviewContent: {
    gap: 20,
  },
  overviewLeft: {
    gap: 16,
  },
  overviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  overviewLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  overviewRight: {
    padding: 20,
    borderRadius: 16,
  },
  overviewStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  overviewStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  overviewStatusDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Projection info modal styles
  projectionInfoContent: {
    padding: 20,
  },
  // Info Modal Styles
  infoModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  infoModalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalContainer: {
    width: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  infoModalContent: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  infoModalCloseButton: {
    padding: 4,
  },
  infoModalBody: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 25,
    paddingTop: 15,
  },
  infoTextWithPadding: {
    flex: 1,
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 25,
    paddingTop: 40,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#ffffff',
  },
  infoModalButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoModalButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  infoModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Monthly Report Modal Styles
  reportModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  reportModalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModalContainer: {
    width: '92%',
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  reportModalContent: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '85%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  reportModalCloseButton: {
    padding: 4,
  },
  reportModalBody: {
    maxHeight: '60%',
    paddingHorizontal: 24,
  },
  reportSection: {
    marginBottom: 24,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    paddingTop: 20,
  },
  reportStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportStatItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportStatLabel: {
    fontSize: 12,
    color: '#a3a3a3',
    marginBottom: 4,
    fontWeight: '500',
  },
  reportStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  reportCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 10,
  },
  reportCategoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reportCategoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  reportCategoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  reportModalActions: {
    flexDirection: 'row',
    gap: 12,
    margin: 24,
  },
  archiveButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  archiveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  archiveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportModalButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  reportModalButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  reportModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Modern Goals Screen Styles
  goalsHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addGoalButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addGoalButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalsOverviewContainer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  goalsOverviewCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalsOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalsOverviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  goalsOverviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalsOverviewStat: {
    alignItems: 'center',
  },
  goalsOverviewStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  goalsOverviewStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  goalsSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  goalsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modernGoalCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  modernGoalCardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernGoalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modernGoalCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernGoalCardTitleContainer: {
    flex: 1,
  },
  modernGoalCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  modernGoalCardCategory: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  modernGoalCompletedBadge: {
    marginLeft: 8,
  },
  modernGoalCardDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
    marginBottom: 16,
  },
  modernGoalProgressContainer: {
    marginBottom: 12,
  },
  modernGoalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernGoalProgressLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modernGoalProgressPercentage: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modernGoalProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modernGoalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  modernGoalAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  modernGoalCurrentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modernGoalTargetAmount: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 4,
  },
  modernGoalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  modernGoalDateText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  modernGoalActions: {
    marginTop: 16,
  },
  modernGoalCompleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modernGoalCompleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modernGoalCompleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  goalsEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  goalsEmptyGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalsEmptyIconContainer: {
    marginBottom: 20,
  },
  goalsEmptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  goalsEmptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  goalsEmptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  goalsEmptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  goalsEmptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },

  // Goal Modal Styles
  goalModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  goalModalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalModalContainer: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  goalModalContent: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  goalModalCloseButton: {
    padding: 4,
  },
  goalModalBody: {
    maxHeight: '60%',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  goalFormField: {
    marginBottom: 20,
  },
  goalFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  goalFormInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  goalFormTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  goalFormPicker: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  goalFormPickerText: {
    fontSize: 16,
    color: '#ffffff',
  },
  goalColorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalColorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalColorOptionSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },
  goalIconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalIconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalIconOptionSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#ffffff',
  },
  goalModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalModalCancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  goalModalSaveButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  goalModalSaveGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  goalModalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Goal Celebration Styles
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  celebrationBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContainer: {
    width: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  celebrationContent: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 24,
  },
  celebrationIconContainer: {
    marginBottom: 20,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationGoalName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  celebrationMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.9,
  },
  celebrationStats: {
    alignItems: 'center',
  },
  celebrationAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  celebrationCategory: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'capitalize',
  },

  // Savings Instructions Styles
  savingsInstructionsContainer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  savingsInstructionsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingsInstructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  savingsInstructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  savingsInstructionsText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  debugInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
  },

  // Savings Section Styles
  savingsSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  savingsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  savingsContent: {
    alignItems: 'center',
  },
  savingsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00b894',
    marginBottom: 8,
  },
  savingsDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  allocateSavingsButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  allocateSavingsButtonDisabled: {
    opacity: 0.6,
  },
  allocateSavingsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  allocateSavingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },

  // Savings Allocation Modal Styles
  savingsAllocationModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  savingsAllocationModalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsAllocationModalContainer: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  savingsAllocationModalContent: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingsAllocationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingsAllocationModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savingsAllocationModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  savingsAllocationModalCloseButton: {
    padding: 4,
  },
  savingsAllocationModalBody: {
    maxHeight: '60%',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  savingsAllocationModalDescription: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 20,
    textAlign: 'center',
  },
  savingsAllocationGoalItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  savingsAllocationGoalItemGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingsAllocationGoalItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsAllocationGoalItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  savingsAllocationGoalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  savingsAllocationGoalItemProgress: {
    fontSize: 14,
    color: '#94a3b8',
  },
  savingsAllocationGoalItemRemaining: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  savingsAllocationGoalItemSelected: {
    borderWidth: 2,
    borderColor: '#00b894',
  },

  // Savings Progress Bar Styles
  savingsProgressContainer: {
    marginVertical: 16,
  },
  savingsProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  savingsProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  savingsProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savingsProgressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  savingsProgressText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Allocation Amount Input Styles
  allocationAmountContainer: {
    marginBottom: 20,
  },
  allocationAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  allocationAmountInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  allocationAmountHelper: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  allocationGoalSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },

  // Allocation Modal Actions
  savingsAllocationModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingsAllocationModalCancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingsAllocationModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  savingsAllocationModalConfirmButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  savingsAllocationModalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  savingsAllocationModalConfirmGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  savingsAllocationModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default BudgetTracker;