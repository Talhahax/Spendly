import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Expense, Income } from '../types';
import { formatDate } from '../utils';
import { CATEGORY_COLORS } from '../constants';

interface TransactionItemProps {
  item: Expense | Income;
  type: 'expense' | 'income';
  onDelete: (id: number) => void;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}

const TransactionItem: React.FC<TransactionItemProps> = memo(({
  item,
  type,
  onDelete,
  fadeAnim,
  slideAnim
}) => {
  const isExpense = type === 'expense';
  const categoryOrSource = isExpense ? (item as Expense).category : (item as Income).source;
  const colors = isExpense 
    ? CATEGORY_COLORS[categoryOrSource] 
    : { gradient: ['#10b981', '#059669'] };

  return (
    <Animated.View 
      style={[
        styles.transactionItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={isExpense 
          ? ['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.05)'] as any
          : ['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)'] as any
        }
        style={styles.transactionGradient}
      >
        <View style={styles.transactionContent}>
          <View style={styles.transactionHeader}>
            <LinearGradient
              colors={(colors?.gradient || ['#475569', '#64748b']) as any}
              style={styles.categoryTag}
            >
              <Text style={styles.categoryTagText}>{categoryOrSource}</Text>
            </LinearGradient>
            <View style={styles.dateContainer}>
              <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <Text style={[
            styles.transactionAmount,
            { color: isExpense ? '#ef4444' : '#10b981' }
          ]}>
            {isExpense ? '-' : '+'}${item.amount.toFixed(2)}
          </Text>
          {item.description && (
            <Text style={styles.transactionDescription}>{item.description}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
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
  );
});

const styles = StyleSheet.create({
  transactionItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  transactionGradient: {
    borderRadius: 16,
  },
  transactionContent: {
    padding: 16,
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 48, // Add padding to account for delete button
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
  dateContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  transactionDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TransactionItem;
