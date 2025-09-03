import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Expense, Income, MonthlyArchive } from '../types';
import { 
  calculateTotalAmount, 
  calculateCategoryBreakdown, 
  calculateMonthlyProjection,
  formatCurrency,
  getCurrentMonth,
  formatMonthYear
} from '../utils';
import { StatsCard, CategoryBreakdown } from '../components';

interface StatsScreenProps {
  expenses: Expense[];
  income: Income[];
  monthlyArchives: MonthlyArchive[];
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}

const StatsScreen: React.FC<StatsScreenProps> = ({
  expenses,
  income,
  monthlyArchives,
  fadeAnim,
  slideAnim
}) => {
  const [showProjectionInfo, setShowProjectionInfo] = useState<boolean>(false);

  const currentMonth = getCurrentMonth();
  const currentMonthExpenses = expenses.filter(expense => expense.date.startsWith(currentMonth));
  const currentMonthIncome = income.filter(incomeItem => incomeItem.date.startsWith(currentMonth));

  const totalSpent = useMemo(() => calculateTotalAmount(currentMonthExpenses), [currentMonthExpenses]);
  const totalIncome = useMemo(() => calculateTotalAmount(currentMonthIncome), [currentMonthIncome]);
  const netAmount = useMemo(() => totalIncome - totalSpent, [totalIncome, totalSpent]);

  const categoryTotals = useMemo(() => calculateCategoryBreakdown(currentMonthExpenses), [currentMonthExpenses]);

  const projectionData = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    return {
      projectedSpending: calculateMonthlyProjection(totalSpent, daysInMonth),
      projectedIncome: calculateMonthlyProjection(totalIncome, daysInMonth),
      projectedNet: calculateMonthlyProjection(totalIncome, daysInMonth) - calculateMonthlyProjection(totalSpent, daysInMonth)
    };
  }, [totalSpent, totalIncome]);

  const monthComparison = useMemo(() => {
    const currentArchive = monthlyArchives.find(archive => archive.month === currentMonth);
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousMonthString = previousMonth.toISOString().slice(0, 7);
    const previousArchive = monthlyArchives.find(archive => archive.month === previousMonthString);

    if (!currentArchive || !previousArchive) {
      return null;
    }

    return {
      spendingChange: currentArchive.totalSpent - previousArchive.totalSpent,
      incomeChange: currentArchive.totalIncome - previousArchive.totalIncome,
      netChange: currentArchive.netAmount - previousArchive.netAmount
    };
  }, [monthlyArchives, currentMonth]);

  const handleProjectionInfoPress = useCallback(() => {
    setShowProjectionInfo(!showProjectionInfo);
  }, [showProjectionInfo]);

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <Text style={styles.headerSubtitle}>{formatMonthYear(currentMonth)}</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsCardsContainer}>
        <StatsCard
          title="Total Spent"
          amount={totalSpent}
          icon="trending-down"
          gradient={['#ef4444', '#dc2626']}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
        />
        
        <StatsCard
          title="Total Income"
          amount={totalIncome}
          icon="trending-up"
          gradient={['#10b981', '#059669']}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
        />
      </View>

      <View style={styles.statsCardsContainer}>
        <StatsCard
          title="Net Amount"
          amount={netAmount}
          icon="wallet"
          gradient={netAmount >= 0 ? ['#3b82f6', '#2563eb'] : ['#f59e0b', '#d97706']}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
        />
        
        <StatsCard
          title="Projected Spending"
          amount={projectionData.projectedSpending}
          icon="analytics"
          gradient={['#8b5cf6', '#7c3aed']}
          isProjection={true}
          showInfo={true}
          onInfoPress={handleProjectionInfoPress}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
        />
      </View>

      {/* Projection Info */}
      {showProjectionInfo && (
        <Animated.View 
          style={[
            styles.projectionInfo,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.1)', 'rgba(124, 58, 237, 0.05)']}
            style={styles.projectionInfoGradient}
          >
            <View style={styles.projectionInfoHeader}>
              <Ionicons name="information-circle" size={20} color="#8b5cf6" />
              <Text style={styles.projectionInfoTitle}>Projection Calculation</Text>
            </View>
            <Text style={styles.projectionInfoText}>
              Projections are calculated based on your current daily average spending/income and the remaining days in the month.
            </Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Monthly Comparison */}
      {monthComparison && (
        <Animated.View 
          style={[
            styles.comparisonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.comparisonTitle}>vs Last Month</Text>
          <View style={styles.comparisonItems}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Spending</Text>
              <Text style={[
                styles.comparisonValue,
                { color: monthComparison.spendingChange >= 0 ? '#ef4444' : '#10b981' }
              ]}>
                {monthComparison.spendingChange >= 0 ? '+' : ''}{formatCurrency(monthComparison.spendingChange)}
              </Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Income</Text>
              <Text style={[
                styles.comparisonValue,
                { color: monthComparison.incomeChange >= 0 ? '#10b981' : '#ef4444' }
              ]}>
                {monthComparison.incomeChange >= 0 ? '+' : ''}{formatCurrency(monthComparison.incomeChange)}
              </Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Net</Text>
              <Text style={[
                styles.comparisonValue,
                { color: monthComparison.netChange >= 0 ? '#10b981' : '#ef4444' }
              ]}>
                {monthComparison.netChange >= 0 ? '+' : ''}{formatCurrency(monthComparison.netChange)}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Animated.View 
          style={[
            styles.categoryBreakdownContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.categoryBreakdownTitle}>Spending by Category</Text>
          <CategoryBreakdown
            categoryTotals={categoryTotals}
            totalSpent={totalSpent}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
          />
        </Animated.View>
      )}
    </ScrollView>
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
  comparisonContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  comparisonItems: {
    gap: 12,
  },
  comparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '600',
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
});

export default StatsScreen;
