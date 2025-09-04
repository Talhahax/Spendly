import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Income, MonthlyArchive } from '../types';
import { STORAGE_KEYS } from '../constants';

export const useData = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [monthlyArchives, setMonthlyArchives] = useState<MonthlyArchive[]>([]);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      console.log('Debug - useData loadData called');
      
      const expensesData = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      const incomeData = await AsyncStorage.getItem(STORAGE_KEYS.INCOME);
      const archivesData = await AsyncStorage.getItem(STORAGE_KEYS.MONTHLY_ARCHIVES);
      
      console.log('Debug - useData loadData raw data:', {
        expensesDataExists: !!expensesData,
        incomeDataExists: !!incomeData,
        archivesDataExists: !!archivesData
      });
      
      if (expensesData) {
        const parsedExpenses = JSON.parse(expensesData);
        setExpenses(parsedExpenses);
        console.log('Debug - useData loadData expenses loaded:', {
          expensesCount: parsedExpenses.length,
          savingsExpenses: parsedExpenses.filter((e: Expense) => e.category === 'Savings')
        });
      }
      if (incomeData) {
        const parsedIncome = JSON.parse(incomeData);
        setIncome(parsedIncome);
        console.log('Debug - useData loadData income loaded:', {
          incomeCount: parsedIncome.length
        });
      }
      if (archivesData) {
        const parsedArchives = JSON.parse(archivesData);
        setMonthlyArchives(parsedArchives);
        console.log('Debug - useData loadData archives loaded:', {
          archivesCount: parsedArchives.length
        });
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const saveData = useCallback(async (expensesData: Expense[], incomeData: Income[]): Promise<void> => {
    try {
      console.log('Debug - useData saveData called:', {
        expensesCount: expensesData.length,
        incomeCount: incomeData.length,
        savingsExpenses: expensesData.filter(e => e.category === 'Savings')
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expensesData));
      await AsyncStorage.setItem(STORAGE_KEYS.INCOME, JSON.stringify(incomeData));
      
      console.log('Debug - useData saveData completed successfully');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }, []);

  const saveArchives = useCallback(async (archives: MonthlyArchive[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MONTHLY_ARCHIVES, JSON.stringify(archives));
    } catch (error) {
      console.error('Error saving archives:', error);
    }
  }, []);

  const addExpense = useCallback((newExpense: Expense): void => {
    console.log('Debug - useData addExpense called:', {
      newExpense,
      currentExpensesCount: expenses.length,
      isSavings: newExpense.category === 'Savings',
      currentExpenses: expenses
    });
    
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    saveData(updatedExpenses, income);
    
    console.log('Debug - useData addExpense completed:', {
      newExpensesCount: updatedExpenses.length,
      updatedExpenses: updatedExpenses
    });
  }, [expenses, income, saveData]);

  const addIncome = useCallback((newIncome: Income): void => {
    const updatedIncome = [newIncome, ...income];
    setIncome(updatedIncome);
    saveData(expenses, updatedIncome);
  }, [expenses, income, saveData]);

  const deleteExpense = useCallback((id: number): void => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id);
    setExpenses(updatedExpenses);
    saveData(updatedExpenses, income);
  }, [expenses, income, saveData]);

  const deleteIncome = useCallback((id: number): void => {
    const updatedIncome = income.filter(incomeItem => incomeItem.id !== id);
    setIncome(updatedIncome);
    saveData(expenses, updatedIncome);
  }, [expenses, income, saveData]);

  const archiveMonth = useCallback(async (monthToArchive: string, monthExpenses: Expense[], monthIncome: Income[]): Promise<void> => {
    try {
      const newArchive = {
        month: monthToArchive,
        expenses: monthExpenses,
        income: monthIncome,
        totalSpent: monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        totalIncome: monthIncome.reduce((sum, incomeItem) => sum + incomeItem.amount, 0),
        netAmount: monthIncome.reduce((sum, incomeItem) => sum + incomeItem.amount, 0) - 
                  monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        createdAt: new Date().toISOString()
      };

      const updatedArchives = [newArchive, ...monthlyArchives];
      setMonthlyArchives(updatedArchives);
      await saveArchives(updatedArchives);

      // Remove archived data from current data
      const updatedExpenses = expenses.filter(expense => !expense.date.startsWith(monthToArchive));
      const updatedIncome = income.filter(incomeItem => !incomeItem.date.startsWith(monthToArchive));
      
      setExpenses(updatedExpenses);
      setIncome(updatedIncome);
      await saveData(updatedExpenses, updatedIncome);

    } catch (error) {
      console.error('Error archiving month:', error);
    }
  }, [expenses, income, monthlyArchives, saveData, saveArchives]);

  return {
    expenses,
    income,
    monthlyArchives,
    loadData,
    saveData,
    saveArchives,
    addExpense,
    addIncome,
    deleteExpense,
    deleteIncome,
    archiveMonth,
    setExpenses,
    setIncome,
    setMonthlyArchives
  };
};
