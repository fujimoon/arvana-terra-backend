# Arvana Terra Backend

不動産資産管理プラットフォーム「Arvana Terra」のバックエンドサーバーです。

---

## 概要

Arvana Terra Backend は、REST API と Socket.IO リアルタイム通信を提供する Node.js サーバーです。土地・物件・部屋・入居者・設備・スマートデバイス・入金管理・契約・チャット・タスク・従業員・業者・SNS・資産評価・AI提案など、不動産ビジネスに必要なすべての機能を API として提供します。

---

## 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Node.js | 20.x LTS | ランタイム |
| TypeScript | 5.x | 言語 |
| Express | 4.x | Web フレームワーク |
| Prisma | 5.9.x | ORM |
| PostgreSQL | 16.x | データベース |
| Redis | 7.x | キャッシュ・セッション |
| Socket.IO | 4.x | WebSocket (リアルタイムチャット・通知) |
| JWT (jsonwebtoken) | 9.x | 認証 |
| bcryptjs | 2.x | パスワードハッシュ |
| Zod | 3.x | バリデーション |
| Winston | 3.x | ロギング |
| Helmet | 7.x | セキュリティヘッダー |
| express-rate-limit | 7.x | レート制限 |
| OpenAI SDK | 4.x | AIタスク提案・資産評価 |
| Multer | 1.x | ファイルアップロード |
| AES-256-GCM | — | マイナンバー暗号化 |

---

## アーキテクチャ

```
クライアント (Web / iOS / Android)
        |
        | HTTP/REST
        v
Express.js (src/app.ts)
        |
        +-- Middleware
        |     +-- Helmet (セキュリティヘッダー)
        |     +-- CORS
        |     +-- Rate Limit
        |     +-- Morgan (HTTPログ)
        |     +-- Auth (JWT検証)
        |     +-- RBAC (ロール権限)
        |
        +-- Routes (/api/v1/*)
        |     +-- auth, users
        |     +-- lands, properties, rooms, tenants
        |     +-- equipment, smartDevices
        |     +-- payments, contracts
        |     +-- chats, notifications
        |     +-- tasks, employees, vendors
        |     +-- opportunities, valuation, sns
        |     +-- schedules, preferences, admin
        |
        +-- Services (ビジネスロジック)
        +-- Prisma Client (PostgreSQL)
        +-- Redis Client (ioredis)
        |
        | WebSocket
        v
Socket.IO Server
        +-- /chat          (リアルタイムチャット)
        +-- /notification  (プッシュ通知・カメラアラート)
```

---

## データベーススキーマ

### ユーザー管理

| モデル | 説明 |
|--------|------|
| **User** | ユーザー (landlord / homeowner / employer / admin / super_admin) |
| **RefreshToken** | JWTリフレッシュトークン管理 |
| **UserPreference** | 希望地域・通知設定 |

### 不動産

| モデル | 説明 |
|--------|------|
| **Land** | 土地 (面積・用途地域・評価額・住所) |
| **Property** | 物件・建物 (土地に紐付く) |
| **Room** | 部屋 (物件内の個別ユニット) |
| **Tenant** | 入居者 (部屋に紐付く) |
| **Payment** | 入金記録 (家賃・管理費等) |

### 設備・デバイス

| モデル | 説明 |
|--------|------|
| **Equipment** | 設備 (エアコン・カメラ・エレベーター等) |
| **SmartDeviceData** | IoT デバイス (電力計・水道計・カメラ) |

### 契約

| モデル | 説明 |
|--------|------|
| **Contract** | 契約書 (NDA / 賃貸 / 売買) |
| **ContractTemplate** | 契約テンプレート |

### コミュニケーション

| モデル | 説明 |
|--------|------|
| **ChatRoom** | チャットルーム (物件・土地・従業員・ダイレクト) |
| **ChatParticipant** | チャットルーム参加者 |
| **ChatMessage** | チャットメッセージ履歴 |
| **Notification** | システム通知 (入金・カメラ・契約・タスク・チャット) |

### ビジネス

| モデル | 説明 |
|--------|------|
| **Task** | 管理タスク (手動 + AIサジェスト) |
| **Employee** | 従業員 (マイナンバーはAES-256-GCM暗号化) |
| **Vendor** | 業者ディレクトリ |
| **UserVendor** | オーナー - 業者コネクション |
| **BusinessOpportunity** | 投資・売却ビジネス機会 |
| **AssetValuation** | AI算出資産評価履歴 |

