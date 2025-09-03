import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DeleteConfirmProps } from '../types';

const DeleteConfirmDialog: React.FC<DeleteConfirmProps> = memo(({
  visible,
  item,
  onConfirm,
  onCancel
}) => {
  if (!visible || !item) return null;

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
              Delete {item.type === 'expense' ? 'Expense' : 'Income'}
            </Text>
            <Text style={styles.deleteConfirmMessage}>
              Are you sure you want to delete "{item.description}"?
            </Text>
          </View>
          
          <View style={styles.deleteConfirmActions}>
            <TouchableOpacity
              style={styles.deleteConfirmCancelButton}
              onPress={onCancel}
            >
              <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteConfirmDeleteButton}
              onPress={onConfirm}
            >
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
});

const styles = StyleSheet.create({
  deleteConfirmOverlay: {
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
  deleteConfirmContainer: {
    width: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  deleteConfirmGradient: {
    padding: 0,
  },
  deleteConfirmHeader: {
    alignItems: 'center',
    padding: 30,
  },
  deleteConfirmIconContainer: {
    marginBottom: 20,
  },
  deleteConfirmIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteConfirmMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 15,
  },
  deleteConfirmCancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  deleteConfirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteConfirmDeleteButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteConfirmDeleteGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  deleteConfirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default DeleteConfirmDialog;
