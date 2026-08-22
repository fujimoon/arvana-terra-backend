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
      address: '兵庫県神戸市中央区三宮町1-1-1',
    },
  });

  // Test accounts from README
  await prisma.user.upsert({
    where: { email: 'landlord@example.com' },
    update: {},
    create: {
      email: 'landlord@example.com',
      password,
      name: 'テスト地主',
      role: 'landlord',
    },
  });

  await prisma.user.upsert({
    where: { email: 'homeowner@example.com' },
    update: {},
    create: {
      email: 'homeowner@example.com',
      password,
      name: 'テスト家主',
      role: 'homeowner',
    },
  });

  await prisma.user.upsert({
    where: { email: 'employer@example.com' },
    update: {},
    create: {
      email: 'employer@example.com',
      password,
      name: 'テスト雇用者',
      role: 'employer',
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
      buildingType: 'apartment',
      area: 1200.0,
      floors: 10,
      totalRooms: 30,
      builtYear: 2019,
      description: '梅田駅徒歩3分の好立地マンション。1〜3LDKの多様な間取りを揃えています。築5年の新築同様物件。',
      purchasePrice: 350000000,
      status: 'active',
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
      buildingType: 'apartment',
      area: 800.0,
      floors: 8,
      totalRooms: 20,
      builtYear: 2015,
      description: '難波駅徒歩5分。商業エリア近接の利便性の高いマンション。全室リノベーション済み。',
      purchasePrice: 280000000,
      status: 'active',
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
      buildingType: 'apartment',
      area: 950.0,
      floors: 6,
      totalRooms: 18,
      description: '御所の南側に位置する閑静な住宅地のマンション。',
      purchasePrice: 420000000,
      status: 'active',
      isPublic: true,
      ownerId: landlord2.id,
      imageUrls: [],
    },
  });

  await prisma.property.upsert({
    where: { id: 'prop-004' },
    update: {},
    create: {
      id: 'prop-004',
      name: '神戸三宮ハイツ',
      address: '兵庫県神戸市中央区三宮町2-11-1',
      buildingType: 'apartment',
      area: 1500.0,
      floors: 15,
      totalRooms: 40,
      description: '三宮駅直結の利便性抜群のマンション。海を望む高層階物件。',
      purchasePrice: 550000000,
      status: 'active',
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
      area: 250.0,
      zoning: '第一種低層住居専用地域',
      description: '東大寺近くの閑静な住宅地。南向き日当たり良好。',
      purchasePrice: 12000000,
      status: 'active',
      isPublic: true,
      ownerId: landlord1.id,
      imageUrls: [],
    },
  });

  await prisma.land.upsert({
    where: { id: 'land-002' },
    update: {},
    create: {
      id: 'land-002',
      name: '京都嵐山 商業用地',
      address: '京都府京都市右京区嵯峨天龍寺芒ノ馬場町68',
      area: 500.0,
      zoning: '商業地域',
      description: '嵐山観光エリア至近の商業用地。多目的利用可能。',
      purchasePrice: 85000000,
      status: 'active',
      isPublic: true,
      ownerId: landlord2.id,
      imageUrls: [],
    },
  });

  await prisma.land.upsert({
    where: { id: 'land-003' },
    update: {},
    create: {
      id: 'land-003',
      name: '大阪府堺市 開発用地',
      address: '大阪府堺市堺区南瓦町2-1',
      area: 1200.0,
      description: '堺市内の広大な開発用地。商業施設・マンション開発に最適。',
      purchasePrice: 150000000,
      status: 'active',
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
      roomNumber: '101',
      floor: 1,
      area: 45.5,
      type: 'one_ldk',
      rentPrice: 85000,
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
      roomNumber: '201',
      floor: 2,
      area: 62.0,
      type: 'two_ldk',
      rentPrice: 110000,
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
      roomNumber: '301',
      floor: 3,
      area: 38.0,
      type: 'one_k',
      rentPrice: 65000,
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
      propertyId: property1.id,
      name: '佐藤 誠',
      email: 'sato.makoto@example.com',
      phone: '090-1111-2222',
      moveInDate: new Date('2022-04-01'),
      contractEndDate: new Date('2026-03-31'),
      rentAmount: 85000,
      depositAmount: 170000,
      paymentStatus: 'current',
      notes: '契約更新済み。良好な入居者。',
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { id: 'tenant-002' },
    update: {},
    create: {
      id: 'tenant-002',
      roomId: room301.id,
      propertyId: property1.id,
      name: '中村 あかり',
      email: 'nakamura.akari@example.com',
      phone: '080-5555-6666',
      moveInDate: new Date('2024-01-01'),
      contractEndDate: new Date('2026-12-31'),
      rentAmount: 65000,
      depositAmount: 130000,
      paymentStatus: 'late',
      notes: '2ヶ月分滞納中。連絡取れているが入金が遅れている。',
    },
  });

  console.log('✓ Tenants created');

  // ─── Payments ─────────────────────────────────────────────────────────────────
  await prisma.payment.createMany({
    skipDuplicates: true,
    data: [
      { id: 'pay-001', tenantId: tenant1.id, roomId: room101.id, propertyId: property1.id, amount: 85000, dueDate: new Date('2024-06-01'), paidDate: new Date('2024-05-31'), status: 'paid' },
      { id: 'pay-002', tenantId: tenant1.id, roomId: room101.id, propertyId: property1.id, amount: 85000, dueDate: new Date('2024-07-01'), paidDate: new Date('2024-06-30'), status: 'paid' },
      { id: 'pay-003', tenantId: tenant1.id, roomId: room101.id, propertyId: property1.id, amount: 85000, dueDate: new Date('2024-08-01'), paidDate: new Date('2024-07-31'), status: 'paid' },
      { id: 'pay-004', tenantId: tenant2.id, roomId: room301.id, propertyId: property1.id, amount: 65000, dueDate: new Date('2024-06-01'), paidDate: new Date('2024-06-05'), status: 'paid' },
      { id: 'pay-005', tenantId: tenant2.id, roomId: room301.id, propertyId: property1.id, amount: 65000, dueDate: new Date('2024-07-01'), status: 'overdue' },
      { id: 'pay-006', tenantId: tenant2.id, roomId: room301.id, propertyId: property1.id, amount: 65000, dueDate: new Date('2024-08-01'), status: 'overdue' },
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
    },
  });

  console.log('✓ Employees created');

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

  // ─── Vendors ──────────────────────────────────────────────────────────────────
  await prisma.vendor.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'vendor-001',
        name: '大阪ガラス修理センター',
        category: 'glass',
        contactName: '佐藤 修',
        email: 'glass@osaka-repair.jp',
        phone: '06-1234-5678',
        address: '大阪府大阪市北区梅田1-1-1',
        description: 'ガラス修理・交換の専門業者。24時間対応可能。',
        serviceAreas: ['大阪府', '兵庫県', '京都府'],
        rating: 4.5,
        isApproved: true,
        registeredBy: admin.id,
      },
      {
        id: 'vendor-002',
        name: '関西電気工事株式会社',
        category: 'electric',
        contactName: '田村 電太',
        email: 'info@kansai-electric.jp',
        phone: '06-9876-5432',
        address: '大阪府大阪市中央区本町2-3-4',
        description: '電気工事・設備メンテナンス全般。資格保有技術者多数在籍。',
        serviceAreas: ['大阪府', '京都府', '奈良県'],
        rating: 4.2,
        isApproved: true,
        registeredBy: admin.id,
      },
      {
        id: 'vendor-003',
        name: 'クリーンプロ清掃サービス',
        category: 'cleaning',
        contactName: '山田 清子',
        email: 'clean@cleanpro.jp',
        phone: '0120-111-222',
        address: '大阪府堺市北区1-2-3',
        description: '退去清掃・定期清掃・特殊清掃に対応。エコ洗剤使用。',
        serviceAreas: ['大阪府', '兵庫県'],
        rating: 4.8,
        isApproved: false,
        registeredBy: landlord1.id,
      },
    ],
  });
  console.log('✓ Vendors created');

  // ─── Chat Rooms & Messages ────────────────────────────────────────────────────
  const chatRoom1 = await prisma.chatRoom.create({
    data: {
      id: 'chat-001',
      type: 'property',
      name: 'グランドール梅田 - お問い合わせ',
      propertyId: property1.id,
      createdBy: landlord1.id,
      participants: {
        create: [
          { userId: landlord1.id },
          { userId: homeowner.id },
        ],
      },
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        id: 'msg-001',
        chatRoomId: chatRoom1.id,
        senderId: homeowner.id,
        content: 'グランドール梅田の201号室について詳しく教えていただけますか？',
        messageType: 'text',
      },
      {
        id: 'msg-002',
        chatRoomId: chatRoom1.id,
        senderId: landlord1.id,
        content: 'お問い合わせありがとうございます。201号室は2LDK、56㎡です。現在空室となっております。',
        messageType: 'text',
      },
      {
        id: 'msg-003',
        chatRoomId: chatRoom1.id,
        senderId: homeowner.id,
        content: '内見は可能でしょうか？来週の土曜日はいかがでしょうか。',
        messageType: 'text',
      },
    ],
  });
  console.log('✓ Chat rooms and messages created');

  // ─── SNS Posts ────────────────────────────────────────────────────────────────
  await prisma.snsPost.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'sns-001',
        authorId: landlord1.id,
        type: 'general',
        title: '大阪の不動産市場について',
        content: '最近の大阪不動産市場は活況を呈しています。梅田・難波エリアの需要が特に高く、空室率も低下傾向にあります。投資家の皆さんにとって良い機会かもしれません。',
        tags: ['不動産', '大阪', '投資'],
        viewCount: 128,
      },
      {
        id: 'sns-002',
        authorId: landlord2.id,
        type: 'general',
        title: '京都の土地活用事例',
        content: '京都市内の土地を駐車場として活用した事例をご紹介します。初期投資を抑えながら安定した収益を得ることができました。詳細は個別にご相談ください。',
        tags: ['土地活用', '京都', '駐車場'],
        viewCount: 85,
      },
    ],
  });
  console.log('✓ SNS posts created');

  console.log('\n✅ Seeding complete!\n');
  console.log('=== Test Accounts ===');
  console.log('Admin:     admin@arvana-terra.jp  / password123');
  console.log('Landlord1: tanaka@example.jp       / password123  (田中 一郎)');
  console.log('Landlord2: suzuki@example.jp       / password123  (鈴木 花子)');
  console.log('Homeowner: yamamoto@example.jp     / password123  (山本 健二)');
  console.log('Landlord:  landlord@example.com    / password123');
  console.log('Homeowner: homeowner@example.com   / password123');
  console.log('Employer:  employer@example.com    / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