### コミュニティ

| モデル | 説明 |
|--------|------|
| **SnsPost** | コミュニティ投稿 (相談・事例・イベント・ナレッジ) |
| **SnsLike** | 投稿いいね |
| **SnsComment** | 投稿コメント |
| **SnsEvent** | イベント |

---

## API エンドポイント一覧

### 認証 `/api/v1/auth`

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/register` | 新規ユーザー登録 |
| POST | `/login` | ログイン (JWT発行) |
| POST | `/refresh` | アクセストークンリフレッシュ |
| POST | `/logout` | ログアウト |
| GET | `/me` | 現在のユーザー情報取得 |
| PUT | `/me` | ユーザー情報更新 |

### 土地 `/api/v1/lands`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/public` | 公開土地一覧 |
| GET | `/my` | マイ土地一覧 |
| GET | `/:id` | 土地詳細 |
| POST | `/` | 土地作成 |
| PUT | `/:id` | 土地更新 |
| DELETE | `/:id` | 土地削除 |

### 物件 `/api/v1/properties`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/public` | 公開物件一覧 |
| GET | `/my` | マイ物件一覧 |
| GET | `/:id` | 物件詳細 |
| POST | `/` | 物件作成 |
| PUT | `/:id` | 物件更新 |
| DELETE | `/:id` | 物件削除 |

### 部屋 `/api/v1/properties/:propertyId/rooms`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | 部屋一覧 |
| GET | `/:roomId` | 部屋詳細 |
| POST | `/` | 部屋作成 |
| PUT | `/:roomId` | 部屋更新 |
| DELETE | `/:roomId` | 部屋削除 |

### 設備 `/api/v1/properties/:propertyId/equipment`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | 設備一覧 |
| GET | `/floor/:floor` | 階別設備一覧 |
| GET | `/:id` | 設備詳細 |
| POST | `/` | 設備追加 |
| PUT | `/:id` | 設備更新 |
| DELETE | `/:id` | 設備削除 |

### スマートデバイス `/api/v1/properties/:propertyId/smart-devices`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | デバイス一覧 |
| GET | `/:deviceId` | デバイス詳細 |
| POST | `/` | デバイス追加 |
| PUT | `/:deviceId` | デバイス更新 |
| DELETE | `/:deviceId` | デバイス削除 |

### 入金管理 `/api/v1/payments`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/property/:propertyId` | 物件別入金一覧 |
| GET | `/:id` | 入金詳細 |
| POST | `/` | 入金記録追加 |
| PUT | `/:id` | 入金記録更新 |
| DELETE | `/:id` | 入金記録削除 |

### 契約 `/api/v1/contracts`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | 契約一覧 |
| GET | `/:id` | 契約詳細 |
| POST | `/` | 契約作成 |
| PUT | `/:id` | 契約更新 |
| DELETE | `/:id` | 契約削除 |

### チャット `/api/v1/chats`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/rooms` | チャットルーム一覧 |
| POST | `/rooms` | チャットルーム作成 |
| GET | `/rooms/:id/messages` | メッセージ一覧 |
| POST | `/rooms/:id/messages` | メッセージ送信 |

### タスク `/api/v1/tasks`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | タスク一覧 |
| POST | `/` | タスク作成 |
| PUT | `/:id` | タスク更新 |
| DELETE | `/:id` | タスク削除 |
| POST | `/ai-suggest` | AIタスク提案 |

### 従業員 `/api/v1/employees`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | 従業員一覧 |
| GET | `/:id` | 従業員詳細 |
| POST | `/` | 従業員登録 |
| PUT | `/:id` | 従業員更新 |
| DELETE | `/:id` | 従業員削除 |

### 業者 `/api/v1/vendors`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | 業者一覧 (公開) |
| GET | `/:id` | 業者詳細 |
| POST | `/:id/connect` | 業者とコネクト |
| DELETE | `/:id/disconnect` | コネクト解除 |

### 通知 `/api/v1/notifications`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | 通知一覧 |
| PATCH | `/:id/read` | 既読にする |
| PATCH | `/read-all` | 全て既読 |

