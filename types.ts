// Type definitions for the Budget Tracker app

export interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Income {
  id: number;
  amount: number;
  source: string;
  description: string;
  date: string;
}

export interface ExpenseFormData {
  amount: string;
  category: string;
  description: string;
  date: string;
}

export interface IncomeFormData {
  amount: string;
  source: string;
  description: string;
  date: string;
}

export interface StatsCardProps {
  title: string;
  amount: number;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  gradient: string[];
  isProjection?: boolean;
  showInfo?: boolean;
  onInfoPress?: () => void;
}

export interface MonthlyArchive {
  month: string; // Format: "YYYY-MM"
  expenses: Expense[];
  income: Income[];
  totalSpent: number;
  totalIncome: number;
  netAmount: number;
  createdAt: string;
}

export interface MonthlyComparison {
  currentMonth: MonthlyArchive;
  previousMonth?: MonthlyArchive;
  spendingChange: number;
  incomeChange: number;
  netChange: number;
}

export interface PickerModalProps {
  visible: boolean;
  items: string[];
  onSelect: (item: string) => void;
  onClose: () => void;
  title: string;
}

export interface CategoryColor {
  bg: string;
  text: string;
  gradient: string[];
}

export type CategoryColors = {
  [key: string]: CategoryColor;
};

export type TabType = 'expense' | 'income';

export type BottomTabType = 'category' | 'transactions' | 'add' | 'stats' | 'goals';

export interface DeleteConfirmProps {
  visible: boolean;
  item: { id: number; type: 'expense' | 'income'; description: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface FinancialGoal {
  id: number;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  category: 'savings' | 'debt' | 'investment' | 'emergency' | 'purchase' | 'other';
  targetDate?: string;
  createdAt: string;
  isCompleted: boolean;
  color: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}

export interface GoalFormData {
  title: string;
  description: string;
  targetAmount: string;
  category: string;
  targetDate: string;
  color: string;
  icon: string;
}

export interface Savings {
  id: number;
  amount: number;
  description: string;
  date: string;
  allocatedToGoal?: number; // Goal ID if allocated to a specific goal
}

export interface SavingsAllocation {
  goalId: number;
  amount: number;
  date: string;
}