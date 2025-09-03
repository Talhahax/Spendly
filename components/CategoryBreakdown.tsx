import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_COLORS, EXPENSE_CATEGORIES } from '../constants';

interface CategoryBreakdownProps {
  categoryTotals: { [category: string]: number };
  totalSpent: number;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = memo(({
  categoryTotals,
  totalSpent,
  fadeAnim,
  slideAnim
}) => {
  return (
    <>
      {EXPENSE_CATEGORIES.map((category) => {
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
                colors={(CATEGORY_COLORS[category]?.gradient || ['#475569', '#64748b']) as any}
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
                colors={(CATEGORY_COLORS[category]?.gradient || ['#475569', '#64748b']) as any}
                style={[
                  styles.progressBar,
                  { width: `${percentage}%` }
                ]}
              />
            </View>
            <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}% of total spending</Text>
          </Animated.View>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  categoryBreakdownItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default CategoryBreakdown;
