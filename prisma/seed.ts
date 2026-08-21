import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('password123', 12);

  // ─── Users ────────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arvana-terra.jp' },
    update: {},
    create: {
      email: 'admin@arvana-terra.jp',
      password,
      name: '管理者 太郎',
      role: 'admin',
      prefectures: ['大阪府', '兵庫県'],
      prefecture: '大阪府',
    },
  });

  const landlord1 = await prisma.user.upsert({
    where: { email: 'tanaka@example.jp' },
    update: {},
    create: {
      email: 'tanaka@example.jp',
      password,
      name: '田中 一郎',
      phone: '090-1234-5678',
      role: 'landlord',
      prefectures: ['大阪府', '奈良県'],
      prefecture: '大阪府',
      address: '大阪府大阪市北区梅田1-1-1',
      bio: '大阪・奈良を中心に不動産投資をしています。物件管理15年の経験があります。',
    },
  });

  const landlord2 = await prisma.user.upsert({
    where: { email: 'suzuki@example.jp' },
    update: {},
    create: {
      email: 'suzuki@example.jp',
      password,
      name: '鈴木 花子',
      phone: '080-9876-5432',
      role: 'landlord',
      prefectures: ['京都府', '大阪府'],
      prefecture: '京都府',
      address: '京都府京都市中京区河原町通御池上る下丸屋町394',
      bio: '京都・大阪で複数物件を運営しています。',
    },
  });

  const homeowner = await prisma.user.upsert({
    where: { email: 'yamamoto@example.jp' },
    update: {},
    create: {
      email: 'yamamoto@example.jp',
      password,
      name: '山本 健二',
      phone: '070-5555-4444',
      role: 'homeowner',
      prefectures: ['兵庫県'],
      prefecture: '兵庫県',
      address: '兵庫県神戸市中央区三宮町1-1-1',
    },
  });

  console.log('✓ Users created');

  // ─── Properties ───────────────────────────────────────────────────────────────
  const property1 = await prisma.property.upsert({
    where: { id: 'prop-001' },
    update: {},
    create: {
      id: 'prop-001',
      name: 'グランドール梅田',
      address: '大阪府大阪市北区梅田2-4-9',
      prefecture: '大阪府',
      description: '梅田駅徒歩3分の好立地マンション。1〜3LDKの多様な間取りを揃えています。築5年の新築同様物件。',
      price: 35000000,
      status: 'for_sale',
      isPublic: true,
      ownerId: landlord1.id,
      imageUrls: [],
    },
  });

  const property2 = await prisma.property.upsert({
    where: { id: 'prop-002' },
    update: {},
    create: {
      id: 'prop-002',
      name: 'サンハイツ難波',
      address: '大阪府大阪市浪速区難波中2-10-70',
      prefecture: '大阪府',
      description: '難波駅徒歩5分。商業エリア近接の利便性の高いマンション。全室リノベーション済み。',
      price: 28000000,
      status: 'for_sale',
      isPublic: true,
      ownerId: landlord1.id,
      imageUrls: [],
    },
  });

  const property3 = await prisma.property.upsert({
    where: { id: 'prop-003' },
    update: {},
    create: {
      id: 'prop-003',
      name: '京都御所南レジデンス',
      address: '京都府京都市上京区今出川通烏丸東入相国寺門前町647',
      prefecture: '京都府',
      description: '御所の南側に位置する閑静な住宅地のマンション。伝統的な京都の雰囲気を残しつつ現代的な設備を完備。',
      price: 42000000,
      status: 'for_sale',
      isPublic: true,
      ownerId: landlord2.id,
      imageUrls: [],
    },
  });

  const property4 = await prisma.property.upsert({
    where: { id: 'prop-004' },
    update: {},
    create: {
      id: 'prop-004',
      name: '神戸三宮ハイツ',
      address: '兵庫県神戸市中央区三宮町2-11-1',
      prefecture: '兵庫県',
      description: '三宮駅直結の利便性抜群のマンション。海を望む高層階物件。',
      price: 55000000,
      status: 'draft',
      isPublic: false,
      ownerId: homeowner.id,
      imageUrls: [],
    },
  });

  console.log('✓ Properties created');

  // ─── Lands ────────────────────────────────────────────────────────────────────
  const land1 = await prisma.land.upsert({
    where: { id: 'land-001' },
    update: {},
    create: {
      id: 'land-001',
      name: '奈良市東大寺周辺 売地',
      address: '奈良県奈良市雑司町406-1',
      prefecture: '奈良県',
      description: '東大寺近くの閑静な住宅地。第一種低層住居専用地域。南向き日当たり良好。',
      price: 12000000,
      status: 'for_sale',
      isPublic: true,
      ownerId: landlord1.id,
      imageUrls: [],
    },
  });

  const land2 = await prisma.land.upsert({
    where: { id: 'land-002' },
    update: {},
    create: {
      id: 'land-002',
      name: '京都嵐山 商業用地',
      address: '京都府京都市右京区嵯峨天龍寺芒ノ馬場町68',
      prefecture: '京都府',
      description: '嵐山観光エリア至近の商業用地。多目的利用可能。訪日外国人増加に伴い高い収益性が期待できます。',
      price: 85000000,
      status: 'for_sale',
      isPublic: true,
      ownerId: landlord2.id,
      imageUrls: [],
    },
  });

  const land3 = await prisma.land.upsert({
    where: { id: 'land-003' },
    update: {},
    create: {
      id: 'land-003',
      name: '大阪府堺市 開発用地',
      address: '大阪府堺市堺区南瓦町2-1',
      prefecture: '大阪府',
      description: '堺市内の広大な開発用地。商業施設・マンション開発に最適。',
      price: 150000000,
      status: 'for_sale',
      isPublic: true,
      ownerId: landlord1.id,
      imageUrls: [],
    },
  });

  console.log('✓ Lands created');

  // ─── Rooms ────────────────────────────────────────────────────────────────────
  const room101 = await prisma.room.upsert({
    where: { id: 'room-101' },
    update: {},
    create: {
      id: 'room-101',
      propertyId: property1.id,
      name: '101号室',
      floor: 1,
      area: 45.5,
      roomType: '1LDK',
      rentAmount: 85000,
      status: 'occupied',
      notes: '南向き・日当たり良好。角部屋。',
    },
  });

  const room201 = await prisma.room.upsert({
    where: { id: 'room-201' },
    update: {},
    create: {
      id: 'room-201',
      propertyId: property1.id,
      name: '201号室',
      floor: 2,
      area: 62.0,
      roomType: '2LDK',
      rentAmount: 110000,
      status: 'vacant',
      notes: '2024年4月リノベーション完了。',
    },
  });

  const room301 = await prisma.room.upsert({
    where: { id: 'room-301' },
    update: {},
    create: {
      id: 'room-301',
      propertyId: property1.id,
      name: '301号室',
      floor: 3,
      area: 38.0,
      roomType: '1K',
      rentAmount: 65000,
      status: 'occupied',
    },
  });

  console.log('✓ Rooms created');

  // ─── Tenants ──────────────────────────────────────────────────────────────────
  const tenant1 = await prisma.tenant.upsert({
    where: { id: 'tenant-001' },
    update: {},
    create: {
      id: 'tenant-001',
      roomId: room101.id,
      name: '佐藤 誠',
      nameKana: 'サトウ マコト',
      email: 'sato.makoto@example.com',
      phone: '090-1111-2222',
      birthDate: new Date('1985-06-15'),
      gender: 'male',
      occupation: '会社員',
      workplace: '株式会社大阪商事',
      workplacePhone: '06-1234-5678',
      annualIncome: 5500000,
      emergencyContactName: '佐藤 洋子',
      emergencyContactPhone: '090-3333-4444',
      emergencyContactRelationship: '配偶者',
      moveInDate: new Date('2022-04-01'),
      contractStartDate: new Date('2022-04-01'),
      contractEndDate: new Date('2026-03-31'),
      rentAmount: 85000,
      depositAmount: 170000,
      keyMoneyAmount: 85000,
      parkingUsed: true,
      parkingSpotNumber: 'P-01',
      licensePlateNumber: '大阪 300 あ 1234',
      paymentStatus: 'current',
      status: 'active',
      notes: '契約更新済み。良好な入居者。',
    },
  });

  await prisma.familyMember.upsert({
    where: { id: 'family-001' },
    update: {},
    create: {
      id: 'family-001',
      tenantId: tenant1.id,
      name: '佐藤 洋子',
      nameKana: 'サトウ ヨウコ',
      relationship: '配偶者',
      birthDate: new Date('1987-09-20'),
      gender: 'female',
      occupation: 'パート',
    },
  });

  await prisma.familyMember.upsert({
    where: { id: 'family-002' },
    update: {},
    create: {
      id: 'family-002',
      tenantId: tenant1.id,
      name: '佐藤 健太',
      nameKana: 'サトウ ケンタ',
      relationship: '子',
      birthDate: new Date('2015-03-10'),
      gender: 'male',
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { id: 'tenant-002' },
    update: {},
    create: {
      id: 'tenant-002',
      roomId: room301.id,
      name: '中村 あかり',
      nameKana: 'ナカムラ アカリ',
      email: 'nakamura.akari@example.com',
      phone: '080-5555-6666',
      birthDate: new Date('1998-12-03'),
      gender: 'female',
      occupation: '看護師',
      workplace: '大阪大学医学部附属病院',
      annualIncome: 4200000,
      emergencyContactName: '中村 博',
      emergencyContactPhone: '090-7777-8888',
      emergencyContactRelationship: '父',
      moveInDate: new Date('2024-01-01'),
      contractStartDate: new Date('2024-01-01'),
      contractEndDate: new Date('2026-12-31'),
      rentAmount: 65000,
      depositAmount: 130000,
      keyMoneyAmount: 0,
      parkingUsed: false,
      paymentStatus: 'overdue',
      status: 'active',
      notes: '2ヶ月分滞納中。連絡取れているが入金が遅れている。',
    },
  });

  console.log('✓ Tenants & family members created');

  // ─── Payments ─────────────────────────────────────────────────────────────────
  const now = new Date();
  await prisma.payment.createMany({
    skipDuplicates: true,
    data: [
      // tenant1 - 正常支払い
      { id: 'pay-001', tenantId: tenant1.id, roomId: room101.id, amount: 85000, dueDate: new Date('2024-06-01'), paidDate: new Date('2024-05-31'), status: 'paid', paymentMethod: 'bank_transfer' },
      { id: 'pay-002', tenantId: tenant1.id, roomId: room101.id, amount: 85000, dueDate: new Date('2024-07-01'), paidDate: new Date('2024-06-30'), status: 'paid', paymentMethod: 'bank_transfer' },
      { id: 'pay-003', tenantId: tenant1.id, roomId: room101.id, amount: 85000, dueDate: new Date('2024-08-01'), paidDate: new Date('2024-07-31'), status: 'paid', paymentMethod: 'bank_transfer' },
      // tenant2 - 滞納
      { id: 'pay-004', tenantId: tenant2.id, roomId: room301.id, amount: 65000, dueDate: new Date('2024-06-01'), paidDate: new Date('2024-06-05'), status: 'paid', paymentMethod: 'bank_transfer' },
      { id: 'pay-005', tenantId: tenant2.id, roomId: room301.id, amount: 65000, dueDate: new Date('2024-07-01'), status: 'overdue' },
      { id: 'pay-006', tenantId: tenant2.id, roomId: room301.id, amount: 65000, dueDate: new Date('2024-08-01'), status: 'overdue' },
    ],
  });

  console.log('✓ Payments created');

  // ─── Employees ────────────────────────────────────────────────────────────────
  await prisma.employee.upsert({
    where: { id: 'emp-001' },
    update: {},
    create: {
      id: 'emp-001',
      ownerId: landlord1.id,
      name: '高橋 拓也',
      email: 'takahashi@tanaka-fudosan.jp',
      phone: '06-9999-1111',
      role: '物件管理担当',
      department: '管理部',
      contractType: 'full_time',
      hireDate: new Date('2020-04-01'),
      isActive: true,
    },
  });

  console.log('✓ Employees created');

  // ─── Schedules ────────────────────────────────────────────────────────────────
  await prisma.schedule.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'sched-001',
        userId: landlord1.id,
        title: 'グランドール梅田 201号室 内見',
        description: '購入希望者の山田様と内見予定。',
        startDateTime: new Date('2024-08-25T14:00:00+09:00'),
        endDateTime: new Date('2024-08-25T15:00:00+09:00'),
        isAllDay: false,
        category: 'inspection',
        relatedPropertyId: property1.id,
        relatedRoomId: room201.id,
      },
      {
        id: 'sched-002',
        userId: landlord1.id,
        title: '301号室 中村様 入金確認',
        description: '7月・8月分の滞納入金について確認の連絡。',
        startDateTime: new Date('2024-08-22T10:00:00+09:00'),
        endDateTime: new Date('2024-08-22T10:30:00+09:00'),
        isAllDay: false,
        category: 'payment',
        relatedPropertyId: property1.id,
        relatedRoomId: room301.id,
      },
      {
        id: 'sched-003',
        userId: landlord1.id,
        title: '奈良土地 売買契約締結',
        startDateTime: new Date('2024-09-01T13:00:00+09:00'),
        endDateTime: new Date('2024-09-01T15:00:00+09:00'),
        isAllDay: false,
        category: 'contract',
        relatedLandId: land1.id,
      },
      {
        id: 'sched-004',
        userId: landlord1.id,
        title: 'サンハイツ難波 エアコン点検',
        description: '全室エアコン定期点検。業者: 大阪空調サービス',
        startDateTime: new Date('2024-08-28T09:00:00+09:00'),
        endDateTime: new Date('2024-08-28T17:00:00+09:00'),
        isAllDay: true,
        category: 'maintenance',
        relatedPropertyId: property2.id,
      },
    ],
  });

  console.log('✓ Schedules created');

  // ─── Notifications ────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'notif-001',
        userId: landlord1.id,
        type: 'payment_overdue',
        title: '滞納アラート',
        content: '301号室 中村 あかり 様の賃料が2ヶ月滞納しています。',
        isRead: false,
        relatedId: tenant2.id,
        relatedType: 'tenant',
      },
      {
        id: 'notif-002',
        userId: landlord1.id,
        type: 'inquiry',
        title: '新しい購入希望が届きました',
        content: 'グランドール梅田への購入希望・相談が届きました。',
        isRead: false,
        relatedId: property1.id,
        relatedType: 'property',
      },
    ],
  });

  console.log('✓ Notifications created');

  console.log('\n✅ Seeding complete!\n');
  console.log('=== Test Accounts ===');
  console.log('Admin:     admin@arvana-terra.jp  / password123');
  console.log('Landlord1: tanaka@example.jp       / password123  (田中 一郎)');
  console.log('Landlord2: suzuki@example.jp       / password123  (鈴木 花子)');
  console.log('Homeowner: yamamoto@example.jp     / password123  (山本 健二)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
