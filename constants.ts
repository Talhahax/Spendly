import { Dimensions } from 'react-native';
import { CategoryColors } from './types';

// Screen dimensions
export const { width, height } = Dimensions.get('window');

// Income sources
export const INCOME_SOURCES: string[] = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Bonus', 
  'Side Hustle', 'Rental', 'Gift', 'Refund', 'Other'
];

// Expense categories
export const EXPENSE_CATEGORIES: string[] = [
  'Food', 'Transportation', 'Shopping', 'Entertainment', 
  'Bills & Utilities', 'Healthcare', 'Education', 'Personal Care',
  'Groceries', 'Coffee & Snacks', 'Gas', 'Savings', 'Other'
];

// Debug: Log expense categories to ensure Savings is included
console.log('Debug - Expense Categories:', {
  categories: EXPENSE_CATEGORIES,
  hasSavings: EXPENSE_CATEGORIES.includes('Savings'),
  savingsIndex: EXPENSE_CATEGORIES.indexOf('Savings'),
  totalCategories: EXPENSE_CATEGORIES.length
});

// Category colors configuration
export const CATEGORY_COLORS: CategoryColors = {
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
  'Savings': { bg: '#0f4c75', text: '#00b894', gradient: ['#00b894', '#00a085'] },
  'Other': { bg: '#57606f', text: '#7bed9f', gradient: ['#7bed9f', '#5f27cd'] }
};

// Debug: Log category colors to ensure Savings has proper styling
console.log('Debug - Category Colors:', {
  hasSavingsColor: 'Savings' in CATEGORY_COLORS,
  savingsColor: CATEGORY_COLORS['Savings'],
  allCategories: Object.keys(CATEGORY_COLORS),
  totalColorCategories: Object.keys(CATEGORY_COLORS).length
});

// Goal categories
export const GOAL_CATEGORIES = [
  'savings', 'debt', 'investment', 'emergency', 'purchase', 'other'
] as const;

// Goal colors
export const GOAL_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
] as const;

// Goal icons
export const GOAL_ICONS = [
  'flag-outline', 'trending-up-outline', 'shield-checkmark-outline', 'home-outline',
  'car-outline', 'airplane-outline', 'gift-outline', 'star-outline'
] as const;

// Storage keys
export const STORAGE_KEYS = {
  EXPENSES: 'expenses',
  INCOME: 'income',
  MONTHLY_ARCHIVES: 'monthlyArchives',
  GOALS: 'goals',
  SAVINGS: 'savings',
} as const;

// Debug: Log storage keys to ensure all are properly defined
console.log('Debug - Storage Keys:', {
  storageKeys: STORAGE_KEYS,
  hasSavingsKey: 'SAVINGS' in STORAGE_KEYS,
  savingsKey: STORAGE_KEYS.SAVINGS,
  totalKeys: Object.keys(STORAGE_KEYS).length
});

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 300,
  NORMAL: 500,
  SLOW: 800,
} as const;

// Notification configuration
export const NOTIFICATION_CONFIG = {
  REMINDER_HOUR: 19, // 7:00 PM
  DAYS_BEFORE_MONTH_END: 5,
} as const;

// Default form values
export const DEFAULT_FORM_VALUES = {
  EXPENSE: {
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  },
  INCOME: {
    amount: '',
    source: 'Salary',
    description: '',
    date: new Date().toISOString().split('T')[0]
  },
  GOAL: {
    title: '',
    description: '',
    targetAmount: '',
    category: 'savings',
    targetDate: '',
    color: '#6366f1',
    icon: 'flag-outline'
  }
} as const;
