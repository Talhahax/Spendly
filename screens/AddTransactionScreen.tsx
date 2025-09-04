import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TabType, ExpenseFormData, IncomeFormData } from '../types';
import { INCOME_SOURCES, EXPENSE_CATEGORIES } from '../constants';
import { validateFormData } from '../utils';
import { PickerModal } from '../components';

interface AddTransactionScreenProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  formData: ExpenseFormData;
  setFormData: (data: ExpenseFormData) => void;
  incomeForm: IncomeFormData;
  setIncomeForm: (data: IncomeFormData) => void;
  showCategoryPicker: boolean;
  setShowCategoryPicker: (show: boolean) => void;
  showSourcePicker: boolean;
  setShowSourcePicker: (show: boolean) => void;
  showExpenseDatePicker: boolean;
  setShowExpenseDatePicker: (show: boolean) => void;
  showIncomeDatePicker: boolean;
  setShowIncomeDatePicker: (show: boolean) => void;
  onExpenseSubmit: () => void;
  onIncomeSubmit: () => void;
  fadeAnim: Animated.Value;
}

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  activeTab,
  setActiveTab,
  formData,
  setFormData,
  incomeForm,
  setIncomeForm,
  showCategoryPicker,
  setShowCategoryPicker,
  showSourcePicker,
  setShowSourcePicker,
  showExpenseDatePicker,
  setShowExpenseDatePicker,
  showIncomeDatePicker,
  setShowIncomeDatePicker,
  onExpenseSubmit,
  onIncomeSubmit,
  fadeAnim
}) => {
  const amountInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);

  const handleAmountChange = useCallback((text: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanedText.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    if (activeTab === 'expense') {
      setFormData({ ...formData, amount: cleanedText });
    } else {
      setIncomeForm({ ...incomeForm, amount: cleanedText });
    }
  }, [activeTab, formData, incomeForm, setFormData, setIncomeForm]);

  const handleDescriptionChange = useCallback((text: string) => {
    if (activeTab === 'expense') {
      setFormData({ ...formData, description: text });
    } else {
      setIncomeForm({ ...incomeForm, description: text });
    }
  }, [activeTab, formData, incomeForm, setFormData, setIncomeForm]);

  const handleExpenseDateChange = useCallback((_event: any, selectedDate?: Date) => {
    setShowExpenseDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        date: selectedDate.toISOString().split('T')[0]
      });
    }
  }, [formData, setFormData, setShowExpenseDatePicker]);

  const handleIncomeDateChange = useCallback((_event: any, selectedDate?: Date) => {
    setShowIncomeDatePicker(false);
    if (selectedDate) {
      setIncomeForm({
        ...incomeForm,
        date: selectedDate.toISOString().split('T')[0]
      });
    }
  }, [incomeForm, setIncomeForm, setShowIncomeDatePicker]);

  const currentFormData = activeTab === 'expense' ? formData : incomeForm;
  const isValid = validateFormData(currentFormData);

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Add Transaction</Text>
        <Text style={styles.screenSubtitle}>Track your money flow</Text>
      </View>
      
      <View style={styles.addTransactionContent}>
        <View style={styles.modernTabContainer}>
          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'expense' && styles.modernTabActive
            ]}
            onPress={() => setActiveTab('expense')}
          >
            {activeTab === 'expense' && (
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.modernTabGradient}
              />
            )}
            <View style={styles.modernTabContent}>
              <Ionicons 
                name="trending-down" 
                size={18} 
                color={activeTab === 'expense' ? '#ffffff' : '#94a3b8'} 
              />
              <Text style={[
                styles.modernTabTextWithMargin,
                activeTab === 'expense' && styles.modernTabTextActiveWithMargin
              ]}>
                Expense
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'income' && styles.modernTabActive
            ]}
            onPress={() => setActiveTab('income')}
          >
            {activeTab === 'income' && (
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.modernTabGradient}
              />
            )}
            <View style={styles.modernTabContent}>
              <Ionicons 
                name="trending-up" 
                size={18} 
                color={activeTab === 'income' ? '#ffffff' : '#94a3b8'} 
              />
              <Text style={[
                styles.modernTabTextWithMargin,
                activeTab === 'income' && styles.modernTabTextActiveWithMargin
              ]}>
                Income
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.modernFormGrid}>
          <View style={styles.fullWidthField}>
            <Text style={styles.modernLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Ionicons name="cash-outline" size={20} color="#6366f1" style={styles.inputIcon} />
              <TextInput
                ref={amountInputRef}
                style={styles.modernInput}
                placeholder={activeTab === 'expense' ? "Enter expense amount" : "Enter income amount"}
                placeholderTextColor="#64748b"
                value={activeTab === 'expense' ? formData.amount : incomeForm.amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                underlineColorAndroid="transparent"
                selectionColor="rgba(255, 255, 255, 0.08)"
                cursorColor="rgba(255, 255, 255, 0.08)"
                blurOnSubmit={false}
                returnKeyType="next"
                autoFocus={false}
                editable={true}
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
              />
            </View>
          </View>

          <View style={styles.fullWidthField}>
            <Text style={styles.modernLabel}>
              {activeTab === 'expense' ? 'Category' : 'Source'}
            </Text>
            <TouchableOpacity
              style={styles.modernInputContainer}
              onPress={() => {
                if (activeTab === 'expense') {
                  setShowCategoryPicker(true);
                } else {
                  setShowSourcePicker(true);
                }
              }}
            >
              <Ionicons 
                name={activeTab === 'expense' ? "pricetag-outline" : "business-outline"} 
                size={20} 
                color="#6366f1" 
                style={styles.inputIcon} 
              />
              <Text style={styles.modernInputText}>
                {activeTab === 'expense' ? formData.category : incomeForm.source}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.halfField}>
              <Text style={styles.modernLabel}>Date</Text>
              <TouchableOpacity 
                style={styles.modernInputContainer}
                onPress={() => {
                  if (activeTab === 'expense') {
                    setShowExpenseDatePicker(true);
                  } else {
                    setShowIncomeDatePicker(true);
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#6366f1" style={styles.inputIcon} />
                <Text style={styles.modernInputText}>
                  {new Date(activeTab === 'expense' ? formData.date : incomeForm.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6366f1" />
              </TouchableOpacity>
            </View>

            <View style={styles.halfField}>
              <Text style={styles.modernLabel}>Note</Text>
              <View style={styles.noteInputContainer}>
                <Ionicons name="text-outline" size={20} color="#6366f1" style={styles.inputIcon} />
                <TextInput
                  ref={noteInputRef}
                  style={styles.modernInput}
                  placeholder="Add Note"
                  placeholderTextColor="#64748b"
                  value={activeTab === 'expense' ? formData.description : incomeForm.description}
                  onChangeText={handleDescriptionChange}
                  multiline={false}
                  numberOfLines={1}
                  textAlignVertical="center"
                  underlineColorAndroid="transparent"
                  selectionColor="rgba(255, 255, 255, 0.08)"
                  cursorColor="rgba(255, 255, 255, 0.08)"
                  blurOnSubmit={false}
                  returnKeyType="next"
                  autoFocus={false}
                  editable={true}
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity 
            onPress={activeTab === 'expense' ? onExpenseSubmit : onIncomeSubmit} 
            style={[styles.modernSubmitButton, !isValid && styles.modernSubmitButtonDisabled]}
            disabled={!isValid}
          >
            <LinearGradient
              colors={activeTab === 'expense' ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
              style={styles.modernSubmitGradient}
            >
              <Ionicons 
                name={activeTab === 'expense' ? "remove-circle-outline" : "add-circle-outline"} 
                size={22} 
                color="#ffffff" 
              />
              <Text style={styles.modernSubmitText}>
                Add {activeTab === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Pickers */}
      {showExpenseDatePicker && (
        <DateTimePicker
          value={new Date(formData.date)}
          mode="date"
          display="default"
          onChange={handleExpenseDateChange}
        />
      )}
      
      {showIncomeDatePicker && (
        <DateTimePicker
          value={new Date(incomeForm.date)}
          mode="date"
          display="default"
          onChange={handleIncomeDateChange}
        />
      )}

      {/* Category Picker Modal */}
      <PickerModal
        visible={showCategoryPicker}
        items={EXPENSE_CATEGORIES}
        selectedValue={formData.category}
        onSelect={(category) => setFormData({ ...formData, category })}
        onClose={() => setShowCategoryPicker(false)}
        title="Select Category"
        fadeAnim={fadeAnim}
      />

      {/* Source Picker Modal */}
      <PickerModal
        visible={showSourcePicker}
        items={INCOME_SOURCES}
        selectedValue={incomeForm.source}
        onSelect={(source) => setIncomeForm({ ...incomeForm, source })}
        onClose={() => setShowSourcePicker(false)}
        title="Select Source"
        fadeAnim={fadeAnim}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  addTransactionContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  modernTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  modernTabActive: {
    backgroundColor: 'transparent',
  },
  modernTabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: 1,
  },
  modernTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
  },
  modernTabTextWithMargin: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  modernTabTextActiveWithMargin: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  modernFormGrid: {
    gap: 16,
  },
  fullWidthField: {
    width: '100%',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 20,
  },
  halfField: {
    flex: 1,
  },
  modernLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 48,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 48,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 48,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  modernInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    textAlignVertical: 'center',
    includeFontPadding: false,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    textAlign: 'left',
    paddingHorizontal: 0,
  },
  modernInputText: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  modernSubmitButton: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modernSubmitButtonDisabled: {
    opacity: 0.5,
  },
  modernSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  modernSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
});

export default AddTransactionScreen;