### SNS `/api/v1/sns`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/posts` | 投稿一覧 (カテゴリフィルター) |
| POST | `/posts` | 投稿作成 |
| GET | `/posts/:id` | 投稿詳細 |
| POST | `/posts/:id/like` | いいね |
| POST | `/posts/:id/comments` | コメント追加 |
| GET | `/events` | イベント一覧 |
| POST | `/events` | イベント作成 |

### 資産評価 `/api/v1/valuation`

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/calculate` | AI資産評価計算 |
| GET | `/history` | 評価履歴一覧 |

### その他

| グループ | パス | 説明 |
|---------|------|------|
| ユーザー | `/api/v1/users` | ユーザー管理 |
| 入居者 | `/api/v1/tenants` | 入居者管理 |
| ビジネス機会 | `/api/v1/opportunities` | 機会一覧・作成 |
| スケジュール | `/api/v1/schedules` | スケジュール管理 |
| 設定 | `/api/v1/preferences` | ユーザー設定 |
| 問い合わせ | `/api/v1/inquiries` | 問い合わせ管理 |
| 売却依頼 | `/api/v1/sale-requests` | 売却依頼管理 |
| 管理者 | `/api/v1/admin` | 管理者専用操作 |

---

## Socket.IO イベント

### `/chat` 名前空間

| 方向 | イベント | ペイロード | 説明 |
|------|---------|-----------|------|
| Client→Server | `join_chat` | `chatRoomId: string` | チャットルーム入室 |
| Client→Server | `leave_chat` | `chatRoomId: string` | チャットルーム退室 |
| Client→Server | `send_message` | `{ chatRoomId, content, messageType? }` | メッセージ送信 |
| Client→Server | `typing` | `{ chatRoomId: string }` | 入力中通知 |
| Server→Client | `new_message` | Message オブジェクト | 新しいメッセージ |
| Server→Client | `user_typing` | `{ userId, chatRoomId }` | 他ユーザー入力中 |
| Server→Client | `user_joined` | `{ chatRoomId, userId }` | ユーザー入室 |
| Server→Client | `user_left` | `{ chatRoomId, userId }` | ユーザー退室 |

### `/notification` 名前空間

| 方向 | イベント | ペイロード | 説明 |
|------|---------|-----------|------|
| Server→Client | `new_notification` | Notification オブジェクト | 新規通知 |
| Server→Client | `camera_alert` | `{ deviceId, message, notificationId }` | カメラアラート |

### Socket.IO 接続認証

```javascript
const socket = io('http://localhost:3001/chat', {
  auth: { token: 'your-access-token' }
});
```

---

## セットアップ・起動方法

### 前提条件

- **Node.js 20.x**
- **PostgreSQL 16.x** (またはDocker)
- **Redis 7.x** (またはDocker)
- **npm 10.x**

### 手順

**1. 依存パッケージのインストール**

```bash
npm install
```

**2. 環境変数の設定**

```bash
cp .env.example .env
```

`.env` を編集：

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://terra:terrapass@localhost:5433/arvana_terra
REDIS_URL=redis://localhost:6380
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
ENCRYPTION_KEY=<64文字のhex文字列 = 32バイト>
OPENAI_API_KEY=sk-your-openai-api-key
ALLOWED_ORIGINS=http://localhost:5173
```

ENCRYPTION_KEY の生成：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Prisma マイグレーション**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**4. 開発サーバー起動**

```bash
npm run dev
```

サーバーは `http://localhost:3001` で起動します。

**5. Docker での起動**

```bash
export JWT_SECRET=your-secret
export JWT_REFRESH_SECRET=your-refresh-secret
export ENCRYPTION_KEY=your-64-char-hex-key
export OPENAI_API_KEY=sk-your-key

docker-compose up --build
```

---

