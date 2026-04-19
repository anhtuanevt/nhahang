# OderTable - Restaurant Ordering System

Hệ thống gọi món tại bàn thông minh với Next.js + Supabase.

## 🎯 Tính năng

### Admin
- Dashboard quản lý bàn theo thời gian thực
- Quản lý thực đơn (CRUD)
- Xem chi tiết đơn hàng
- In hóa đơn (mô phỏng)
- Đóng bàn và reset dữ liệu

### Customer (Table)
- Xem thực đơn theo danh mục
- Thêm/xóa món vào giỏ hàng
- Cập nhật số lượng món
- Xem tổng tiền real-time
- Yêu cầu thanh toán

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **State Management**: Zustand
- **Testing**: Vitest, Playwright

## 📦 Cài đặt

### 1. Clone và cài đặt dependencies

\`\`\`bash
git clone <your-repo>
cd odertable
npm install
\`\`\`

### 2. Tạo Supabase Project

1. Truy cập [https://supabase.com](https://supabase.com)
2. Tạo project mới
3. Đợi project khởi tạo (~2 phút)
4. Vào **Settings > API** để lấy:
   - Project URL
   - anon public key
   - service_role key

### 3. Cấu hình Environment Variables

Copy file `.env.local.example` thành `.env.local`:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Cập nhật `.env.local` với credentials từ Supabase:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### 4. Chạy Database Migrations

Mở **SQL Editor** trong Supabase Dashboard và chạy:

1. File `supabase/migrations/001_initial_schema.sql` - Tạo cấu trúc database
2. File `supabase/migrations/002_seed_data.sql` - Tạo dữ liệu mẫu

Hoặc copy và paste toàn bộ nội dung 2 file vào SQL Editor.

### 5. Chạy ứng dụng

\`\`\`bash
npm run dev
\`\`\`

Truy cập [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### Unit Tests

\`\`\`bash
npm run test:unit
\`\`\`

### Integration Tests

Integration tests cần Supabase connection. Đảm bảo `.env.local` đã cấu hình đúng.

\`\`\`bash
npm run test:integration
\`\`\`

### E2E Tests

\`\`\`bash
# Cài đặt Playwright browsers (lần đầu)
npx playwright install

# Chạy E2E tests
npm run test:e2e
\`\`\`

### Run All Tests

\`\`\`bash
npm run test:all
\`\`\`

## 📁 Cấu trúc Project

\`\`\`
/odertable
├── app/                    # Next.js App Router
│   ├── admin/              # Admin pages
│   │   ├── page.tsx        # Dashboard
│   │   └── menu/           # Menu management
│   ├── api/                # API routes
│   │   ├── tables/
│   │   ├── menu-items/
│   │   ├── orders/
│   │   └── order-items/
│   └── table/[tableId]/    # Customer view
├── components/
│   ├── admin/              # Admin components
│   ├── table/              # Customer components
│   └── ui/                 # Shared UI components
├── hooks/                  # Custom hooks
│   └── useCart.ts          # Cart state management
├── lib/
│   └── supabase/           # Supabase clients
├── types/                  # TypeScript types
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # E2E tests
└── supabase/
    └── migrations/         # SQL migrations
\`\`\`

## 🔑 Database Schema

### Tables
- \`id\` (UUID, Primary Key)
- \`name\` (Text)
- \`status\` (Enum: empty, ordering, requesting_payment)
- \`created_at\` (Timestamp)

### Categories
- \`id\` (UUID, Primary Key)
- \`name\` (Text)
- \`created_at\` (Timestamp)

### Menu Items
- \`id\` (UUID, Primary Key)
- \`name\` (Text)
- \`price\` (Decimal)
- \`category_id\` (UUID, Foreign Key)
- \`available\` (Boolean)
- \`created_at\` (Timestamp)

### Orders
- \`id\` (UUID, Primary Key)
- \`table_id\` (UUID, Foreign Key)
- \`status\` (Enum: active, closed)
- \`created_at\` (Timestamp)

### Order Items
- \`id\` (UUID, Primary Key)
- \`order_id\` (UUID, Foreign Key)
- \`menu_item_id\` (UUID, Foreign Key)
- \`quantity\` (Integer)
- \`created_at\` (Timestamp)

## 🚀 Deployment

### Vercel (Recommended)

1. Push code lên GitHub
2. Import project vào Vercel
3. Thêm environment variables
4. Deploy

### Manual

\`\`\`bash
npm run build
npm start
\`\`\`

## 🔧 Realtime

Ứng dụng sử dụng Supabase Realtime để:

1. Admin thấy cập nhật đơn hàng ngay lập tức
2. Customer nhận thông báo khi bàn được đóng

Realtime được enable cho các bảng:
- \`tables\`
- \`orders\`
- \`order_items\`
- \`menu_items\`

## 🎨 UI Features

- Responsive design
- Clean, minimal UI với Tailwind CSS
- Real-time updates
- Modal dialogs
- Loading states
- Error handling

## 📝 Workflow

### Customer Flow
1. Customer truy cập `/table/[table-id]`
2. Xem menu theo danh mục
3. Thêm món vào giỏ hàng
4. Xem tổng tiền
5. Click "Yêu cầu thanh toán"
6. Admin nhận thông báo

### Admin Flow
1. Admin vào `/admin` dashboard
2. Thấy các bàn và trạng thái
3. Click bàn để xem chi tiết đơn hàng
4. In hóa đơn hoặc đóng bàn
5. Bàn reset về trạng thái "empty"

## 🐛 Debug

Nếu gặp lỗi:

1. **Database connection error**: Kiểm tra `.env.local`
2. **Missing tables**: Chạy migrations trong SQL Editor
3. **CORS errors**: Kiểm tra Supabase project settings
4. **Build errors**: Chạy `npm install` lại

## 📞 Support

- Tạo issue trên GitHub
- Email: support@example.com

## 📄 License

MIT License
# nhahang
