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
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  ListRenderItem,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get('window');

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

// Type definitions
interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface Income {
  id: number;
  amount: number;
  source: string;
  description: string;
  date: string;
}

interface ExpenseFormData {
  amount: string;
  category: string;
  description: string;
  date: string;
}

interface IncomeFormData {
  amount: string;
  source: string;
  description: string;
  date: string;
}

interface StatsCardProps {
  title: string;
  amount: number;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
  isProjection?: boolean;
  showInfo?: boolean;
  onInfoPress?: () => void;
}

interface MonthlyArchive {
  month: string; // Format: "YYYY-MM"
  expenses: Expense[];
  income: Income[];
  totalSpent: number;
  totalIncome: number;
  netAmount: number;
  createdAt: string;
}

interface MonthlyComparison {
  currentMonth: MonthlyArchive;
  previousMonth?: MonthlyArchive;
  spendingChange: number;
  incomeChange: number;
  netChange: number;
}

interface PickerModalProps {
  visible: boolean;
  items: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  title: string;
  renderItem?: (item: string) => React.ReactElement;
}

interface CategoryColor {
  bg: string;
  text: string;
  gradient: string[];
}

type CategoryColors = {
  [key: string]: CategoryColor;
};

type TabType = 'expense' | 'income';

type BottomTabType = 'category' | 'transactions' | 'add' | 'stats' | 'goals';



