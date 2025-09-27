import fs from 'fs/promises';
import path from 'path';
import { storage } from './storage';
import { transactionJsonFileSchema } from '@shared/schema';
import type { Transaction, InsertTransaction } from '@shared/schema';

export class TransactionJsonService {
  private readonly transactionsFilePath = path.join(process.cwd(), 'transactions.json');

  /**
   * Tüm işlemleri transactions.json dosyasına dışa aktar
   */
  async exportTransactionsToJson (): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const transactions = await storage.getTransactions();
      const accounts = await storage.getAccounts();

      // İşlemleri hesap bilgileriyle zenginleştir
      const enrichedTransactions = transactions.map(transaction => {
        const account = accounts.find(acc => acc.id === transaction.accountId);
        return {
          ...transaction,
          accountInfo: account ? {
            bankName: account.bankName,
            accountName: account.accountName,
            type: account.type,
          } : null,
        };
      });

      const exportData = {
        exportDate: new Date().toISOString(),
        totalTransactions: transactions.length,
        transactions: enrichedTransactions,
        summary: {
          totalIncome: transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
          totalExpenses: transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
          totalTransfers: transactions
            .filter(t => t.type === 'transfer_out')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        },
      };

      await fs.writeFile(
        this.transactionsFilePath,
        JSON.stringify(exportData, null, 2),
        'utf8',
      );

      console.log(`${transactions.length} işlem transactions.json dosyasına aktarıldı`);

