import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PickerModalProps } from '../types';

interface ExtendedPickerModalProps extends PickerModalProps {
  selectedValue?: string;
  renderItem?: (item: string) => React.ReactNode;
  fadeAnim: Animated.Value;
}

const PickerModal: React.FC<ExtendedPickerModalProps> = memo(({ 
  visible, 
  items, 
  selectedValue, 
  onSelect, 
  onClose, 
  title,
  renderItem,
  fadeAnim
}) => {
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBlur} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
          >
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
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={true}
              bounces={true}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
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
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalContentContainer: {
    paddingVertical: 10,
    paddingBottom: 20,
  },
  modalItem: {
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalItemSelectedGradient: {
    borderRadius: 12,
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  modalItemIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 15,
  },
  modalItemText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  modalItemTextSelected: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
});

export default PickerModal;
