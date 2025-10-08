import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { accountsAPI } from '../services/api';
import { Account } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AccountsScreenProps {
  navigation: any;
}

const AccountsScreen: React.FC<AccountsScreenProps> = ({ navigation }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'company' | 'personal'>('all');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await accountsAPI.getAccounts();
      setAccounts(response);
    } catch (error) {
      logger.error('Error loading accounts:', error);
      Alert.alert('Hata', 'Hesaplar yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const filteredAccounts = accounts.filter(account => {
    if (filter === 'all') return true;
    return account.type === filter;
  });

  const getAccountIcon = (type: string) => {
    return type === 'company' ? 'business' : 'person';
  };

  const getAccountTypeColor = (type: string) => {
    return type === 'company' ? '#3b82f6' : '#10b981';
  };

  const renderAccount = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={styles.accountCard}
      onPress={() => navigation.navigate('AccountDetail', { account: item })}
    >
      <View style={styles.accountHeader}>
        <View style={styles.accountInfo}>
          <View style={styles.accountTitleRow}>
            <Ionicons 
              name={getAccountIcon(item.type)} 
              size={24} 
              color={getAccountTypeColor(item.type)} 
            />
            <Text style={styles.accountName}>{item.bankName}</Text>
            <View style={[
              styles.accountTypeBadge,
              { backgroundColor: getAccountTypeColor(item.type) }
            ]}>
              <Text style={styles.accountTypeText}>
                {item.type === 'company' ? 'Şirket' : 'Şahsi'}
              </Text>
            </View>
          </View>
          <Text style={styles.accountNumber}>{item.accountNumber}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
      
      <View style={styles.accountBalance}>
        <Text style={styles.balanceLabel}>Bakiye</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(item.balance, item.currency)}
        </Text>
      </View>

      {/* Sub-accounts preview */}
      {item.subAccounts && (
        <View style={styles.subAccountsPreview}>
          <Text style={styles.subAccountsLabel}>Alt Ürünler:</Text>
          <View style={styles.subAccountsList}>
            <Text style={styles.subAccountItem}>• Kredi Kartı</Text>
            <Text style={styles.subAccountItem}>• Kredi</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: 'Tümü' },
        { key: 'company', label: 'Şirket' },
        { key: 'personal', label: 'Şahsi' },
      ].map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.filterButton,
            filter === key && styles.activeFilterButton,
          ]}
          onPress={() => setFilter(key as any)}
        >
          <Text style={[
            styles.filterButtonText,
            filter === key && styles.activeFilterButtonText,
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Hesaplar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#3b82f6', '#1e40af']} style={styles.header}>
        <Text style={styles.headerTitle}>Hesaplarım</Text>
        <Text style={styles.headerSubtitle}>
          {filteredAccounts.length} hesap
        </Text>
      </LinearGradient>

      {renderFilterButtons()}

      <FlatList
        data={filteredAccounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccount}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>Hesap bulunamadı</Text>
            <Text style={styles.emptySubtext}>
              Yeni hesap eklemek için + butonuna tıklayın
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  listContainer: {
    padding: 20,
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  accountTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  accountTypeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  accountNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  accountBalance: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  subAccountsPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  subAccountsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  subAccountsList: {
    flexDirection: 'row',
    gap: 16,
  },
  subAccountItem: {
    fontSize: 14,
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AccountsScreen;
