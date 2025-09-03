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
      const expensesData = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      const incomeData = await AsyncStorage.getItem(STORAGE_KEYS.INCOME);
      const archivesData = await AsyncStorage.getItem(STORAGE_KEYS.MONTHLY_ARCHIVES);
      
      if (expensesData) {
        setExpenses(JSON.parse(expensesData));
      }
      if (incomeData) {
        setIncome(JSON.parse(incomeData));
      }
      if (archivesData) {
        setMonthlyArchives(JSON.parse(archivesData));
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const saveData = useCallback(async (expensesData: Expense[], incomeData: Income[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expensesData));
      await AsyncStorage.setItem(STORAGE_KEYS.INCOME, JSON.stringify(incomeData));
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
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    saveData(updatedExpenses, income);
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
