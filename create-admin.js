const { db } = require('./server/db.ts');
const { users } = require('./shared/schema.ts');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

async function createAdminUser() {
  try {
    console.log('🔐 Admin kullanıcısı oluşturuluyor...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUserId = randomUUID();

    const [adminUser] = await db.insert(users).values({
      id: adminUserId,
      email: 'admin@finbot.com',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    console.log('✅ Admin kullanıcısı oluşturuldu!');
    console.log('📧 Email: admin@finbot.com');
    console.log('🔑 Şifre: admin123');
    
    return adminUser;
  } catch (error) {
    console.error('❌ Admin kullanıcısı oluşturma hatası:', error);
    throw error;
  }
}

createAdminUser()
  .then(() => {
    console.log('✅ Script tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script hatası:', error);
    process.exit(1);
  });
