import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { accountsAPI, transactionsAPI } from '../services/api';
import { Account } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TransferScreenProps {
  navigation: any;
}

const TransferScreen: React.FC<TransferScreenProps> = ({ navigation }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccount, setFromAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await accountsAPI.getAccounts();
      setAccounts(response);
      if (response.length > 1) {
        setFromAccount(response[0].id);
        setToAccount(response[1].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleTransfer = async () => {
    if (!fromAccount || !toAccount || !amount || !description) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (fromAccount === toAccount) {
      Alert.alert('Hata', 'Gönderen ve alan hesap aynı olamaz');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    const fromAccountData = accounts.find(acc => acc.id === fromAccount);
    if (fromAccountData && fromAccountData.balance < transferAmount) {
      Alert.alert('Hata', 'Yetersiz bakiye');
      return;
    }

    try {
      setIsLoading(true);
      await transactionsAPI.transferFunds(fromAccount, toAccount, transferAmount, description);
      
      Alert.alert('Başarılı', 'Virman işlemi tamamlandı', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error transferring funds:', error);
      Alert.alert('Hata', 'Virman işlemi sırasında bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getAccountById = (id: string) => {
    return accounts.find(acc => acc.id === id);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#3b82f6', '#1e40af']} style={styles.header}>
        <Text style={styles.headerTitle}>Virman</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* From Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gönderen Hesap</Text>
          <View style={styles.accountSelector}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountOption,
                  fromAccount === account.id && styles.selectedAccountOption,
                ]}
                onPress={() => setFromAccount(account.id)}
              >
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.bankName}</Text>
                  <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                  <Text style={styles.accountBalance}>
                    {formatCurrency(account.balance, account.currency)}
                  </Text>
                </View>
                {fromAccount === account.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transfer Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="arrow-down" size={32} color="#3b82f6" />
        </View>

        {/* To Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alan Hesap</Text>
          <View style={styles.accountSelector}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountOption,
                  toAccount === account.id && styles.selectedAccountOption,
                ]}
                onPress={() => setToAccount(account.id)}
              >
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.bankName}</Text>
                  <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                  <Text style={styles.accountBalance}>
                    {formatCurrency(account.balance, account.currency)}
                  </Text>
                </View>
                {toAccount === account.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tutar</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Virman açıklaması..."
            multiline
            numberOfLines={3}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Transfer Summary */}
        {fromAccount && toAccount && amount && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Transfer Özeti</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gönderen:</Text>
              <Text style={styles.summaryValue}>
                {getAccountById(fromAccount)?.bankName}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Alan:</Text>
              <Text style={styles.summaryValue}>
                {getAccountById(toAccount)?.bankName}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tutar:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(parseFloat(amount) || 0)}
              </Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.disabledButton]}
          onPress={handleTransfer}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Transfer Ediliyor...' : 'Transfer Et'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  accountSelector: {
    gap: 8,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  selectedAccountOption: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  accountNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 14,
    color: '#059669',
    marginTop: 2,
    fontWeight: '500',
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransferScreen;
