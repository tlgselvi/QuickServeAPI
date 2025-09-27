import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { dashboardAPI } from '../services/api';
import { DashboardData } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AnalyticsScreenProps {
  navigation: any;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await dashboardAPI.getDashboardData();
      setDashboardData(response);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getSavingsRate = () => {
    if (!dashboardData) return 0;
    const total = dashboardData.monthlyIncome + dashboardData.monthlyExpenses;
    if (total === 0) return 0;
    return ((dashboardData.monthlyIncome - dashboardData.monthlyExpenses) / dashboardData.monthlyIncome) * 100;
  };

  const renderStatCard = (title: string, value: string, icon: string, color: string) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={24} color="white" />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const renderChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Aylık Gelir vs Gider</Text>
      <View style={styles.chart}>
        <View style={styles.chartBars}>
          <View style={styles.chartBarContainer}>
            <View style={[styles.chartBar, styles.incomeBar, { height: 120 }]} />
            <Text style={styles.chartLabel}>Gelir</Text>
            <Text style={styles.chartValue}>
              {formatCurrency(dashboardData?.monthlyIncome || 0)}
            </Text>
          </View>
          <View style={styles.chartBarContainer}>
            <View style={[styles.chartBar, styles.expenseBar, { height: 80 }]} />
            <Text style={styles.chartLabel}>Gider</Text>
            <Text style={styles.chartValue}>
              {formatCurrency(dashboardData?.monthlyExpenses || 0)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Analiz verileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <LinearGradient colors={['#3b82f6', '#1e40af']} style={styles.header}>
        <Text style={styles.headerTitle}>Finansal Analiz</Text>
        <Text style={styles.headerSubtitle}>Detaylı finansal raporlarınız</Text>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {renderStatCard(
          'Toplam Bakiye',
          formatCurrency(dashboardData?.totalBalance || 0),
          'wallet',
          '#059669'
        )}
        {renderStatCard(
          'Aylık Gelir',
          formatCurrency(dashboardData?.monthlyIncome || 0),
          'trending-up',
          '#3b82f6'
        )}
        {renderStatCard(
          'Aylık Gider',
          formatCurrency(dashboardData?.monthlyExpenses || 0),
          'trending-down',
          '#dc2626'
        )}
        {renderStatCard(
          'Tasarruf Oranı',
          `${getSavingsRate().toFixed(1)}%`,
          'pie-chart',
          '#8b5cf6'
        )}
      </View>

      {/* Chart */}
      {renderChart()}

      {/* Balance Breakdown */}
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Bakiye Dağılımı</Text>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownHeader}>
            <View style={styles.breakdownIcon}>
              <Ionicons name="business" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.breakdownLabel}>Şirket Hesapları</Text>
          </View>
          <Text style={styles.breakdownValue}>
            {formatCurrency(dashboardData?.companyBalance || 0)}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownHeader}>
            <View style={styles.breakdownIcon}>
              <Ionicons name="person" size={20} color="#10b981" />
            </View>
            <Text style={styles.breakdownLabel}>Şahsi Hesaplar</Text>
          </View>
          <Text style={styles.breakdownValue}>
            {formatCurrency(dashboardData?.personalBalance || 0)}
          </Text>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.recentContainer}>
        <Text style={styles.recentTitle}>Son İşlemler</Text>
        {dashboardData?.recentTransactions?.slice(0, 5).map((transaction, index) => (
          <View key={transaction.id || index} style={styles.recentItem}>
            <View style={styles.recentInfo}>
              <Text style={styles.recentDescription}>{transaction.description}</Text>
              <Text style={styles.recentCategory}>{transaction.category}</Text>
            </View>
            <Text style={[
              styles.recentAmount,
              transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
            ]}>
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Finansal Öneriler</Text>
        <View style={styles.insightItem}>
          <Ionicons name="bulb" size={20} color="#f59e0b" />
          <Text style={styles.insightText}>
            Tasarruf oranınızı artırmak için giderlerinizi gözden geçirin
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Ionicons name="trending-up" size={20} color="#059669" />
          <Text style={styles.insightText}>
            Gelirleriniz giderlerinizden fazla, harika!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');

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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: (width - 56) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  chart: {
    alignItems: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 40,
  },
  chartBarContainer: {
    alignItems: 'center',
  },
  chartBar: {
    width: 40,
    borderRadius: 8,
    marginBottom: 8,
  },
  incomeBar: {
    backgroundColor: '#059669',
  },
  expenseBar: {
    backgroundColor: '#dc2626',
  },
  chartLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
  },
  breakdownContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  recentContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recentInfo: {
    flex: 1,
  },
  recentDescription: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 2,
  },
  recentCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  incomeAmount: {
    color: '#059669',
  },
  expenseAmount: {
    color: '#dc2626',
  },
  insightsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },
});

export default AnalyticsScreen;
