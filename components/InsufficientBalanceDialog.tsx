import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface InsufficientBalanceDialogProps {
  visible: boolean;
  requiredAmount: number;
  currentBalance: number;
  onClose: () => void;
  onAddSavings: () => void;
}

const InsufficientBalanceDialog: React.FC<InsufficientBalanceDialogProps> = memo(({
  visible,
  requiredAmount,
  currentBalance,
  onClose,
  onAddSavings
}) => {
  const shortfall = useMemo(() => requiredAmount - currentBalance, [requiredAmount, currentBalance]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleAddSavings = useCallback(() => {
    onAddSavings();
  }, [onAddSavings]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.iconGradient}
              >
                <Ionicons name="wallet-outline" size={28} color="#ffffff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>
              Insufficient Wallet Balance
            </Text>
            <Text style={styles.message}>
              You need ${shortfall.toFixed(2)} more in your goals wallet to complete this goal.
            </Text>
            <View style={styles.balanceInfo}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Current Balance:</Text>
                <Text style={styles.balanceValue}>${currentBalance.toFixed(2)}</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Required Amount:</Text>
                <Text style={styles.balanceValue}>${requiredAmount.toFixed(2)}</Text>
              </View>
              <View style={[styles.balanceRow, styles.shortfallRow]}>
                <Text style={styles.shortfallLabel}>Shortfall:</Text>
                <Text style={styles.shortfallValue}>${shortfall.toFixed(2)}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addSavingsButton}
              onPress={handleAddSavings}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.addSavingsGradient}
              >
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.addSavingsText}>Add Savings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 0,
  },
  header: {
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  balanceInfo: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortfallRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  shortfallLabel: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: '600',
  },
  shortfallValue: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  addSavingsButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addSavingsGradient: {
    flexDirection: 'row',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addSavingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default InsufficientBalanceDialog;