## 環境変数一覧

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `NODE_ENV` | — | `development` | 実行環境 |
| `PORT` | — | `3001` | サーバーポート |
| `DATABASE_URL` | **必須** | — | PostgreSQL 接続 URL |
| `REDIS_URL` | — | `redis://localhost:6379` | Redis 接続 URL |
| `JWT_SECRET` | **必須** | — | アクセストークン署名キー |
| `JWT_REFRESH_SECRET` | — | JWT_SECRET と同じ | リフレッシュトークン署名キー |
| `JWT_EXPIRES_IN` | — | `15m` | アクセストークン有効期限 |
| `JWT_REFRESH_EXPIRES_IN` | — | `30d` | リフレッシュトークン有効期限 |
| `ENCRYPTION_KEY` | **必須** | — | マイナンバー暗号化キー (32バイト hex) |
| `OPENAI_API_KEY` | **必須** | — | OpenAI API キー (AI機能に使用) |
| `ALLOWED_ORIGINS` | — | `*` | CORS 許可オリジン (カンマ区切り) |
| `LOG_LEVEL` | — | `info` | Winston ログレベル |
| `UPLOAD_DIR` | — | `./uploads` | ファイルアップロードディレクトリ |
| `MAX_FILE_SIZE` | — | `10485760` | 最大アップロードサイズ (バイト、デフォルト 10MB) |

---

## プロジェクト構造

```
arvana-terra-backend/
├── src/
│   ├── app.ts                    # Express アプリ設定
│   ├── index.ts                  # サーバーエントリポイント
│   ├── routes/                   # ルーター
│   │   ├── index.ts              # ルート集約
│   │   ├── auth.ts
│   │   ├── lands.ts
│   │   ├── properties.ts
│   │   ├── rooms.ts
│   │   ├── tenants.ts
│   │   ├── equipment.ts
│   │   ├── smartDevices.ts
│   │   ├── payments.ts
│   │   ├── contracts.ts
│   │   ├── chats.ts
│   │   ├── tasks.ts
│   │   ├── employees.ts
│   │   ├── vendors.ts
│   │   ├── notifications.ts
│   │   ├── sns.ts
│   │   ├── valuation.ts
│   │   ├── opportunities.ts
│   │   ├── schedules.ts
│   │   ├── preferences.ts
│   │   ├── inquiries.ts
│   │   ├── saleRequests.ts
│   │   ├── users.ts
│   │   └── admin.ts
│   ├── services/                 # ビジネスロジック
│   │   ├── auth.service.ts
│   │   ├── land.service.ts
│   │   ├── property.service.ts
│   │   ├── room.service.ts
│   │   ├── chat.service.ts
│   │   ├── contract.service.ts
│   │   ├── equipment.service.ts
│   │   ├── task.service.ts
│   │   ├── employee.service.ts
│   │   ├── vendor.service.ts
│   │   ├── notification.service.ts
│   │   ├── sns.service.ts
│   │   ├── tenant.service.ts
│   │   ├── inquiry.service.ts
│   │   ├── saleRequest.service.ts
│   │   ├── schedule.service.ts
│   │   ├── userPreference.service.ts
│   │   └── ai.service.ts
│   ├── middleware/
│   │   ├── auth.ts               # JWT 認証
│   │   ├── rbac.ts               # ロールベースアクセス制御
│   │   ├── error.ts              # エラーハンドラー
│   │   └── upload.ts             # Multer ファイルアップロード
│   ├── socket/
│   │   ├── index.ts              # Socket.IO イベントハンドラー
│   │   └── instance.ts           # Socket.IO インスタンス
│   ├── lib/
│   │   ├── prisma.ts             # Prisma クライアント
│   │   ├── redis.ts              # ioredis クライアント
│   │   └── logger.ts             # Winston ロガー
│   ├── utils/
│   │   ├── asyncHandler.ts       # async/await エラーラッパー
│   │   └── crypto.ts             # AES-256-GCM 暗号化ユーティリティ
│   └── types/
│       └── index.ts              # 共有型定義
├── prisma/
│   └── schema.prisma             # データベーススキーマ (26モデル)
├── uploads/                      # アップロードファイル
├── .env.example
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## ユーザーロール

| ロール | 説明 |
|--------|------|
| `landlord` | 地主 — 土地の所有・管理 |
| `homeowner` | 家主 — 物件・建物の所有・管理 |
| `employer` | 雇用者 — Arvana Work 連携、チャット参加 |
| `admin` | 管理者 — 業者ディレクトリ管理 |
| `super_admin` | スーパー管理者 — 最高権限 |

---

## ライセンス

Copyright © 2024 Arvana Terra. All rights reserved.
