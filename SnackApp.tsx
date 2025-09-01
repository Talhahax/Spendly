import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function BudgetTracker() {
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    source: 'Salary',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('expense');
  const [refreshing, setRefreshing] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const incomeSources = [
    'Salary', 'Freelance', 'Business', 'Investment', 'Bonus', 
    'Side Hustle', 'Rental', 'Gift', 'Refund', 'Other'
  ];

  const categories = [
    'Food', 'Transportation', 'Shopping', 'Entertainment', 
    'Bills & Utilities', 'Healthcare', 'Education', 'Personal Care',
    'Groceries', 'Coffee & Snacks', 'Gas', 'Other'
  ];

  const categoryColors = {
    'Food': { bg: '#7f1d1d', text: '#fca5a5' },
    'Transportation': { bg: '#1e3a8a', text: '#93c5fd' },
    'Shopping': { bg: '#581c87', text: '#c4b5fd' },
    'Entertainment': { bg: '#831843', text: '#f9a8d4' },
    'Bills & Utilities': { bg: '#9a3412', text: '#fed7aa' },
    'Healthcare': { bg: '#14532d', text: '#86efac' },
    'Education': { bg: '#312e81', text: '#a5b4fc' },
    'Personal Care': { bg: '#854d0e', text: '#fde047' },
    'Groceries': { bg: '#064e3b', text: '#6ee7b7' },
    'Coffee & Snacks': { bg: '#92400e', text: '#fbbf24' },
    'Gas': { bg: '#374151', text: '#d1d5db' },
    'Other': { bg: '#475569', text: '#cbd5e1' }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const expensesData = await AsyncStorage.getItem('expenses');
      const incomeData = await AsyncStorage.getItem('income');
      
      if (expensesData) setExpenses(JSON.parse(expensesData));
      if (incomeData) setIncome(JSON.parse(incomeData));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async (expensesData, incomeData) => {
    try {
      await AsyncStorage.setItem('expenses', JSON.stringify(expensesData));
      await AsyncStorage.setItem('income', JSON.stringify(incomeData));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleSubmit = () => {
    if (formData.amount && parseFloat(formData.amount) > 0) {
      const newExpense = {
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
    }
  };

  const handleIncomeSubmit = () => {
    if (incomeForm.amount && parseFloat(incomeForm.amount) > 0) {
      const newIncome = {
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
    }
  };

  const deleteExpense = (id) => {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updatedExpenses = expenses.filter(exp => exp.id !== id);
          setExpenses(updatedExpenses);
          saveData(updatedExpenses, income);
        }
      }
    ]);
  };

  const deleteIncome = (id) => {
    Alert.alert('Delete Income', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updatedIncome = income.filter(inc => inc.id !== id);
          setIncome(updatedIncome);
          saveData(expenses, updatedIncome);
        }
      }
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  };

  // Calculations
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const netAmount = totalIncome - totalSpent;

  const currentDate = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysPassed = currentDate.getDate();
  const daysRemaining = daysInMonth - daysPassed;
  const avgDailySpending = daysPassed > 0 ? totalSpent / daysPassed : 0;
  const projectedMonthlySpending = totalSpent + (avgDailySpending * daysRemaining);
  const projectedNet = totalIncome - projectedMonthlySpending;

  const getCategoryTotal = (category) => {
    return expenses
      .filter(exp => exp.category === category)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const renderStatsCard = ({ title, amount, icon, color, isProjection = false }) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsCardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.statsCardContent}>
          <Text style={styles.statsCardTitle}>{title}</Text>
          <Text style={[styles.statsCardAmount, { color }]}>
            ${Math.abs(amount).toFixed(2)}
          </Text>
          {isProjection && <Text style={styles.projectionLabel}>Projected</Text>}
        </View>
      </View>
    </View>
  );

  const renderExpenseItem = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <View style={[styles.categoryTag, { backgroundColor: categoryColors[item.category]?.bg || '#475569' }]}>
            <Text style={[styles.categoryTagText, { color: categoryColors[item.category]?.text || '#cbd5e1' }]}>
              {item.category}
            </Text>
          </View>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
        <Text style={styles.expenseAmount}>-${item.amount.toFixed(2)}</Text>
        {item.description && <Text style={styles.transactionDescription}>{item.description}</Text>}
      </View>
      <TouchableOpacity onPress={() => deleteExpense(item.id)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const renderIncomeItem = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <View style={styles.incomeTag}>
            <Text style={styles.incomeTagText}>{item.source}</Text>
          </View>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
        <Text style={styles.incomeAmount}>+${item.amount.toFixed(2)}</Text>
        {item.description && <Text style={styles.transactionDescription}>{item.description}</Text>}
      </View>
      <TouchableOpacity onPress={() => deleteIncome(item.id)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const PickerModal = ({ visible, items, selectedValue, onSelect, onClose, title }) => {
    if (!visible) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {items.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.modalItem, selectedValue === item && styles.modalItemSelected]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.modalItemText, selectedValue === item && styles.modalItemTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="wallet-outline" size={28} color="#10b981" />
            <Text style={styles.headerTitle}>Budget Tracker</Text>
          </View>
          <Text style={styles.headerSubtitle}>Track your daily expenses and income</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {renderStatsCard({ title: 'Total Income', amount: totalIncome, icon: 'trending-up', color: '#10b981' })}
          {renderStatsCard({ title: 'Total Spent', amount: totalSpent, icon: 'trending-down', color: '#ef4444' })}
          {renderStatsCard({ title: 'Net Amount', amount: netAmount, icon: 'wallet', color: netAmount >= 0 ? '#10b981' : '#ef4444' })}
          {renderStatsCard({ title: 'Month Projection', amount: projectedNet, icon: 'calendar', color: projectedNet >= 0 ? '#3b82f6' : '#f59e0b', isProjection: true })}
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
              onPress={() => setActiveTab('expense')}
            >
              <Text style={[styles.tabText, activeTab === 'expense' && styles.activeTabText]}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'income' && styles.activeTab]}
              onPress={() => setActiveTab('income')}
            >
              <Text style={[styles.tabText, activeTab === 'income' && styles.activeTabText]}>Add Income</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'expense' ? (
            <View style={styles.formContent}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#6b7280"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({...formData, amount: text})}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Category</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker(true)}>
                    <Text style={styles.pickerText}>{formData.category}</Text>
                    <Ionicons name="chevron-down" size={20} color="#a3a3a3" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.date}
                    onChangeText={(text) => setFormData({...formData, date: text})}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="What did you buy?"
                    placeholderTextColor="#6b7280"
                    value={formData.description}
                    onChangeText={(text) => setFormData({...formData, description: text})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.submitButtonText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContent}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#6b7280"
                    value={incomeForm.amount}
                    onChangeText={(text) => setIncomeForm({...incomeForm, amount: text})}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Source</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setShowSourcePicker(true)}>
                    <Text style={styles.pickerText}>{incomeForm.source}</Text>
                    <Ionicons name="chevron-down" size={20} color="#a3a3a3" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date</Text>
                  <TextInput
                    style={styles.input}
                    value={incomeForm.date}
                    onChangeText={(text) => setIncomeForm({...incomeForm, date: text})}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Income source details"
                    placeholderTextColor="#6b7280"
                    value={incomeForm.description}
                    onChangeText={(text) => setIncomeForm({...incomeForm, description: text})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitButtonIncome} onPress={handleIncomeSubmit}>
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.submitButtonText}>Add Income</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Monthly Overview */}
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Monthly Financial Overview</Text>
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
            <View style={[styles.overviewRight, { backgroundColor: projectedNet >= 0 ? '#10b98120' : '#ef444420' }]}>
              <View style={styles.overviewStatus}>
                <Ionicons
                  name={projectedNet >= 0 ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={projectedNet >= 0 ? '#10b981' : '#ef4444'}
                />
                <Text style={[styles.overviewStatusText, { color: projectedNet >= 0 ? '#10b981' : '#ef4444' }]}>
                  {projectedNet >= 0 ? 'On Track for Profit' : 'Warning: Potential Loss'}
                </Text>
              </View>
              <Text style={[styles.overviewStatusDescription, { color: projectedNet >= 0 ? '#10b981' : '#ef4444' }]}>
                {projectedNet >= 0 
                  ? `You're spending wisely! At this rate, you'll save $${projectedNet.toFixed(2)} this month.`
                  : `You're overspending! Consider reducing daily expenses by $${Math.abs(projectedNet / daysRemaining).toFixed(2)} per day.`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.bottomSection}>
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <View style={styles.transactionTabs}>
                <TouchableOpacity
                  style={[styles.transactionTab, activeTab === 'expense' && styles.transactionTabActive]}
                  onPress={() => setActiveTab('expense')}
                >
                  <Text style={[styles.transactionTabText, activeTab === 'expense' && styles.transactionTabTextActive]}>
                    Expenses
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.transactionTab, activeTab === 'income' && styles.transactionTabActive]}
                  onPress={() => setActiveTab('income')}
                >
                  <Text style={[styles.transactionTabText, activeTab === 'income' && styles.transactionTabTextActive]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.transactionsList}>
              {activeTab === 'expense' ? (
                expenses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="trending-down-outline" size={48} color="#374151" />
                    <Text style={styles.emptyStateText}>No expenses recorded yet</Text>
                    <Text style={styles.emptyStateSubtext}>Add your first expense above</Text>
                  </View>
                ) : (
                  <FlatList
                    data={expenses.slice(0, 10)}
                    renderItem={renderExpenseItem}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                )
              ) : (
                income.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="trending-up-outline" size={48} color="#374151" />
                    <Text style={styles.emptyStateText}>No income recorded yet</Text>
                    <Text style={styles.emptyStateSubtext}>Add your first income entry above</Text>
                  </View>
                ) : (
                  <FlatList
                    data={income.slice(0, 10)}
                    renderItem={renderIncomeItem}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                )
              )}
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={styles.categoryContainer}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            <View style={styles.categoryContent}>
              {totalSpent === 0 ? (
                <Text style={styles.emptyCategoryText}>Add some expenses to see your spending breakdown</Text>
              ) : (
                categories.map((category) => {
                  const total = getCategoryTotal(category);
                  const percentage = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
                  if (total === 0) return null;
                  
                  return (
                    <View key={category} style={styles.categoryBreakdownItem}>
                      <View style={styles.categoryBreakdownHeader}>
                        <View style={[styles.categoryTag, { backgroundColor: categoryColors[category]?.bg || '#475569' }]}>
                          <Text style={[styles.categoryTagText, { color: categoryColors[category]?.text || '#cbd5e1' }]}>
                            {category}
                          </Text>
                        </View>
                        <Text style={styles.categoryAmount}>${total.toFixed(2)}</Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${percentage}%` }]} />
                      </View>
                      <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}% of total spending</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  headerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginLeft: 12 },
  headerSubtitle: { fontSize: 16, color: '#a3a3a3' },
  statsContainer: { paddingHorizontal: 20, paddingVertical: 20 },
  statsCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  statsCardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statsCardContent: { flex: 1 },
  statsCardTitle: { fontSize: 14, color: '#a3a3a3', marginBottom: 4 },
  statsCardAmount: { fontSize: 22, fontWeight: 'bold' },
  projectionLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  formContainer: { backgroundColor: '#1a1a1a', marginHorizontal: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 16, fontWeight: '500', color: '#a3a3a3' },
  activeTabText: { color: '#3b82f6' },
  formContent: { padding: 20 },
  formRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  formGroup: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: '#ffffff', marginBottom: 8 },
  input: { backgroundColor: '#262626', borderWidth: 1, borderColor: '#333333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: '#ffffff' },
  picker: { backgroundColor: '#262626', borderWidth: 1, borderColor: '#333333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 16, color: '#ffffff' },
  submitButton: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitButtonIncome: { backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  overviewContainer: { backgroundColor: '#1a1a1a', marginHorizontal: 20, borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  overviewContent: { flexDirection: 'row', gap: 16 },
  overviewLeft: { flex: 1 },
  overviewRight: { flex: 1, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#333333' },
  overviewItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  overviewLabel: { fontSize: 14, color: '#a3a3a3', flex: 1 },
  overviewValue: { fontSize: 14, fontWeight: '500', color: '#ffffff' },
  overviewStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  overviewStatusText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  overviewStatusDescription: { fontSize: 14, lineHeight: 20 },
  bottomSection: { paddingHorizontal: 20, paddingBottom: 20 },
  transactionsContainer: { backgroundColor: '#1a1a1a', borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  transactionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  transactionTabs: { flexDirection: 'row', gap: 8 },
  transactionTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#262626' },
  transactionTabActive: { backgroundColor: '#3b82f6' },
  transactionTabText: { fontSize: 12, color: '#a3a3a3', fontWeight: '500' },
  transactionTabTextActive: { color: '#ffffff' },
  transactionsList: { maxHeight: 400 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  transactionContent: { flex: 1 },
  transactionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  categoryTagText: { fontSize: 12, fontWeight: '600' },
  incomeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#14532d', marginRight: 8 },
  incomeTagText: { fontSize: 12, fontWeight: '600', color: '#86efac' },
  transactionDate: { fontSize: 12, color: '#a3a3a3' },
  expenseAmount: { fontSize: 14, fontWeight: '600', color: '#ef4444', marginBottom: 4 },
  incomeAmount: { fontSize: 14, fontWeight: '600', color: '#10b981', marginBottom: 4 },
  transactionDescription: { fontSize: 14, color: '#a3a3a3' },
  deleteButton: { padding: 8, marginLeft: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 16, color: '#a3a3a3', marginTop: 12, marginBottom: 4 },
  emptyStateSubtext: { fontSize: 14, color: '#6b7280' },
  categoryContainer: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  categoryContent: {},
  categoryBreakdownItem: { marginBottom: 16 },
  categoryBreakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryAmount: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  progressBarContainer: { height: 8, backgroundColor: '#262626', borderRadius: 4, marginBottom: 4 },
  progressBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
  categoryPercentage: { fontSize: 12, color: '#a3a3a3' },
  emptyCategoryText: { textAlign: 'center', color: '#a3a3a3', paddingVertical: 32 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContainer: { backgroundColor: '#1a1a1a', borderRadius: 12, width: width * 0.8, maxHeight: '70%', borderWidth: 1, borderColor: '#333333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  modalContent: { maxHeight: 300 },
  modalItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  modalItemSelected: { backgroundColor: '#3b82f6' },
  modalItemText: { fontSize: 16, color: '#ffffff' },
  modalItemTextSelected: { fontWeight: '600' },
});