      return {
        success: true,
        message: `${transactions.length} işlem başarıyla JSON dosyasına aktarıldı`,
        filePath: this.transactionsFilePath,
      };
    } catch (error) {
      console.error('JSON dışa aktarma hatası:', error);
      return {
        success: false,
        message: `JSON dışa aktarma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      };
    }
  }

  /**
   * transactions.json dosyasından işlemleri içe aktar
   */
  async importTransactionsFromJson (overwriteExisting = false): Promise<{ success: boolean; message: string; importedCount?: number }> {
    try {
      // Dosya varlığını kontrol et
      try {
        await fs.access(this.transactionsFilePath);
      } catch {
        return {
          success: false,
          message: 'transactions.json dosyası bulunamadı',
        };
      }

      const fileContent = await fs.readFile(this.transactionsFilePath, 'utf8');
      const rawData = JSON.parse(fileContent);

      // JSON dosya yapısını Zod ile doğrula
      const validation = transactionJsonFileSchema.safeParse(rawData);
      if (!validation.success) {
        return {
          success: false,
          message: `Geçersiz JSON dosyası formatı: ${validation.error.issues.map(i => i.message).join(', ')}`,
        };
      }

      const importData = validation.data;

      const existingTransactions = await storage.getTransactions();
      const existingIds = new Set(existingTransactions.map(t => t.id));

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Transfer çiftlerini takip et
      const transferPairs = new Map<string, Transaction[]>();

      for (const transactionData of importData.transactions) {
        try {
          // Hesap bilgilerini temizle (sadece işlem verisi alınacak)
          const { accountInfo, ...cleanTransaction } = transactionData;

          // ID çakışması kontrolü
          if (existingIds.has(cleanTransaction.id) && !overwriteExisting) {
            skippedCount++;
            continue;
          }

          // Hesap varlığını kontrol et
          const account = await storage.getAccount(cleanTransaction.accountId);
          if (!account) {
            errors.push(`Hesap bulunamadı: ${cleanTransaction.accountId}`);
            continue;
          }

          // İşlem verisini hazırla (ID ve tarih korunur)
          const insertData: InsertTransaction = {
            accountId: cleanTransaction.accountId,
            type: cleanTransaction.type,
            amount: cleanTransaction.amount,
            description: cleanTransaction.description,
            category: cleanTransaction.category || null,
            virmanPairId: cleanTransaction.virmanPairId || null,
          };

          // Transfer işlemlerini özel olarak işle
          if (cleanTransaction.type === 'transfer_in' || cleanTransaction.type === 'transfer_out') {
            if (cleanTransaction.virmanPairId) {
              if (!transferPairs.has(cleanTransaction.virmanPairId)) {
                transferPairs.set(cleanTransaction.virmanPairId, []);
              }
              transferPairs.get(cleanTransaction.virmanPairId)!.push({
                ...cleanTransaction,
                date: typeof cleanTransaction.date === 'string' ? new Date(cleanTransaction.date) : cleanTransaction.date,
              });
            }
            continue; // Transfer işlemlerini daha sonra çiftler halinde işle
          }

          // Normal işlemler için (income/expense) balance-adjusting operation kullan
          let balanceAdjustment = 0;
          const amount = parseFloat(cleanTransaction.amount);

          if (cleanTransaction.type === 'income') {
            balanceAdjustment = amount;
          } else if (cleanTransaction.type === 'expense') {
            balanceAdjustment = -amount;
          }

          if (overwriteExisting && existingIds.has(cleanTransaction.id)) {
            // Mevcut işlemi güncelle (sadece balance adjustment olmadan transaction record güncelle)
            // TODO: Implement transaction update method in storage
            console.log(`İşlem güncelleniyor: ${cleanTransaction.id}`);
            updatedCount++;
          } else {
            // Yeni işlem oluştur ve bakiye ayarlaması yap
            const transaction = await storage.performTransaction(insertData, balanceAdjustment);
            importedCount++;
          }
        } catch (error) {
          errors.push(`İşlem hatası (ID: ${transactionData.id}): ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
        }
      }

      // Transfer çiftlerini işle
      for (const [virmanPairId, transferTransactions] of Array.from(transferPairs.entries())) {
        try {
          if (transferTransactions.length !== 2) {
            errors.push(`Eksik transfer çifti (virmanPairId: ${virmanPairId}): ${transferTransactions.length} işlem`);
            continue;
          }

          const outTransaction = transferTransactions.find((t: any) => t.type === 'transfer_out');
          const inTransaction = transferTransactions.find((t: any) => t.type === 'transfer_in');

          if (!outTransaction || !inTransaction) {
            errors.push(`Geçersiz transfer çifti (virmanPairId: ${virmanPairId})`);
            continue;
          }

          // Transfer pair çakışması kontrolü
          const outExists = existingIds.has(outTransaction.id);
          const inExists = existingIds.has(inTransaction.id);

          if ((outExists || inExists) && !overwriteExisting) {
            skippedCount += 2;
            continue;
          }

          // Transfer işlemini gerçekleştir
          const amount = parseFloat(outTransaction.amount);
          const result = await storage.performTransfer(
            outTransaction.accountId,
            inTransaction.accountId,
            amount,
            outTransaction.description.replace('Virman: ', ''),
            virmanPairId,
          );

          importedCount += 2; // İki işlem eklendi
        } catch (error) {
          errors.push(`Transfer çifti hatası (virmanPairId: ${virmanPairId}): ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
        }
      }

      let message = `${importedCount} işlem başarıyla içe aktarıldı`;
      if (updatedCount > 0) {
        message += `, ${updatedCount} işlem güncellendi`;
      }
      if (skippedCount > 0) {
        message += `, ${skippedCount} işlem atlandı (mevcut)`;
      }
      if (errors.length > 0) {
        message += `, ${errors.length} hata oluştu`;
        console.warn('İçe aktarma hataları:', errors);
      }

      return {
        success: true,
        message,
        importedCount,
      };
    } catch (error) {
      console.error('JSON içe aktarma hatası:', error);
      return {
        success: false,
        message: `JSON içe aktarma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      };
    }
  }

  /**
   * transactions.json dosyasının varlığını ve içeriğini kontrol et
   */
  async checkJsonFile (): Promise<{ exists: boolean; isValid: boolean; transactionCount?: number; lastExport?: string }> {
    try {
      await fs.access(this.transactionsFilePath);

      const fileContent = await fs.readFile(this.transactionsFilePath, 'utf8');
      const data = JSON.parse(fileContent);

      return {
        exists: true,
        isValid: data.transactions && Array.isArray(data.transactions),
        transactionCount: data.totalTransactions || data.transactions?.length || 0,
        lastExport: data.exportDate,
      };
    } catch (error) {
      return {
        exists: false,
        isValid: false,
      };
    }
  }

  /**
   * Belirli tarih aralığındaki işlemleri JSON'a aktar
   */
  async exportTransactionsByDateRange (startDate: Date, endDate: Date): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const allTransactions = await storage.getTransactions();
      const accounts = await storage.getAccounts();

      // Tarih aralığına göre filtrele
      const filteredTransactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      if (filteredTransactions.length === 0) {
        return {
          success: false,
          message: 'Belirtilen tarih aralığında işlem bulunamadı',
        };
      }

      // İşlemleri hesap bilgileriyle zenginleştir
      const enrichedTransactions = filteredTransactions.map(transaction => {
        const account = accounts.find(acc => acc.id === transaction.accountId);
        return {
          ...transaction,
          accountInfo: account ? {
            bankName: account.bankName,
            accountName: account.accountName,
            type: account.type,
          } : null,
        };
      });

      const fileName = `transactions_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.json`;
      const filePath = path.join(process.cwd(), fileName);

      const exportData = {
        exportDate: new Date().toISOString(),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        totalTransactions: filteredTransactions.length,
        transactions: enrichedTransactions,
        summary: {
          totalIncome: filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
          totalExpenses: filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
          totalTransfers: filteredTransactions
            .filter(t => t.type === 'transfer_out')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        },
      };

      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');

      return {
        success: true,
        message: `${filteredTransactions.length} işlem ${fileName} dosyasına aktarıldı`,
        filePath,
      };
    } catch (error) {
      console.error('Tarihli JSON dışa aktarma hatası:', error);
      return {
        success: false,
        message: `JSON dışa aktarma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      };
    }
  }

  /**
   * Kategori bazlı işlem analizi ile JSON dışa aktar
   */
  async exportCategoryAnalysisToJson (): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const transactions = await storage.getTransactions();
      const accounts = await storage.getAccounts();

      // Kategori bazlı analiz
      const categoryAnalysis = new Map<string, {
        totalAmount: number;
        transactionCount: number;
        transactions: Transaction[];
      }>();

      // Kategorize et
      transactions.forEach(transaction => {
        const category = transaction.category || 'Kategorisiz';
        if (!categoryAnalysis.has(category)) {
          categoryAnalysis.set(category, {
            totalAmount: 0,
            transactionCount: 0,
            transactions: [],
          });
        }

        const categoryData = categoryAnalysis.get(category)!;
        categoryData.totalAmount += parseFloat(transaction.amount);
        categoryData.transactionCount++;
        categoryData.transactions.push(transaction);
      });

      const analysisData = {
        exportDate: new Date().toISOString(),
        totalCategories: categoryAnalysis.size,
        categoryBreakdown: Object.fromEntries(
          Array.from(categoryAnalysis.entries()).map(([category, data]) => [
            category,
            {
              totalAmount: data.totalAmount,
              transactionCount: data.transactionCount,
              averageAmount: data.totalAmount / data.transactionCount,
              transactions: data.transactions.map(t => {
                const account = accounts.find(acc => acc.id === t.accountId);
                return {
                  ...t,
                  accountInfo: account ? {
                    bankName: account.bankName,
                    accountName: account.accountName,
                    type: account.type,
                  } : null,
                };
              }),
            },
          ]),
        ),
      };

      const fileName = 'transaction_category_analysis.json';
      const filePath = path.join(process.cwd(), fileName);

      await fs.writeFile(filePath, JSON.stringify(analysisData, null, 2), 'utf8');

      return {
        success: true,
        message: `${categoryAnalysis.size} kategori analizi ${fileName} dosyasına aktarıldı`,
        filePath,
      };
    } catch (error) {
      console.error('Kategori analizi JSON dışa aktarma hatası:', error);
      return {
        success: false,
        message: `JSON dışa aktarma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      };
    }
  }
}

// Singleton instance
export const transactionJsonService = new TransactionJsonService();