const BudgetTracker: React.FC = memo(() => {

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [incomeForm, setIncomeForm] = useState<IncomeFormData>({
    amount: '',
    source: 'Salary',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [activeTab, setActiveTab] = useState<TabType>('expense');
  const [transactionViewTab, setTransactionViewTab] = useState<TabType>('expense');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [showSourcePicker, setShowSourcePicker] = useState<boolean>(false);
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState<boolean>(false);
  const [showIncomeDatePicker, setShowIncomeDatePicker] = useState<boolean>(false);
  const [showProjectionInfo, setShowProjectionInfo] = useState<boolean>(false);
  const [monthlyArchives, setMonthlyArchives] = useState<MonthlyArchive[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [viewingMonth, setViewingMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('add');
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteItem, setDeleteItem] = useState<{ id: number; type: 'expense' | 'income'; description: string } | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const amountInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);



  // Memoized static data to prevent recreation on every render
  const incomeSources: string[] = useMemo(() => [
    'Salary', 'Freelance', 'Business', 'Investment', 'Bonus', 
    'Side Hustle', 'Rental', 'Gift', 'Refund', 'Other'
  ], []);

  const categories: string[] = useMemo(() => [
    'Food', 'Transportation', 'Shopping', 'Entertainment', 
    'Bills & Utilities', 'Healthcare', 'Education', 'Personal Care',
    'Groceries', 'Coffee & Snacks', 'Gas', 'Other'
  ], []);

  const categoryColors: CategoryColors = useMemo(() => ({
    'Food': { bg: '#1a1a2e', text: '#ff6b6b', gradient: ['#ff6b6b', '#ee5a52'] },
    'Transportation': { bg: '#16213e', text: '#4ecdc4', gradient: ['#4ecdc4', '#44a08d'] },
    'Shopping': { bg: '#2d1b69', text: '#a8e6cf', gradient: ['#a8e6cf', '#88d8c0'] },
    'Entertainment': { bg: '#3c1361', text: '#ffd93d', gradient: ['#ffd93d', '#ff9f43'] },
    'Bills & Utilities': { bg: '#8b1538', text: '#6c5ce7', gradient: ['#6c5ce7', '#a29bfe'] },
    'Healthcare': { bg: '#0f4c75', text: '#00b894', gradient: ['#00b894', '#00a085'] },
    'Education': { bg: '#2c2c54', text: '#fd79a8', gradient: ['#fd79a8', '#e84393'] },
    'Personal Care': { bg: '#40407a', text: '#ffeaa7', gradient: ['#ffeaa7', '#fdcb6e'] },
    'Groceries': { bg: '#2d3436', text: '#55a3ff', gradient: ['#55a3ff', '#3742fa'] },
    'Coffee & Snacks': { bg: '#6c5ce7', text: '#a29bfe', gradient: ['#a29bfe', '#74b9ff'] },
    'Gas': { bg: '#2f3640', text: '#ff9f43', gradient: ['#ff9f43', '#ee5a52'] },
    'Other': { bg: '#57606f', text: '#7bed9f', gradient: ['#7bed9f', '#5f27cd'] }
  }), []);

  // Load data on app start with animation
  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);



  const loadData = useCallback(async (): Promise<void> => {
    try {
      const expensesData = await AsyncStorage.getItem('expenses');
      const incomeData = await AsyncStorage.getItem('income');
      const archivesData = await AsyncStorage.getItem('monthlyArchives');
      
      if (expensesData) {
        setExpenses(JSON.parse(expensesData));
      }
      if (incomeData) {
        setIncome(JSON.parse(incomeData));
      }
      if (archivesData) {
        setMonthlyArchives(JSON.parse(archivesData));
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const saveData = useCallback(async (expensesData: Expense[], incomeData: Income[]): Promise<void> => {
    try {
      await AsyncStorage.setItem('expenses', JSON.stringify(expensesData));
      await AsyncStorage.setItem('income', JSON.stringify(incomeData));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }, []);

  const saveArchives = useCallback(async (archives: MonthlyArchive[]): Promise<void> => {
    try {
      await AsyncStorage.setItem('monthlyArchives', JSON.stringify(archives));
    } catch (error) {
      console.error('Error saving archives:', error);
    }
  }, []);

  // Request notification permissions
  const requestNotificationPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const granted = finalStatus === 'granted';
      setNotificationPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }, []);

  // Schedule end-of-month reminder notifications
  const scheduleMonthEndReminders = useCallback(async (): Promise<void> => {
    try {
      // Cancel existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      if (!notificationPermission) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Get the last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Schedule notifications for the last 5 days of the month
      for (let i = 5; i >= 1; i--) {
        const reminderDay = lastDayOfMonth - i + 1;
        const reminderDate = new Date(currentYear, currentMonth, reminderDay, 19, 0, 0); // 7:00 PM
        
        // Only schedule if the date is in the future
        if (reminderDate > now) {
          const daysLeft = i - 1;
          const dayText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '💰 Month End Reminder',
              body: `Don't forget to track your expenses! The month ends ${dayText}.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate 
          },
          });
        }
      }
      
      console.log('Month-end reminder notifications scheduled successfully');
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }, [notificationPermission, requestNotificationPermissions]);

  // Schedule notifications for next month
  const scheduleNextMonthReminders = useCallback(async (): Promise<void> => {
    try {
      if (!notificationPermission) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;
      }

      const now = new Date();
      const nextMonth = now.getMonth() + 1;
      const nextYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
      const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
      
      // Get the last day of next month
      const lastDayOfNextMonth = new Date(nextYear, adjustedMonth + 1, 0).getDate();
      
      // Schedule notifications for the last 5 days of next month
      for (let i = 5; i >= 1; i--) {
        const reminderDay = lastDayOfNextMonth - i + 1;
        const reminderDate = new Date(nextYear, adjustedMonth, reminderDay, 19, 0, 0); // 7:00 PM
        
        const daysLeft = i - 1;
        const dayText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💰 Month End Reminder',
            body: `Don't forget to track your expenses! The month ends ${dayText}.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate 
          },
        });
      }
      
      console.log('Next month reminder notifications scheduled successfully');
    } catch (error) {
      console.error('Error scheduling next month notifications:', error);
    }
  }, [notificationPermission, requestNotificationPermissions]);

  // Archive a specific month's data
  const archiveMonth = useCallback(async (monthToArchive: string): Promise<void> => {
    try {
      // Filter data for the specific month
      const monthExpenses = expenses.filter(exp => exp.date.startsWith(monthToArchive));
      const monthIncome = income.filter(inc => inc.date.startsWith(monthToArchive));
      
      const monthTotalSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const monthTotalIncome = monthIncome.reduce((sum, inc) => sum + inc.amount, 0);
      
      const archive: MonthlyArchive = {
        month: monthToArchive,
        expenses: monthExpenses,
        income: monthIncome,
        totalSpent: monthTotalSpent,
        totalIncome: monthTotalIncome,
        netAmount: monthTotalIncome - monthTotalSpent,
        createdAt: new Date().toISOString()
      };
      
      // Add to archives if not already exists
      const existingArchiveIndex = monthlyArchives.findIndex(arch => arch.month === monthToArchive);
      let updatedArchives: MonthlyArchive[];
      
      if (existingArchiveIndex >= 0) {
        updatedArchives = [...monthlyArchives];
        updatedArchives[existingArchiveIndex] = archive;
      } else {
        updatedArchives = [archive, ...monthlyArchives].sort((a, b) => b.month.localeCompare(a.month));
      }
      
      setMonthlyArchives(updatedArchives);
      await saveArchives(updatedArchives);
      
      // Remove archived data from current expenses and income
      const remainingExpenses = expenses.filter(exp => !exp.date.startsWith(monthToArchive));
      const remainingIncome = income.filter(inc => !inc.date.startsWith(monthToArchive));
      
      setExpenses(remainingExpenses);
      setIncome(remainingIncome);
      await saveData(remainingExpenses, remainingIncome);
      
      // Schedule notifications for the new month
      await scheduleNextMonthReminders();
      
    } catch (error) {
      console.error('Error archiving month:', error);
    }
  }, [expenses, income, monthlyArchives, saveArchives, saveData, scheduleNextMonthReminders]);

  // Get current month's data only
  const getCurrentMonthData = useCallback(() => {
    const currentMonthExpenses = expenses.filter(exp => exp.date.startsWith(viewingMonth));
    const currentMonthIncome = income.filter(inc => inc.date.startsWith(viewingMonth));
    return { expenses: currentMonthExpenses, income: currentMonthIncome };
  }, [expenses, income, viewingMonth]);

  // Check if we need to archive the previous month's data
  const checkAndArchivePreviousMonth = useCallback(async (): Promise<void> => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    
    // If the stored current month is different from actual current month, archive the data
    if (currentMonth !== currentMonthKey) {
      await archiveMonth(currentMonth);
      setCurrentMonth(currentMonthKey);
      setViewingMonth(currentMonthKey);
    }
  }, [currentMonth, archiveMonth]);

  // Modal close handlers
  const closeMonthlyReport = useCallback(() => {
    setShowMonthlyReport(false);
  }, []);

  const closeMonthPicker = useCallback(() => {
    setShowMonthPicker(false);
  }, []);

  const openMonthPicker = useCallback(() => {
    setShowMonthPicker(true);
  }, []);

  const openMonthlyReport = useCallback(() => {
    setShowMonthlyReport(true);
  }, []);



  // Check for month changes when app loads or becomes active
  useEffect(() => {
    const checkMonth = async () => {
      await checkAndArchivePreviousMonth();
    };
    checkMonth();
  }, [checkAndArchivePreviousMonth]);

  // Initialize notifications on app start
  useEffect(() => {
    const initializeNotifications = async () => {
      // Request permissions and schedule initial notifications
      await requestNotificationPermissions();
      await scheduleMonthEndReminders();
    };
    
    initializeNotifications();
  }, [requestNotificationPermissions, scheduleMonthEndReminders]);

  // Handle notification responses (when user taps notification)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      // When user taps notification, ensure they're on the current month view
      const currentMonthKey = new Date().toISOString().slice(0, 7);
      setViewingMonth(currentMonthKey);
      setActiveTab('expense'); // Switch to expense tab to encourage input
    });

    return () => subscription.remove();
  }, []);

  const handleSubmit = useCallback((): void => {
    if (formData.amount && parseFloat(formData.amount) > 0) {
      const newExpense: Expense = {
        id: Date.now(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date
      };
      const updatedExpenses = [newExpense, ...expenses];
      setExpenses(updatedExpenses);
      saveData(updatedExpenses, income);
      setFormData({
        amount: '',
        category: 'Food',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Success animation
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [formData, expenses, income, saveData, slideAnim]);

  // Memoized change handlers to prevent re-renders
  const handleAmountChange = useCallback((text: string) => {
    console.log('Amount change:', text, 'activeTab:', activeTab);
    if (activeTab === 'expense') {
      setFormData(prev => {
        const newData = {...prev, amount: text};
        console.log('Setting expense formData:', newData);
        return newData;
      });
    } else {
      setIncomeForm(prev => {
        const newData = {...prev, amount: text};
        console.log('Setting income formData:', newData);
        return newData;
      });
    }
  }, [activeTab]);

  const handleDescriptionChange = useCallback((text: string) => {
    console.log('Description change:', text, 'activeTab:', activeTab);
    if (activeTab === 'expense') {
      setFormData(prev => {
        const newData = {...prev, description: text};
        console.log('Setting expense description:', newData);
        return newData;
      });
    } else {
      setIncomeForm(prev => {
        const newData = {...prev, description: text};
        console.log('Setting income description:', newData);
        return newData;
      });
    }
  }, [activeTab]);

  const handleIncomeSubmit = useCallback((): void => {
    if (incomeForm.amount && parseFloat(incomeForm.amount) > 0) {
      const newIncome: Income = {
        id: Date.now(),
        amount: parseFloat(incomeForm.amount),
        source: incomeForm.source,
        description: incomeForm.description,
        date: incomeForm.date
      };
      const updatedIncome = [newIncome, ...income];
      setIncome(updatedIncome);
      saveData(expenses, updatedIncome);
      setIncomeForm({
        amount: '',
        source: 'Salary',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Success animation
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [incomeForm, income, expenses, saveData, slideAnim]);

  const deleteIncome = useCallback((id: number): void => {
    const incomeItem = income.find(inc => inc.id === id);
    if (incomeItem) {
      setDeleteItem({
        id,
        type: 'income',
        description: incomeItem.description || incomeItem.source
      });
      setShowDeleteConfirm(true);
    }
  }, [income]);

  const deleteExpense = useCallback((id: number): void => {
    const expenseItem = expenses.find(exp => exp.id === id);
    if (expenseItem) {
      setDeleteItem({
        id,
        type: 'expense',
        description: expenseItem.description || expenseItem.category
      });
      setShowDeleteConfirm(true);
    }
  }, [expenses]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, [loadData]);

  const handleExpenseDateChange = useCallback((event: any, selectedDate?: Date): void => {
    if (event.type === 'dismissed') {
      setShowExpenseDatePicker(false);
      return;
    }
    
    if (selectedDate && Platform.OS === 'android') {
      const dateString = selectedDate.toISOString().split('T')[0];
      setFormData({...formData, date: dateString});
      setShowExpenseDatePicker(false);
    } else if (selectedDate && Platform.OS === 'ios') {
      const dateString = selectedDate.toISOString().split('T')[0];
      setFormData({...formData, date: dateString});
      // Don't auto-close on iOS - let user manually close
    }
  }, [formData]);

  const handleIncomeDateChange = useCallback((event: any, selectedDate?: Date): void => {
    if (event.type === 'dismissed') {
      setShowIncomeDatePicker(false);
      return;
    }
    
    if (selectedDate && Platform.OS === 'android') {
      const dateString = selectedDate.toISOString().split('T')[0];
      setIncomeForm({...incomeForm, date: dateString});
      setShowIncomeDatePicker(false);
    } else if (selectedDate && Platform.OS === 'ios') {
      const dateString = selectedDate.toISOString().split('T')[0];
      setIncomeForm({...incomeForm, date: dateString});
      // Don't auto-close on iOS - let user manually close
    }
  }, [incomeForm]);

  // Get data for the viewing month (current or archived)
  const viewingMonthData = useMemo(() => {
    if (viewingMonth === currentMonth) {
      // Current month - use live data
      return getCurrentMonthData();
    } else {
      // Archived month - get from archives
      const archive = monthlyArchives.find(arch => arch.month === viewingMonth);
      return archive ? { expenses: archive.expenses, income: archive.income } : { expenses: [], income: [] };
    }
  }, [viewingMonth, currentMonth, getCurrentMonthData, monthlyArchives]);

  // Memoized calculations for the viewing month only
  const totalSpent: number = useMemo(() => 
    viewingMonthData.expenses.reduce((sum, exp) => sum + exp.amount, 0), [viewingMonthData.expenses]
  );
  
  const totalIncome: number = useMemo(() => 
    viewingMonthData.income.reduce((sum, inc) => sum + inc.amount, 0), [viewingMonthData.income]
  );
  
  const netAmount: number = useMemo(() => 
    totalIncome - totalSpent, [totalIncome, totalSpent]
  );

  // Memoized monthly projection calculations
  const projectionData = useMemo(() => {
  const currentDate = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysPassed = currentDate.getDate();
  const daysRemaining = daysInMonth - daysPassed;
  
  const avgDailySpending: number = daysPassed > 0 ? totalSpent / daysPassed : 0;
  const projectedMonthlySpending: number = totalSpent + (avgDailySpending * daysRemaining);
  const projectedNet: number = totalIncome - projectedMonthlySpending;

    return {
      currentDate,
      daysInMonth,
      daysPassed,
      daysRemaining,
      avgDailySpending,
      projectedMonthlySpending,
      projectedNet
    };
  }, [totalSpent, totalIncome]);
  
  const { avgDailySpending, projectedMonthlySpending, projectedNet, daysInMonth, daysPassed, daysRemaining } = projectionData;

    // Memoized category totals for the viewing month
  const categoryTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    categories.forEach(category => {
      totals[category] = viewingMonthData.expenses
        .filter(exp => exp.category === category)
        .reduce((sum, exp) => sum + exp.amount, 0);
    });
    return totals;
  }, [viewingMonthData.expenses, categories]);

  // Memoized month comparison data
  const monthComparison = useMemo(() => {
    if (monthlyArchives.length === 0) return null;
    
    const prevMonth = monthlyArchives.find(arch => {
      const prevDate = new Date(viewingMonth + '-01');
      prevDate.setMonth(prevDate.getMonth() - 1);
      return arch.month === prevDate.toISOString().slice(0, 7);
    });
    
    if (!prevMonth) return null;
    
    const spendingChange = totalSpent - prevMonth.totalSpent;
    const incomeChange = totalIncome - prevMonth.totalIncome;
    
    return {
      prevMonth,
      spendingChange,
      incomeChange
    };
  }, [monthlyArchives, viewingMonth, totalSpent, totalIncome]);

  // Memoized unique month list for picker
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    // Add current month
    months.add(currentMonth);
    
    // Add all archived months
    monthlyArchives.forEach(archive => {
      months.add(archive.month);
    });
    
    // Convert to array and sort in descending order (newest first)
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [currentMonth, monthlyArchives]);

  const renderStatsCard = useCallback(({ title, amount, icon, gradient, isProjection = false, showInfo = false, onInfoPress }: StatsCardProps) => (
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
        colors={gradient as any}
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

  const renderExpenseItem: ListRenderItem<Expense> = useCallback(({ item }) => (
    <Animated.View 
      style={[
        styles.transactionItem,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <LinearGradient
                      colors={['rgba(255, 107, 107, 0.1)', 'rgba(238, 90, 82, 0.05)'] as any}
        style={styles.transactionGradient}
      >
        <View style={styles.transactionContent}>
          <View style={styles.transactionHeader}>
            <LinearGradient
              colors={(categoryColors[item.category]?.gradient || ['#475569', '#64748b']) as any}
              style={styles.categoryTag}
            >
              <Text style={styles.categoryTagText}>
                {item.category}
              </Text>
            </LinearGradient>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
          <Text style={styles.expenseAmount}>-${item.amount.toFixed(2)}</Text>
          {item.description && (
            <Text style={styles.transactionDescription}>{item.description}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => deleteExpense(item.id)}
          style={styles.deleteButton}
        >
          <LinearGradient
            colors={['#ff6b6b', '#ee5a52']}
            style={styles.deleteButtonGradient}
          >
            <Ionicons name="trash-outline" size={16} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  ), [fadeAnim, slideAnim, categoryColors, deleteExpense]);

  const renderIncomeItem: ListRenderItem<Income> = useCallback(({ item }) => (
    <Animated.View 
      style={[
        styles.transactionItem,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)'] as any}
        style={styles.transactionGradient}
      >
        <View style={styles.transactionContent}>
          <View style={styles.transactionHeader}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.categoryTag}
            >
              <Text style={styles.categoryTagText}>{item.source}</Text>
            </LinearGradient>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
          <Text style={styles.incomeAmount}>+${item.amount.toFixed(2)}</Text>
          {item.description && (
            <Text style={styles.transactionDescription}>{item.description}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => deleteIncome(item.id)}
          style={styles.deleteButton}
        >
          <LinearGradient
            colors={['#ff6b6b', '#ee5a52']}
            style={styles.deleteButtonGradient}
          >
            <Ionicons name="trash-outline" size={16} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  ), [fadeAnim, slideAnim, deleteIncome]);

  const renderCategoryBreakdown = useMemo((): (React.JSX.Element | null)[] => {
    return categories.map((category) => {
      const total = categoryTotals[category] || 0;
      const percentage = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
      
      if (total === 0) return null;
      
      return (
        <Animated.View 
          key={category} 
          style={[
            styles.categoryBreakdownItem,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.categoryBreakdownHeader}>
            <LinearGradient
              colors={(categoryColors[category]?.gradient || ['#475569', '#64748b']) as any}
              style={styles.categoryTag}
            >
              <Text style={styles.categoryTagText}>
                {category}
              </Text>
            </LinearGradient>
            <Text style={styles.categoryAmount}>${total.toFixed(2)}</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={(categoryColors[category]?.gradient || ['#475569', '#64748b']) as any}
              style={[
                styles.progressBar,
                { width: `${percentage}%` }
              ]}
            />
          </View>
          <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}% of total spending</Text>
        </Animated.View>
      );
    });
  }, [categories, categoryTotals, totalSpent, categoryColors, fadeAnim, slideAnim]);

  const PickerModal: React.FC<PickerModalProps> = memo(({ 
    visible, 
    items, 
    selectedValue, 
    onSelect, 
    onClose, 
    title,
    renderItem
  }) => {
    if (!visible) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <BlurView intensity={100} style={styles.modalBlur}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: fadeAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#1a1a2e', '#16213e']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.modalItem}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    {selectedValue === item ? (
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        style={styles.modalItemSelectedGradient}
                      >
                        <View style={styles.modalItemContent}>
                          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                          {renderItem ? (
                            renderItem(item)
                          ) : (
                            <Text style={styles.modalItemTextSelected}>
                              {item}
                            </Text>
                          )}
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.modalItemContent}>
                        <View style={styles.modalItemIcon} />
                        {renderItem ? (
                          renderItem(item)
                        ) : (
                          <Text style={styles.modalItemText}>
                            {item}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </BlurView>
      </View>
    );
  });

  // Delete Confirmation Dialog
  const DeleteConfirmDialog = () => {
    if (!showDeleteConfirm || !deleteItem) return null;

    const handleConfirmDelete = () => {
      if (deleteItem.type === 'expense') {
        const updatedExpenses = expenses.filter(exp => exp.id !== deleteItem.id);
        setExpenses(updatedExpenses);
        saveData(updatedExpenses, income);
      } else {
        const updatedIncome = income.filter(inc => inc.id !== deleteItem.id);
        setIncome(updatedIncome);
        saveData(expenses, updatedIncome);
      }
      setShowDeleteConfirm(false);
      setDeleteItem(null);
    };

    const handleCancel = () => {
      setShowDeleteConfirm(false);
      setDeleteItem(null);
    };

    return (
      <View style={styles.deleteConfirmOverlay}>
        <View style={styles.deleteConfirmContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.deleteConfirmGradient}
          >
            <View style={styles.deleteConfirmHeader}>
              <View style={styles.deleteConfirmIconContainer}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.deleteConfirmIconGradient}
                >
                  <Ionicons name="trash-outline" size={24} color="#ffffff" />
                </LinearGradient>
              </View>
              <Text style={styles.deleteConfirmTitle}>
                Delete {deleteItem.type === 'expense' ? 'Expense' : 'Income'}
              </Text>
              <Text style={styles.deleteConfirmMessage}>
                Are you sure you want to delete "{deleteItem.description}"?
              </Text>
            </View>
            
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.deleteConfirmCancelButton}>
                <View style={styles.deleteConfirmCancelGradient}>
                  <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleConfirmDelete} style={styles.deleteConfirmDeleteButton}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.deleteConfirmDeleteGradient}
                >
                  <Text style={styles.deleteConfirmDeleteText}>Delete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  // Screen Components
  const CategoryScreen = () => (
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
            colors={['rgba(100, 116, 139, 0.2)', 'rgba(71, 85, 105, 0.1)'] as any}
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
  );

  const TransactionsScreen = () => (
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
            viewingMonthData.expenses.length === 0 ? (
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
                data={viewingMonthData.expenses}
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
            viewingMonthData.income.length === 0 ? (
              <View style={styles.emptyState}>
                                        <LinearGradient
                          colors={['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)'] as any}
                          style={styles.emptyStateGradient}
                        >
                  <Ionicons name="trending-up-outline" size={64} color="#10b981" />
                  <Text style={styles.emptyStateText}>No income recorded yet</Text>
                  <Text style={styles.emptyStateSubtext}>Add your first income entry above</Text>
                </LinearGradient>
              </View>
            ) : (
              <FlatList
                data={viewingMonthData.income}
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

  const AddTransactionScreen = () => {
    console.log('AddTransactionScreen render - formData:', formData, 'incomeForm:', incomeForm, 'activeTab:', activeTab);
    
    return (
      <ScrollView 
        style={styles.screenContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
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
              {activeTab === 'expense' && (
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modernTabGradient}
                />
              )}
              <View style={styles.modernTabContent}>
                <Ionicons 
                  name="trending-down" 
                  size={18} 
                  color={activeTab === 'expense' ? '#ffffff' : '#94a3b8'} 
                />
                <Text style={[
                  styles.modernTabTextWithMargin,
                  activeTab === 'expense' && styles.modernTabTextActiveWithMargin
                ]}>
                  Expense
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modernTab,
                activeTab === 'income' && styles.modernTabActive
              ]}
              onPress={() => setActiveTab('income')}
            >
              {activeTab === 'income' && (
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.modernTabGradient}
                />
              )}
              <View style={styles.modernTabContent}>
                <Ionicons 
                  name="trending-up" 
                  size={18} 
                  color={activeTab === 'income' ? '#ffffff' : '#94a3b8'} 
                />
                <Text style={[
                  styles.modernTabTextWithMargin,
                  activeTab === 'income' && styles.modernTabTextActiveWithMargin
                ]}>
                  Income
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.modernFormGrid}>
            <View style={styles.fullWidthField}>
              <Text style={styles.modernLabel}>Amount</Text>
              <View style={styles.amountInputContainer}>
                <Ionicons name="cash-outline" size={20} color="#6366f1" style={styles.inputIcon} />
                <TextInput
                  ref={amountInputRef}
                  style={styles.modernInput}
                  placeholder={activeTab === 'expense' ? "Enter expense amount" : "Enter income amount"}
                  placeholderTextColor="#64748b"
                  value={activeTab === 'expense' ? formData.amount : incomeForm.amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  // Android-specific props to fix highlighting
                  underlineColorAndroid="transparent"
                  selectionColor="rgba(255, 255, 255, 0.08)"
                  cursorColor="rgba(255, 255, 255, 0.08)"
                  // Prevent keyboard from closing
                  blurOnSubmit={false}
                  returnKeyType="next"
                  // Additional focus retention props
                  autoFocus={false}
                  editable={true}
                  // Additional props to prevent keyboard dismissal
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                  onFocus={() => console.log('Amount focused, current value:', activeTab === 'expense' ? formData.amount : incomeForm.amount)}
                  onBlur={() => console.log('Amount blurred, final value:', activeTab === 'expense' ? formData.amount : incomeForm.amount)}
                />
              </View>
            </View>

            <View style={styles.fullWidthField}>
              <Text style={styles.modernLabel}>
                {activeTab === 'expense' ? 'Category' : 'Source'}
              </Text>
              <TouchableOpacity
                style={styles.modernInputContainer}
                onPress={() => {
                  if (activeTab === 'expense') {
                    setShowCategoryPicker(true);
                  } else {
                    setShowSourcePicker(true);
                  }
                }}
              >
                <Ionicons 
                  name={activeTab === 'expense' ? "pricetag-outline" : "business-outline"} 
                  size={20} 
                  color="#6366f1" 
                  style={styles.inputIcon} 
                />
                <Text style={styles.modernInputText}>
                  {activeTab === 'expense' ? formData.category : incomeForm.source}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.halfField}>
                <Text style={styles.modernLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.modernInputContainer}
                  onPress={() => {
                    if (activeTab === 'expense') {
                      setShowExpenseDatePicker(true);
                    } else {
                      setShowIncomeDatePicker(true);
                    }
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6366f1" style={styles.inputIcon} />
                  <Text style={styles.modernInputText}>
                    {new Date(activeTab === 'expense' ? formData.date : incomeForm.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6366f1" />
                </TouchableOpacity>
              </View>

              <View style={styles.halfField}>
                <Text style={styles.modernLabel}>Note</Text>
                <View style={styles.noteInputContainer}>
                  <Ionicons name="text-outline" size={20} color="#6366f1" style={styles.inputIcon} />
                  <TextInput
                    ref={noteInputRef}
                    style={styles.modernInput}
                    placeholder="Add Note"
                    placeholderTextColor="#64748b"
                    value={activeTab === 'expense' ? formData.description : incomeForm.description}
                    onChangeText={handleDescriptionChange}
                    multiline={false}
                    numberOfLines={1}
                    textAlignVertical="center"
                    // Android-specific props to fix highlighting
                    underlineColorAndroid="transparent"
                    selectionColor="rgba(255, 255, 255, 0.08)"
                    cursorColor="rgba(255, 255, 255, 0.08)"
                    // Prevent keyboard from closing
                    blurOnSubmit={false}
                    returnKeyType="next"
                    // Additional focus retention props
                    autoFocus={false}
                    editable={true}
                    // Additional props to prevent keyboard dismissal
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                    onFocus={() => console.log('Note focused, current value:', activeTab === 'expense' ? formData.description : incomeForm.description)}
                    onBlur={() => console.log('Note blurred, final value:', activeTab === 'expense' ? formData.description : incomeForm.description)}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity 
              onPress={activeTab === 'expense' ? handleSubmit : handleIncomeSubmit} 
              style={styles.modernSubmitButton}
            >
              <LinearGradient
                colors={activeTab === 'expense' ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
                style={styles.modernSubmitGradient}
              >
                <Ionicons 
                  name={activeTab === 'expense' ? "remove-circle-outline" : "add-circle-outline"} 
                  size={22} 
                  color="#ffffff" 
                />
                <Text style={styles.modernSubmitText}>
                  Add {activeTab === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const StatsScreen = () => (
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
          {renderStatsCard({
            title: 'Net Amount',
            amount: netAmount,
            icon: 'wallet',
            gradient: netAmount >= 0 ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']
          })}
          {renderStatsCard({
            title: 'Month Projection',
            amount: projectedNet,
            icon: 'calendar',
            gradient: projectedNet >= 0 ? ['#6366f1', '#4f46e5'] : ['#f59e0b', '#d97706'],
            showInfo: true,
            onInfoPress: () => setShowProjectionInfo(true)
          })}
          
          {/* Monthly Actions */}
          {viewingMonth === currentMonth && (
            <TouchableOpacity 
              style={styles.monthlyReportButton}
              onPress={openMonthlyReport}
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

        {/* Monthly Overview */}
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
                  <Text style={styles.overviewValue}>${avgDailySpending.toFixed(2)}</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Days Passed / Total Days</Text>
                  <Text style={styles.overviewValue}>{daysPassed} / {daysInMonth}</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Projected Monthly Spending</Text>
                  <Text style={[styles.overviewValue, { color: '#ef4444' }]}>
                    ${projectedMonthlySpending.toFixed(2)}
                  </Text>
                </View>
              </View>
              <LinearGradient
                colors={projectedNet >= 0 ? ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)'] : ['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)']}
                style={styles.overviewRight}
              >
                <View style={styles.overviewStatus}>
                  <Ionicons
                    name={projectedNet >= 0 ? 'trending-up' : 'trending-down'}
                    size={24}
                    color={projectedNet >= 0 ? '#10b981' : '#ef4444'}
                  />
                  <Text style={[
                    styles.overviewStatusText,
                    { color: projectedNet >= 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {projectedNet >= 0 ? 'On Track for Profit' : 'Warning: Potential Loss'}
                  </Text>
                </View>
                <Text style={[
                  styles.overviewStatusDescription,
                  { color: projectedNet >= 0 ? '#10b981' : '#ef4444' }
                ]}>
                  {projectedNet >= 0 
                    ? `You're spending wisely! At this rate, you'll save $${projectedNet.toFixed(2)} this month.`
                    : `You're overspending! Consider reducing daily expenses by $${Math.abs(projectedNet / daysRemaining).toFixed(2)} per day.`
                  }
                </Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </View>
    </ScrollView>
  );

  const GoalsScreen = () => (
    <ScrollView 
      style={styles.screenContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
    >
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Financial Goals</Text>
        <Text style={styles.screenSubtitle}>Set and track your money goals</Text>
      </View>
      
      <View style={styles.goalsScreenContent}>
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)'] as any}
          style={styles.goalsCard}
        >
          <View style={styles.goalsCardHeader}>
            <Ionicons name="flag-outline" size={24} color="#6366f1" />
            <Text style={styles.goalsCardTitle}>Monthly Savings Goal</Text>
          </View>
          <Text style={styles.goalsCardDescription}>
            Track your progress towards monthly savings targets
          </Text>
          <View style={styles.goalsProgress}>
            <View style={styles.goalsProgressBar}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={[styles.goalsProgressFill, { width: `${Math.min((netAmount / 1000) * 100, 100)}%` }]}
              />
            </View>
            <Text style={styles.goalsProgressText}>
              ${Math.max(0, netAmount).toFixed(2)} / $1,000
            </Text>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)'] as any}
          style={styles.goalsCard}
        >
          <View style={styles.goalsCardHeader}>
            <Ionicons name="trending-up-outline" size={24} color="#10b981" />
            <Text style={styles.goalsCardTitle}>Spending Reduction</Text>
          </View>
          <Text style={styles.goalsCardDescription}>
            Reduce daily spending to stay within budget
          </Text>
          <View style={styles.goalsProgress}>
            <View style={styles.goalsProgressBar}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={[styles.goalsProgressFill, { width: `${Math.min((avgDailySpending / 50) * 100, 100)}%` }]}
              />
            </View>
            <Text style={styles.goalsProgressText}>
              ${avgDailySpending.toFixed(2)} / $50 daily target
            </Text>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)'] as any}
          style={styles.goalsCard}
        >
          <View style={styles.goalsCardHeader}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#ef4444" />
            <Text style={styles.goalsCardTitle}>Emergency Fund</Text>
          </View>
          <Text style={styles.goalsCardDescription}>
            Build a safety net for unexpected expenses
          </Text>
          <View style={styles.goalsProgress}>
            <View style={styles.goalsProgressBar}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={[styles.goalsProgressFill, { width: `${Math.min((totalIncome * 0.1 / 500) * 100, 100)}%` }]}
              />
            </View>
            <Text style={styles.goalsProgressText}>
              ${(totalIncome * 0.1).toFixed(2)} / $500 monthly goal
            </Text>
          </View>
        </LinearGradient>
      </View>
    </ScrollView>
  );

  // Bottom Navigation Component
  const BottomNavigation = () => (
    <View style={styles.bottomNavigation}>
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
                        <Text style={[styles.centerTabText, activeBottomTab === 'add' && styles.bottomTabTextActive]}>
                  Add
                </Text>
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
    </View>
  );

  // Render current screen based on active tab
  const renderCurrentScreen = useCallback(() => {
    switch (activeBottomTab) {
      case 'category':
        return <CategoryScreen />;
      case 'transactions':
        return <TransactionsScreen />;
      case 'add':
        return <AddTransactionScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'goals':
        return <GoalsScreen />;
      default:
        return <AddTransactionScreen />;
    }
  }, [activeBottomTab]);

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
          <View style={styles.headerContent}>
            <View style={styles.headerLeftSection}>
              <LinearGradient
                colors={['#6c5ce7', '#a29bfe']}
                style={styles.headerIconContainer}
              >
                <Ionicons name="wallet-outline" size={26} color="#ffffff" />
              </LinearGradient>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Spendly</Text>
                <Text style={styles.headerSubtitle}>Your Money, Organized</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.monthSelector}
              onPress={openMonthPicker}
            >
              <Ionicons name="calendar-outline" size={16} color="#a29bfe" style={styles.monthSelectorIcon} />
              <Text style={styles.monthSelectorText}>
                {new Date(viewingMonth + '-01').toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#a29bfe" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {renderCurrentScreen()}
        </View>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </LinearGradient>

      {/* Picker Modals */}
      <PickerModal
        visible={showCategoryPicker}
        items={categories}
        selectedValue={formData.category}
        onSelect={(category) => setFormData({...formData, category})}
        onClose={() => setShowCategoryPicker(false)}
        title="Select Category"
      />

      <PickerModal
        visible={showSourcePicker}
        items={incomeSources}
        selectedValue={incomeForm.source}
        onSelect={(source) => setIncomeForm({...incomeForm, source})}
        onClose={() => setShowSourcePicker(false)}
        title="Select Income Source"
      />

      {/* Date Pickers */}
      {showExpenseDatePicker && (
        <View style={styles.datePickerOverlay}>
          <BlurView intensity={100} style={styles.datePickerBlur}>
            <View style={styles.datePickerModal}>
              <LinearGradient
                colors={['#1a1a2e', '#16213e']}
                style={styles.datePickerContainer}
              >
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowExpenseDatePicker(false)}
                    style={styles.datePickerCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                <DateTimePicker
                  value={new Date(formData.date)}
                  mode="date"
                  display="spinner"
                  onChange={handleExpenseDateChange}
                  textColor="#ffffff"
                  style={styles.datePickerSpinner}
                />
                
                <TouchableOpacity 
                  onPress={() => setShowExpenseDatePicker(false)}
                  style={styles.datePickerDoneButton}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.datePickerDoneGradient}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </BlurView>
        </View>
      )}

      {showIncomeDatePicker && (
        <View style={styles.datePickerOverlay}>
          <BlurView intensity={100} style={styles.datePickerBlur}>
            <View style={styles.datePickerModal}>
              <LinearGradient
                colors={['#1a1a2e', '#16213e']}
                style={styles.datePickerContainer}
              >
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowIncomeDatePicker(false)}
                    style={styles.datePickerCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                <DateTimePicker
                  value={new Date(incomeForm.date)}
                  mode="date"
                  display="spinner"
                  onChange={handleIncomeDateChange}
                  textColor="#ffffff"
                  style={styles.datePickerSpinner}
                />
                
                <TouchableOpacity 
                  onPress={() => setShowIncomeDatePicker(false)}
                  style={styles.datePickerDoneButton}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.datePickerDoneGradient}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </BlurView>
        </View>
      )}

      {/* Month Picker Modal */}
      <PickerModal
        visible={showMonthPicker}
        items={Array.from(new Set([currentMonth, ...monthlyArchives.map(arch => arch.month)]))}
        selectedValue={viewingMonth}
        onSelect={(month) => setViewingMonth(month)}
        onClose={closeMonthPicker}
        title="Select Month"
        renderItem={(month) => {
          const date = new Date(month + '-01');
          const monthName = date.toLocaleDateString('en-US', { month: 'long' });
          const year = date.getFullYear();
          const isCurrentMonth = month === currentMonth;
          
          return (
            <View style={styles.monthPickerItem}>
              <View style={styles.monthPickerItemContent}>
                <Text style={styles.monthPickerItemText}>
                  {monthName} {year}
                </Text>
                {isCurrentMonth && (
                  <View style={styles.currentMonthBadge}>
                    <Text style={styles.currentMonthBadgeText}>Current</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Monthly Report Modal */}
      {showMonthlyReport && (
        <View style={styles.reportModalOverlay}>
          <BlurView intensity={100} style={styles.reportModalBlur}>
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
                    {new Date(viewingMonth + '-01').toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })} Report
                  </Text>
                  <TouchableOpacity 
                    onPress={closeMonthlyReport}
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
                          ${totalIncome.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.reportStatItem}>
                        <Text style={styles.reportStatLabel}>Total Spent</Text>
                        <Text style={[styles.reportStatValue, { color: '#ef4444' }]}>
                          ${totalSpent.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.reportStatItem}>
                        <Text style={styles.reportStatLabel}>Net Amount</Text>
                        <Text style={[styles.reportStatValue, { color: netAmount >= 0 ? '#10b981' : '#ef4444' }]}>
                          ${netAmount.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.reportStatItem}>
                        <Text style={styles.reportStatLabel}>Transactions</Text>
                        <Text style={styles.reportStatValue}>
                          {viewingMonthData.expenses.length + viewingMonthData.income.length}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Top Categories */}
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Top Spending Categories</Text>
                    {Object.entries(categoryTotals)
                      .filter(([_, total]) => total > 0)
                      .sort(([_, a], [__, b]) => b - a)
                      .slice(0, 5)
                      .map(([category, total]) => (
                        <View key={category} style={styles.reportCategoryItem}>
                          <LinearGradient
                            colors={(categoryColors[category]?.gradient || ['#475569', '#64748b']) as any}
                            style={styles.reportCategoryTag}
                          >
                            <Text style={styles.reportCategoryName}>{category}</Text>
                          </LinearGradient>
                          <Text style={styles.reportCategoryAmount}>${total.toFixed(2)}</Text>
                        </View>
                      ))
                    }
                  </View>

                  {/* Month Comparison */}
                  {monthComparison && (
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Month Comparison</Text>
                      <View style={styles.comparisonGrid}>
                        <View style={styles.comparisonItem}>
                          <Text style={styles.comparisonLabel}>Spending Change</Text>
                          <Text style={[
                            styles.comparisonValue, 
                            { color: monthComparison.spendingChange > 0 ? '#ef4444' : '#10b981' }
                          ]}>
                            {monthComparison.spendingChange > 0 ? '+' : ''}${monthComparison.spendingChange.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.comparisonItem}>
                          <Text style={styles.comparisonLabel}>Income Change</Text>
                          <Text style={[
                            styles.comparisonValue, 
                            { color: monthComparison.incomeChange > 0 ? '#10b981' : '#ef4444' }
                          ]}>
                            {monthComparison.incomeChange > 0 ? '+' : ''}${monthComparison.incomeChange.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  
                  {monthlyArchives.length > 0 && !monthComparison && (
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Month Comparison</Text>
                      <Text style={styles.noComparisonText}>
                        No previous month data for comparison
                      </Text>
                    </View>
                  )}
                </ScrollView>
                
                <TouchableOpacity 
                  onPress={closeMonthlyReport}
                  style={styles.reportModalButton}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.reportModalButtonGradient}
                  >
                    <Text style={styles.reportModalButtonText}>Close Report</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </BlurView>
        </View>
      )}

      {/* Projection Info Modal */}
      {showProjectionInfo && (
        <View style={styles.infoModalOverlay}>
          <BlurView intensity={100} style={styles.infoModalBlur}>
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog />
    </View>
  );
}); // Close BudgetTracker component

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    // Ensure proper layout with bottom navigation
    position: 'relative',
  },
  backgroundGradient: {
    flex: 1,
    // Ensure proper coverage with bottom navigation
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginHorizontal: 0,
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: 4,
  },
  headerGradient: {
    padding: 24,
    borderRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#6c5ce7',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    fontWeight: '500',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.5)',
    shadowColor: '#6c5ce7',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    // Ensure clean background without weird highlights
    overflow: 'hidden',
  },
  monthSelectorText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    marginRight: 4,
  },
  monthSelectorIcon: {
    marginRight: 6,
  },
  statsContainer: {
    paddingHorizontal: 0,
    marginBottom: 24,
  },
  statsCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    height: 100,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  statsCardGradient: {
    padding: 20,
    borderRadius: 20,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statsCardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statsCardTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    flex: 1,
  },
  infoButton: {
    padding: 2,
    marginLeft: 8,
  },
  statsCardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  projectionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
  monthlyReportButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  monthlyReportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  monthlyReportText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  formContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  formGradient: {
    borderRadius: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    overflow: 'hidden',
  },
  activeTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  activeTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  formContent: {
    padding: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  formGroup: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  overviewContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  overviewGradient: {
    padding: 24,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewContent: {
    flexDirection: 'column',
    gap: 20,
  },
  overviewLeft: {
    width: '100%',
  },
  overviewRight: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  overviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  overviewLabel: {
    fontSize: 14,
    color: '#a3a3a3',
    flex: 1,
    fontWeight: '500',
    marginRight: 12,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'right',
  },
  overviewStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewStatusText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  overviewStatusDescription: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  transactionsContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  transactionsGradient: {
    borderRadius: 20,
  },
  transactionsHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  transactionHeaderTop: {
    marginBottom: 20,
  },
  transactionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  transactionTabsWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 4,
  },
  modernTransactionTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  modernTransactionTabActive: {
    backgroundColor: 'transparent',
  },
  tabContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
  },
  tabIconContainer: {
    width: 20,
    marginLeft: -10,
    marginRight: 6,
  },
  modernTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modernTabTextActive: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  modernTabActiveGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    zIndex: 1,
  },
  transactionsList: {
    flex: 1,
    marginBottom: -15,
  },
  transactionItem: {
    marginHorizontal:0,
    marginVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  transactionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    marginRight: 14,
  },
  categoryTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  transactionDate: {
    fontSize: 13,
    color: '#a3a3a3',
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 15,
    color: '#a3a3a3',
    fontWeight: '500',
  },
  deleteButton: {
    marginLeft: 18,
    borderRadius: 22,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    padding: 14,
    borderRadius: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyStateGradient: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    width: '100%',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#a3a3a3',
    fontWeight: '500',
  },
  categoryContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: 24,
    borderRadius: 20,
  },
  categoryContent: {},
  categoryBreakdownItem: {
    marginBottom: 20,
    backgroundColor: Platform.OS === 'android' ? 'rgba(26, 26, 46, 1.0)' : 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryPercentage: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyCategoryGradient: {
    textAlign: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyCategoryIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyCategoryText: {
    textAlign: 'center',
    color: '#a3a3a3',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyCategorySubtext: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 8,
    lineHeight: 20,
  },
  categoryBreakdownContainer: {
    marginTop: 8,
  },
  categoryBreakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  categorySummaryCard: {
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categorySummaryGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  categorySummaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a29bfe',
    marginLeft: 8,
  },
  categorySummaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    maxHeight: height * 0.7,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalItemIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  modalItemSelectedGradient: {
    borderRadius: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 12,
  },
  modalItemTextSelected: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 12,
  },
  
  // Modern Form Styles
  formHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  formTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  formIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 4,
  },
  modernTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  modernTabActive: {
    backgroundColor: 'transparent',
  },
  modernTabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: 1,
  },
  modernTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
  },
  modernTabTextWithMargin: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  modernTabTextActiveWithMargin: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  modernFormGrid: {
    gap: 24,
  },
  fullWidthField: {
    width: '100%',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 20,
  },
  halfField: {
    flex: 1,
  },
  modernLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 56,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    // Additional Android styling to prevent weird highlights
    overflow: 'hidden',
    // Try different background approach for Android
    ...(Platform.OS === 'android' && { backgroundColor: 'rgba(26, 26, 46, 0.95)' }),
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 56,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    // Additional Android styling to prevent weird highlights
    overflow: 'hidden',
    // Try different background approach for Android
    ...(Platform.OS === 'android' && { backgroundColor: 'rgba(26, 26, 46, 0.95)' }),
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 56,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    // Additional Android styling to prevent weird highlights
    overflow: 'hidden',
    // Try different background approach for Android
    ...(Platform.OS === 'android' && { backgroundColor: 'rgba(26, 26, 46, 0.95)' }),
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    // Fix Android input highlighting
    textAlignVertical: 'center',
    includeFontPadding: false,
    padding: 0,
    margin: 0,
    // Remove Android default styling
    backgroundColor: 'transparent',
    // Additional Android fixes
    textAlign: 'left',
    // More Android-specific fixes
    paddingHorizontal: 0,
    paddingVertical: 0,
    // Try to override Android default styling
    ...(Platform.OS === 'android' && { 
      backgroundColor: 'transparent',
      color: '#ffffff'
    }),
  },
  modernInputText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  modernSubmitButton: {
    marginTop: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modernSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  modernSubmitText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  
  // Date Picker Styles
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  datePickerBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    width: width * 0.9,
    borderRadius: 20,
    overflow: 'hidden',
  },
  datePickerContainer: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  datePickerCloseButton: {
    padding: 4,
  },
  datePickerSpinner: {
    height: 200,
    marginVertical: 20,
  },
  datePickerDoneButton: {
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  datePickerDoneGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Nested FlatList Styles
  nestedFlatList: {
    flex: 1,
    minHeight: 0,
  },
  nestedFlatListContent: {
    paddingBottom: 100, // Add space for bottom navigation
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
    width: width * 0.85,
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
    width: width * 0.92,
    maxHeight: height * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
  },
  reportModalContent: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: height * 0.85,
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
    maxHeight: height * 0.6,
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
    borderRadius: 12,
  },
  reportCategoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  reportCategoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#a3a3a3',
    marginBottom: 4,
    fontWeight: '500',
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noComparisonText: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reportModalButton: {
    margin: 24,
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
  
  // Month Picker Item Styles
  monthPickerItem: {
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  monthPickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  monthPickerItemText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  currentMonthBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  currentMonthBadgeText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    // Ensure content doesn't get hidden behind bottom navigation
    marginBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  screenHeader: {
    marginBottom: 24,
    paddingTop: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    lineHeight: 22,
  },
  categoryScreenContent: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
  },
  transactionsScreenContent: {
    flex: 1,
    paddingHorizontal: 2,
    paddingBottom: 0,
  },
  addTransactionContent: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
  },
  statsScreenContent: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
  },
  goalsScreenContent: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 2,
    paddingBottom: Platform.OS === 'ios' ? 32 : 28,
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    // Safe area handling for both platforms
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
    // Ensure bottom navigation appears above all content
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
    minHeight: 60,
    // Ensure proper touch target size
    minWidth: 60,
  },
  bottomTabActive: {
    transform: [{ scale: 1.05 }],
    // Add smooth transition for better UX
    opacity: 1,
  },
  bottomTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomTabTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
  centerTab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Ensure proper positioning
    position: 'relative',
    zIndex: 1,
    // Move center tab down and reduce top padding
    top: -2,
    paddingTop: 0,
  },
  centerTabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 0,
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 120 : 110, // Reduced padding to match moved border
    // Ensure proper scrolling behavior
    position: 'relative',
  },
  goalsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalsCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  goalsCardDescription: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 16,
    lineHeight: 20,
  },
  goalsProgress: {
    marginTop: 8,
  },
  goalsProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  goalsProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalsProgressText: {
    fontSize: 12,
    color: '#a3a3a3',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Delete Confirmation Dialog Styles
  deleteConfirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  deleteConfirmContainer: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  deleteConfirmGradient: {
    padding: 24,
    borderRadius: 20,
  },
  deleteConfirmHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteConfirmIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteConfirmIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteConfirmMessage: {
    fontSize: 16,
    color: '#a3a3a3',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  deleteConfirmCancelButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteConfirmCancelGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  deleteConfirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteConfirmDeleteButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteConfirmDeleteGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 14,
  },
  deleteConfirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default BudgetTracker;