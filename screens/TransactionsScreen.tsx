import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Expense, Income, TabType } from '../types';
import { formatDate } from '../utils';
import { TransactionItem } from '../components';

interface TransactionsScreenProps {
  expenses: Expense[];
  income: Income[];
  transactionViewTab: TabType;
  setTransactionViewTab: (tab: TabType) => void;
  onDeleteExpense: (id: number) => void;
  onDeleteIncome: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  fadeAnim: any;
  slideAnim: any;
}

const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  expenses,
  income,
  transactionViewTab,
  setTransactionViewTab,
  onDeleteExpense,
  onDeleteIncome,
  refreshing,
  onRefresh,
  fadeAnim,
  slideAnim
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteItem, setDeleteItem] = useState<{ id: number; type: 'expense' | 'income'; description: string } | null>(null);

  const handleDeletePress = useCallback((id: number, type: 'expense' | 'income', description: string) => {
    setDeleteItem({ id, type, description });
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteItem) {
      if (deleteItem.type === 'expense') {
        onDeleteExpense(deleteItem.id);
      } else {
        onDeleteIncome(deleteItem.id);
      }
    }
    setShowDeleteConfirm(false);
    setDeleteItem(null);
  }, [deleteItem, onDeleteExpense, onDeleteIncome]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteItem(null);
  }, []);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  const sortedIncome = useMemo(() => {
    return [...income].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [income]);

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

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons 
          name={transactionViewTab === 'expense' ? 'receipt-outline' : 'wallet-outline'} 
          size={48} 
          color="rgba(255, 255, 255, 0.3)" 
        />
      </View>
      <Text style={styles.emptyStateTitle}>
        No {transactionViewTab === 'expense' ? 'expenses' : 'income'} yet
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        Start tracking your {transactionViewTab === 'expense' ? 'spending' : 'earnings'} to see them here
      </Text>
    </View>
  ), [transactionViewTab]);

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
      <FlatList
        data={transactionViewTab === 'expense' ? sortedExpenses : sortedIncome}
        renderItem={transactionViewTab === 'expense' ? renderExpenseItem : renderIncomeItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#6366f1']}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TransactionsScreen;
