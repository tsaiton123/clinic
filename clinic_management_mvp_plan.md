# 診所管理系統 MVP 完整計劃

## 1. 系統目標

本系統是一套專為高端自費診所設計的 **客戶進度追蹤與咨詢流程管理平台**。

核心目標：

- 讓主控者掌握所有咨詢師的客戶追蹤狀態
- 讓咨詢師依照 S1–S6 流程穩定推進客戶
- 分析每位客戶目前進度與決策障礙
- 提升自費療程完成率、追蹤穩定度與管理效率
- 將診所咨詢流程從個人經驗轉為可複製系統

系統核心依據為 S1–S6 醫療顧問循環系統：

- S1：資料蒐集
- S2：建立節奏
- S3：咨詢狀態確認
- S4：需求整合
- S5：決策障礙釐清
- S6：治療共識與啟動

---

## 2. MVP 角色設計

MVP 階段先制定兩種角色：

1. 主控者 / C-Level / 管理者
2. 咨詢師 / Consultant

---

## 3. 角色一：主控者

### 3.1 主控者定位

主控者負責全局監控、數據分析、流程管理與咨詢師績效追蹤。

### 3.2 主控者功能

主控者可以：

- 查看所有客戶資料
- 查看所有咨詢師負責的客戶
- 查看每位客戶目前處於 S1–S6 哪一階段
- 查看 S1–S6 轉換漏斗
- 查看各咨詢師績效
- 查看逾期未追蹤客戶
- 查看長時間未推進客戶
- 查看決策障礙統計
- 查看預估成交金額
- 發送通知給特定咨詢師
- 對特定客戶留下管理備註

### 3.3 主控者 Dashboard

主控者首頁應包含以下區塊：

#### A. Overview Dashboard

顯示：

- 總客戶數
- 本月新增客戶數
- 活躍客戶數
- 本月進入 S6 客戶數
- 預估成交金額
- 逾期追蹤數
- 長時間未推進客戶數

#### B. S1–S6 Funnel

顯示各階段客戶數：

- S1：資料蒐集
- S2：建立節奏
- S3：咨詢狀態確認
- S4：需求整合
- S5：決策障礙釐清
- S6：治療共識與啟動

並計算：

- S1 → S2 轉換率
- S2 → S3 轉換率
- S3 → S4 轉換率
- S4 → S5 轉換率
- S5 → S6 轉換率

#### C. Consultant Performance

每位咨詢師應顯示：

- 負責客戶數
- 本月新增客戶數
- 各 S1–S6 階段客戶數
- 平均追蹤間隔
- 逾期追蹤數
- 本月 S6 客戶數
- 預估成交金額
- S1 → S6 轉換率

#### D. Decision Barrier Analysis

統計客戶卡關原因：

- 價格猶豫
- 擔心風險
- 時間安排困難
- 家人或伴侶反對
- 信任不足
- 療程理解不足
- 正在比較其他診所
- 效果期待不確定
- 其他

#### E. Notification Center

主控者可以發送提醒給咨詢師，例如：

- 請今天追蹤某位客戶
- 某客戶已 7 天未更新
- 某客戶長時間停留在同一階段
- 某客戶卡在價格障礙，請安排方案說明
- 某客戶已接近成交，請確認治療日期

---

## 4. 角色二：咨詢師

### 4.1 咨詢師定位

咨詢師是主要操作系統的人，負責客戶資料建立、追蹤紀錄、階段推進與回報。

### 4.2 咨詢師功能

咨詢師可以：

- 新增客戶
- 編輯客戶基本資料
- 刪除或封存客戶
- 查看自己負責的客戶
- 更新客戶目前 S1–S6 階段
- 新增每次追蹤紀錄
- 設定下次追蹤日期
- 標記決策障礙
- 接收主控者通知
- 查看自己的待辦事項

### 4.3 咨詢師 Dashboard

咨詢師首頁應包含：

- 今日需追蹤客戶
- 逾期未追蹤客戶
- 即將進入 S6 客戶
- 最近新增客戶
- 主控者通知
- 自己負責的 S1–S6 客戶分佈

### 4.4 客戶卡片資訊

每張客戶卡片建議顯示：

- 客戶姓名
- 目前階段
- 下次追蹤時間
- 主要需求
- 主要決策障礙
- 快速更新按鈕

---

## 5. S1–S6 業務流程設計

### 5.1 S1：資料蒐集

#### 目標

建立客戶基本輪廓，收集初步需求與背景資訊。

#### 需要記錄

- 客戶姓名
- 聯絡方式
- Line ID
- Email
- 年齡
- 性別
- 客戶來源
- 感興趣療程
- 初步需求
- 預算範圍
- 過往治療經驗
- 是否已初診
- 是否已完成初步咨詢

#### 系統功能

- 新增客戶資料
- 編輯基本資訊
- 指派負責咨詢師
- 記錄初步咨詢內容
- 將客戶標記為 S1

---

### 5.2 S2：建立節奏

#### 目標

讓客戶進入穩定追蹤節奏，避免一次咨詢後流失。

#### 需要記錄

- 首次聯絡日期
- 最近一次追蹤日期
- 下一次追蹤日期
- 追蹤方式
- 客戶回應狀態
- 客戶是否願意進一步了解療程

#### 系統功能

- 設定下次追蹤日期
- 新增追蹤紀錄
- 顯示今日需追蹤客戶
- 顯示逾期未追蹤客戶
- 自動提醒咨詢師

---

### 5.3 S3：咨詢狀態確認

#### 目標

確認客戶目前是否仍有興趣、是否需要更多資訊，以及是否可以進一步整理需求。

#### 需要記錄

- 客戶目前回應狀態
- 是否仍有療程興趣
- 是否需要再次說明
- 是否已看過方案或衛教內容
- 是否有初步預算概念
- 是否有下一步安排
- 是否需要醫師或主控者協助

#### 建議狀態標籤

- 尚未回覆
- 已回覆但未明確
- 有興趣，需更多資訊
- 有興趣，可進入需求整合
- 暫緩考慮
- 失聯
- 暫不適合推進

#### 系統功能

- 更新咨詢狀態標籤
- 記錄客戶目前態度
- 記錄是否需要再次說明
- 標記是否可推進至 S4
- 標記暫緩或失聯客戶

---

### 5.4 S4：需求整合

#### 目標

將客戶模糊需求轉化為具體治療方案方向。

#### 需要記錄

- 客戶最在意的問題
- 想達成的結果
- 可接受的療程類型
- 可接受的恢復期
- 預算範圍
- 是否需要醫師再次說明
- 建議療程方案
- 需求摘要

#### 系統功能

- 建立需求摘要
- 整合多次追蹤內容
- 記錄建議療程方案
- 標記是否需要醫師介入

---

### 5.5 S5：決策障礙釐清

#### 目標

找出客戶尚未成交的原因，協助咨詢師處理卡關點。

#### 常見決策障礙

- 價格猶豫
- 害怕風險
- 家人或伴侶反對
- 療程不了解
- 不信任診所
- 時間安排困難
- 正在比較其他診所
- 對效果期待不確定
- 其他

#### 系統功能

- 標記一個或多個決策障礙
- 補充障礙說明
- 標記障礙是否已解決
- 主控者查看全診所障礙統計

---

### 5.6 S6：治療共識與啟動

#### 目標

將咨詢轉化為實際治療行動。

#### 需要記錄

- 最終療程方案
- 預估金額
- 實際成交金額
- 付款狀態
- 預約治療日期
- 是否簽署同意書
- 是否完成術前衛教
- 是否正式啟動療程

#### 系統功能

- 標記客戶進入 S6
- 記錄成交金額
- 記錄治療日期
- 顯示即將成交客戶
- 統計每月 S6 客戶數與成交金額

---

## 6. 核心功能模組

### 6.1 登入與權限模組

#### 功能

- 使用者登入
- 使用者登出
- 角色權限控制
- 主控者與咨詢師看到不同頁面

#### 使用者角色

| 角色 | 權限 |
|---|---|
| 主控者 | 查看所有資料、分析數據、發送通知 |
| 咨詢師 | 管理自己負責的客戶與追蹤紀錄 |

---

### 6.2 客戶管理模組

#### 功能

- 新增客戶
- 編輯客戶
- 刪除客戶
- 封存客戶
- 搜尋客戶
- 依咨詢師篩選
- 依 S1–S6 階段篩選
- 依逾期狀態篩選
- 依來源篩選

---

### 6.3 S1–S6 進度管理模組

#### 功能

- 更新客戶目前階段
- 保留階段變更紀錄
- 查看每位客戶歷史階段
- 計算各階段停留時間
- 計算 S1–S6 轉換率

---

### 6.4 追蹤紀錄模組

#### 功能

- 新增追蹤紀錄
- 查看歷史追蹤紀錄
- 記錄追蹤方式
- 記錄客戶反應
- 設定下一步行動
- 設定下次追蹤時間
- 標記是否需要主控者介入

---

### 6.5 決策障礙模組

#### 功能

- 標記決策障礙
- 新增障礙說明
- 更新障礙狀態
- 統計最常見障礙
- 分析不同障礙對成交率的影響

---

### 6.6 通知與提醒模組

#### 自動通知

系統可自動提醒：

- 今日需追蹤客戶
- 客戶已超過 3 天未追蹤
- 客戶長時間停留在同一階段
- S5 客戶超過 14 天未推進
- S6 客戶尚未設定治療日期

#### 手動通知

主控者可發送通知給咨詢師：

- 指定客戶追蹤提醒
- 高價值客戶提醒
- 成交前確認提醒
- 需要主管介入提醒

---

## 7. 頁面規劃

### 7.1 Login Page

#### 內容

- Email
- Password
- Login Button

---

### 7.2 Admin Overview Dashboard

#### 內容

- 核心 KPI 卡片
- S1–S6 Funnel Chart
- 咨詢師績效表
- 逾期追蹤名單
- 長時間未推進客戶名單
- 決策障礙統計
- 通知發送區

---

### 7.3 Consultant Dashboard

#### 內容

- 今日待追蹤
- 逾期追蹤
- 我的客戶列表
- 即將進入 S6 客戶
- 主控者通知
- 快速新增客戶
- 快速更新階段

---

### 7.4 Client List Page

#### 功能

- 搜尋客戶
- 依咨詢師篩選
- 依 S1–S6 階段篩選
- 依逾期狀態篩選
- 依來源篩選

#### 表格欄位

- 客戶姓名
- 負責咨詢師
- 目前階段
- 主要障礙
- 下次追蹤時間
- 客戶狀態
- 預估金額

---

### 7.5 Client Detail Page

#### 內容

- 客戶基本資料
- 目前 S1–S6 階段
- 決策障礙
- 追蹤紀錄時間軸
- 下次追蹤日期
- 階段變更紀錄
- 主控者備註
- 新增追蹤紀錄
- 更新階段按鈕

---

### 7.6 Analytics Page

#### 內容

- S1–S6 漏斗
- 各階段平均停留時間
- 各咨詢師轉換率
- 決策障礙統計
- 預估營收
- 本月 / 本季 / 本年趨勢

---

### 7.7 Notification Page

#### 內容

- 收到的通知
- 已發送通知
- 已讀 / 未讀狀態
- 相關客戶
- 通知時間

---

## 8. 資料庫設計

### 8.1 users

| 欄位 | 說明 |
|---|---|
| id | 使用者 ID |
| name | 姓名 |
| email | 登入 Email |
| password_hash | 密碼雜湊 |
| role | admin / consultant |
| status | active / inactive |
| created_at | 建立時間 |
| updated_at | 更新時間 |

---

### 8.2 clients

| 欄位 | 說明 |
|---|---|
| id | 客戶 ID |
| name | 客戶姓名 |
| phone | 電話 |
| line_id | Line ID |
| email | Email |
| gender | 性別 |
| age | 年齡 |
| source | 來源 |
| interested_treatment | 感興趣療程 |
| initial_need | 初步需求 |
| budget_range | 預算範圍 |
| assigned_consultant_id | 負責咨詢師 |
| current_stage | S1 / S2 / S3 / S4 / S5 / S6 |
| client_status | active / paused / completed / lost / archived |
| consultation_status | 尚未回覆 / 有興趣 / 暫緩 / 失聯 |
| estimated_value | 預估療程金額 |
| created_at | 建立時間 |
| updated_at | 更新時間 |

---

### 8.3 stage_logs

| 欄位 | 說明 |
|---|---|
| id | 紀錄 ID |
| client_id | 客戶 ID |
| from_stage | 原階段 |
| to_stage | 新階段 |
| changed_by | 更新者 |
| reason | 變更原因 |
| note | 備註 |
| created_at | 建立時間 |

---

### 8.4 follow_up_logs

| 欄位 | 說明 |
|---|---|
| id | 追蹤紀錄 ID |
| client_id | 客戶 ID |
| consultant_id | 咨詢師 ID |
| contact_method | phone / line / onsite / email |
| content | 追蹤內容 |
| client_response | 客戶反應 |
| next_action | 下一步 |
| next_follow_up_at | 下次追蹤時間 |
| need_admin_support | 是否需要主控者介入 |
| created_at | 建立時間 |

---

### 8.5 decision_barriers

| 欄位 | 說明 |
|---|---|
| id | 障礙 ID |
| client_id | 客戶 ID |
| barrier_type | 障礙類型 |
| description | 補充說明 |
| status | unresolved / resolved |
| created_at | 建立時間 |
| updated_at | 更新時間 |

---

### 8.6 notifications

| 欄位 | 說明 |
|---|---|
| id | 通知 ID |
| sender_id | 發送者 |
| receiver_id | 接收者 |
| client_id | 相關客戶 |
| message | 通知內容 |
| status | unread / read |
| created_at | 建立時間 |

---

## 9. API 設計

本系統 API 主要分為七個模組：

1. Auth API
2. Clients API
3. Stage API
4. Follow-up API
5. Decision Barrier API
6. Notification API
7. Analytics API

---

### 9.1 Auth API

Auth API 負責使用者登入、登出與取得目前登入者資訊。

#### POST /auth/login

使用者登入系統。

##### Request Body

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

##### Response

```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "name": "王院長",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

---

#### POST /auth/logout

使用者登出系統。

##### Response

```json
{
  "message": "Logout success"
}
```

---

#### GET /auth/me

取得目前登入者資訊。

##### Response

```json
{
  "id": 1,
  "name": "王院長",
  "email": "admin@example.com",
  "role": "admin"
}
```

---

### 9.2 Clients API

Clients API 負責客戶資料新增、查詢、更新與刪除。

#### GET /clients

取得客戶列表。

主控者可查看所有客戶，咨詢師只能查看自己負責的客戶。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| consultant_id | 依咨詢師篩選 |
| stage | 依 S1–S6 階段篩選 |
| status | 依客戶狀態篩選 |
| source | 依來源篩選 |
| keyword | 搜尋姓名、電話、Line ID |
| overdue | 是否只顯示逾期追蹤客戶 |
| page | 頁碼 |
| limit | 每頁筆數 |

##### Response

```json
{
  "data": [
    {
      "id": 101,
      "name": "王小姐",
      "phone": "0912345678",
      "line_id": "wang_line",
      "assigned_consultant": {
        "id": 2,
        "name": "陳咨詢師"
      },
      "current_stage": "S3",
      "client_status": "active",
      "consultation_status": "有興趣",
      "estimated_value": 120000,
      "next_follow_up_at": "2026-05-10T10:00:00",
      "created_at": "2026-05-01T09:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85
  }
}
```

---

#### POST /clients

新增客戶。

##### Request Body

```json
{
  "name": "王小姐",
  "phone": "0912345678",
  "line_id": "wang_line",
  "email": "wang@example.com",
  "gender": "female",
  "age": 35,
  "source": "朋友介紹",
  "interested_treatment": "植牙",
  "initial_need": "想了解全口重建方案",
  "budget_range": "100000-150000",
  "assigned_consultant_id": 2,
  "estimated_value": 120000
}
```

##### Response

```json
{
  "id": 101,
  "message": "Client created successfully"
}
```

---

#### GET /clients/:id

取得單一客戶詳細資料。

##### Response

```json
{
  "id": 101,
  "name": "王小姐",
  "phone": "0912345678",
  "line_id": "wang_line",
  "email": "wang@example.com",
  "gender": "female",
  "age": 35,
  "source": "朋友介紹",
  "interested_treatment": "植牙",
  "initial_need": "想了解全口重建方案",
  "budget_range": "100000-150000",
  "assigned_consultant": {
    "id": 2,
    "name": "陳咨詢師"
  },
  "current_stage": "S3",
  "client_status": "active",
  "consultation_status": "有興趣",
  "estimated_value": 120000,
  "created_at": "2026-05-01T09:00:00",
  "updated_at": "2026-05-03T14:00:00"
}
```

---

#### PUT /clients/:id

更新客戶資料。

##### Request Body

```json
{
  "phone": "0987654321",
  "interested_treatment": "植牙與牙周治療",
  "budget_range": "150000-200000",
  "consultation_status": "有興趣",
  "estimated_value": 180000
}
```

##### Response

```json
{
  "message": "Client updated successfully"
}
```

---

#### DELETE /clients/:id

刪除或封存客戶。

MVP 階段建議不要真正刪除資料，而是將客戶狀態改為 `archived`。

##### Response

```json
{
  "message": "Client archived successfully"
}
```

---

### 9.3 Stage API

Stage API 負責更新客戶 S1–S6 階段與查詢階段變更紀錄。

#### POST /clients/:id/stage

更新客戶目前階段。

##### Request Body

```json
{
  "to_stage": "S4",
  "reason": "客戶已明確表達療程需求，可進入需求整合",
  "note": "客戶希望了解植牙與全口重建方案差異"
}
```

##### Response

```json
{
  "message": "Stage updated successfully",
  "client_id": 101,
  "from_stage": "S3",
  "to_stage": "S4"
}
```

---

#### GET /clients/:id/stage-logs

取得客戶階段變更紀錄。

##### Response

```json
{
  "data": [
    {
      "id": 1,
      "from_stage": "S2",
      "to_stage": "S3",
      "changed_by": {
        "id": 2,
        "name": "陳咨詢師"
      },
      "reason": "客戶已回覆並表示有興趣",
      "note": "預計下週安排方案說明",
      "created_at": "2026-05-03T14:00:00"
    }
  ]
}
```

---

### 9.4 Follow-up API

Follow-up API 負責客戶追蹤紀錄、今日待追蹤與逾期追蹤管理。

#### POST /clients/:id/follow-ups

新增客戶追蹤紀錄。

##### Request Body

```json
{
  "contact_method": "line",
  "content": "詢問客戶是否看完療程說明資料",
  "client_response": "客戶表示有興趣，但想再了解恢復期",
  "next_action": "安排醫師說明恢復期與風險",
  "next_follow_up_at": "2026-05-10T10:00:00",
  "need_admin_support": false
}
```

##### Response

```json
{
  "id": 501,
  "message": "Follow-up created successfully"
}
```

---

#### GET /clients/:id/follow-ups

取得某位客戶的所有追蹤紀錄。

##### Response

```json
{
  "data": [
    {
      "id": 501,
      "contact_method": "line",
      "content": "詢問客戶是否看完療程說明資料",
      "client_response": "客戶表示有興趣，但想再了解恢復期",
      "next_action": "安排醫師說明恢復期與風險",
      "next_follow_up_at": "2026-05-10T10:00:00",
      "need_admin_support": false,
      "created_by": {
        "id": 2,
        "name": "陳咨詢師"
      },
      "created_at": "2026-05-03T14:00:00"
    }
  ]
}
```

---

#### GET /follow-ups/today

取得今日需要追蹤的客戶。

##### Response

```json
{
  "data": [
    {
      "client_id": 101,
      "client_name": "王小姐",
      "current_stage": "S3",
      "assigned_consultant": {
        "id": 2,
        "name": "陳咨詢師"
      },
      "next_follow_up_at": "2026-05-04T15:00:00",
      "last_follow_up_at": "2026-05-01T11:00:00"
    }
  ]
}
```

---

#### GET /follow-ups/overdue

取得逾期未追蹤客戶。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| consultant_id | 依咨詢師篩選 |
| days | 逾期天數 |
| stage | 依目前階段篩選 |

##### Response

```json
{
  "data": [
    {
      "client_id": 102,
      "client_name": "林先生",
      "current_stage": "S5",
      "assigned_consultant": {
        "id": 3,
        "name": "李咨詢師"
      },
      "next_follow_up_at": "2026-05-01T10:00:00",
      "overdue_days": 3,
      "last_follow_up_at": "2026-04-28T16:00:00"
    }
  ]
}
```

---

### 9.5 Decision Barrier API

Decision Barrier API 負責記錄與分析客戶成交前的決策障礙。

#### POST /clients/:id/barriers

新增決策障礙。

##### Request Body

```json
{
  "barrier_type": "價格猶豫",
  "description": "客戶覺得 18 萬方案超出預算，但可接受分期",
  "status": "unresolved"
}
```

##### Response

```json
{
  "id": 301,
  "message": "Decision barrier created successfully"
}
```

---

#### PUT /barriers/:id

更新決策障礙狀態。

##### Request Body

```json
{
  "status": "resolved",
  "description": "已提供分期方案，客戶表示可接受"
}
```

##### Response

```json
{
  "message": "Decision barrier updated successfully"
}
```

---

#### GET /analytics/barriers

取得決策障礙統計。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| start_date | 開始日期 |
| end_date | 結束日期 |
| consultant_id | 依咨詢師篩選 |

##### Response

```json
{
  "data": [
    {
      "barrier_type": "價格猶豫",
      "count": 24,
      "percentage": 40.0
    },
    {
      "barrier_type": "擔心風險",
      "count": 15,
      "percentage": 25.0
    }
  ]
}
```

---

### 9.6 Notification API

Notification API 負責主控者發送通知與咨詢師查看通知。

#### POST /notifications

主控者發送通知給咨詢師。

##### Request Body

```json
{
  "receiver_id": 2,
  "client_id": 101,
  "message": "請今天追蹤王小姐，她已經 3 天未更新。"
}
```

##### Response

```json
{
  "id": 701,
  "message": "Notification sent successfully"
}
```

---

#### GET /notifications

取得目前使用者的通知列表。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| status | unread / read |
| page | 頁碼 |
| limit | 每頁筆數 |

##### Response

```json
{
  "data": [
    {
      "id": 701,
      "message": "請今天追蹤王小姐，她已經 3 天未更新。",
      "status": "unread",
      "client": {
        "id": 101,
        "name": "王小姐"
      },
      "sender": {
        "id": 1,
        "name": "王院長"
      },
      "created_at": "2026-05-04T09:00:00"
    }
  ]
}
```

---

#### PUT /notifications/:id/read

將通知標記為已讀。

##### Response

```json
{
  "message": "Notification marked as read"
}
```

---

### 9.7 Analytics API

Analytics API 負責主控者 Dashboard、S1–S6 漏斗、咨詢師績效與營收分析。

#### GET /analytics/overview

取得主控者總覽數據。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| start_date | 開始日期 |
| end_date | 結束日期 |

##### Response

```json
{
  "total_clients": 180,
  "new_clients_this_month": 35,
  "active_clients": 126,
  "s6_clients_this_month": 12,
  "estimated_revenue": 960000,
  "overdue_followups": 18,
  "stagnant_clients": 9
}
```

---

#### GET /analytics/funnel

取得 S1–S6 漏斗資料。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| start_date | 開始日期 |
| end_date | 結束日期 |
| consultant_id | 依咨詢師篩選 |

##### Response

```json
{
  "stages": [
    {
      "stage": "S1",
      "name": "資料蒐集",
      "count": 40
    },
    {
      "stage": "S2",
      "name": "建立節奏",
      "count": 32
    },
    {
      "stage": "S3",
      "name": "咨詢狀態確認",
      "count": 25
    },
    {
      "stage": "S4",
      "name": "需求整合",
      "count": 18
    },
    {
      "stage": "S5",
      "name": "決策障礙釐清",
      "count": 12
    },
    {
      "stage": "S6",
      "name": "治療共識與啟動",
      "count": 8
    }
  ],
  "conversion_rates": [
    {
      "from": "S1",
      "to": "S2",
      "rate": 80.0
    },
    {
      "from": "S2",
      "to": "S3",
      "rate": 78.1
    },
    {
      "from": "S3",
      "to": "S4",
      "rate": 72.0
    },
    {
      "from": "S4",
      "to": "S5",
      "rate": 66.7
    },
    {
      "from": "S5",
      "to": "S6",
      "rate": 66.7
    }
  ]
}
```

---

#### GET /analytics/consultants

取得各咨詢師績效資料。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| start_date | 開始日期 |
| end_date | 結束日期 |

##### Response

```json
{
  "data": [
    {
      "consultant_id": 2,
      "consultant_name": "陳咨詢師",
      "total_clients": 45,
      "new_clients": 12,
      "stage_distribution": {
        "S1": 8,
        "S2": 10,
        "S3": 9,
        "S4": 7,
        "S5": 6,
        "S6": 5
      },
      "overdue_followups": 3,
      "s6_clients": 5,
      "estimated_revenue": 420000,
      "conversion_rate_s1_to_s6": 11.1
    }
  ]
}
```

---

#### GET /analytics/revenue

取得預估營收資料。

##### Query Parameters

| 參數 | 說明 |
|---|---|
| start_date | 開始日期 |
| end_date | 結束日期 |
| consultant_id | 依咨詢師篩選 |

##### Response

```json
{
  "estimated_revenue": 960000,
  "confirmed_revenue": 720000,
  "data": [
    {
      "month": "2026-05",
      "estimated_revenue": 960000,
      "confirmed_revenue": 720000,
      "s6_clients": 12
    }
  ]
}
```

---

### 9.8 API 權限規則

#### 主控者權限

主控者可以呼叫：

```http
GET /clients
POST /clients
GET /clients/:id
PUT /clients/:id
DELETE /clients/:id

POST /clients/:id/stage
GET /clients/:id/stage-logs

POST /clients/:id/follow-ups
GET /clients/:id/follow-ups
GET /follow-ups/today
GET /follow-ups/overdue

POST /clients/:id/barriers
PUT /barriers/:id
GET /analytics/barriers

POST /notifications
GET /notifications
PUT /notifications/:id/read

GET /analytics/overview
GET /analytics/funnel
GET /analytics/consultants
GET /analytics/revenue
```

#### 咨詢師權限

咨詢師可以呼叫：

```http
GET /clients
POST /clients
GET /clients/:id
PUT /clients/:id

POST /clients/:id/stage
GET /clients/:id/stage-logs

POST /clients/:id/follow-ups
GET /clients/:id/follow-ups
GET /follow-ups/today
GET /follow-ups/overdue

POST /clients/:id/barriers
PUT /barriers/:id

GET /notifications
PUT /notifications/:id/read
```

咨詢師限制：

- 只能查看自己負責的客戶
- 只能更新自己負責的客戶
- 不能查看全診所 Analytics
- 不能查看其他咨詢師績效
- 不能發送主控者通知
- 不能刪除其他咨詢師客戶

---

### 9.9 API 設計原則

#### 1. 角色權限清楚分離

主控者看全局，咨詢師看自己的客戶。

#### 2. 客戶資料不真正刪除

刪除客戶時建議改為封存：

```json
{
  "client_status": "archived"
}
```

避免重要醫療咨詢紀錄遺失。

#### 3. 所有階段變更都要留下紀錄

每次 S1–S6 階段更新都需要寫入 `stage_logs`。

#### 4. 所有追蹤行為都應可回溯

每次電話、Line、現場咨詢、Email 都應該寫入 `follow_up_logs`。

#### 5. Dashboard 資料由 Analytics API 統一提供

前端 Dashboard 不應自行組合大量資料，應由後端整理後回傳。

#### 6. MVP 先以簡單 REST API 為主

第一版不需要 GraphQL，REST API 已足夠支援：

- 客戶管理
- 階段追蹤
- 追蹤紀錄
- 通知
- Dashboard 分析

---

## 10. 技術架構建議

### 10.1 Frontend

建議技術：

- React / Next.js
- Tailwind CSS
- Recharts / Chart.js
- Role-based routing

#### 理由

- 適合快速開發 Dashboard
- UI 組件豐富
- 容易做表格、圖表與篩選
- 後續容易擴充

---

### 10.2 Backend

建議技術：

- FastAPI
- 或 NestJS

#### FastAPI 適合情境

- 團隊熟悉 Python
- 後續可能加入 AI 分析
- 需要快速開發 API
- 需要資料分析功能

#### NestJS 適合情境

- 團隊熟悉 TypeScript
- 需要企業級後端結構
- 權限系統較複雜
- 後續系統規模會擴大

---

### 10.3 Database

建議使用：

- PostgreSQL

#### 理由

- 適合結構化資料
- 適合客戶、追蹤紀錄、通知等關聯資料
- 支援複雜查詢
- 適合後續報表與分析

---

### 10.4 Deployment

MVP 可使用：

| 模組 | 建議服務 |
|---|---|
| Frontend | Vercel |
| Backend | Render / Railway / Google Cloud Run |
| Database | Supabase / Neon / Cloud SQL |

---

## 11. KPI 設計

### 11.1 營運 KPI

- 每月新增客戶數
- 每月進入 S6 客戶數
- 每月成交金額
- 平均客戶推進時間
- 高價值療程轉換率
- 逾期追蹤比例

---

### 11.2 咨詢師 KPI

- 負責客戶數
- 追蹤完成率
- 平均追蹤間隔
- S1 → S6 轉換率
- 逾期客戶數
- 預估成交金額

---

### 11.3 流程 KPI

- S1 → S2 轉換率
- S2 → S3 轉換率
- S3 → S4 轉換率
- S4 → S5 轉換率
- S5 → S6 轉換率
- 各階段平均停留時間
- 最常見決策障礙
- S5 平均卡關時間
- S6 啟動完成率

---

## 12. MVP 開發階段

### Phase 1：基礎系統與資料結構

#### 目標

建立基本系統，使診所可以開始紀錄與管理客戶。

#### 功能

- 使用者登入
- 角色權限
- 客戶 CRUD
- 指派咨詢師
- S1–S6 狀態更新
- 階段歷史紀錄

#### 完成標準

- 主控者可登入查看所有客戶
- 咨詢師可登入查看自己的客戶
- 每位客戶都可被標記 S1–S6
- 可新增、編輯、刪除客戶

---

### Phase 2：追蹤紀錄與提醒

#### 目標

讓咨詢師能夠用系統管理 daily workflow。

#### 功能

- 新增追蹤紀錄
- 設定下次追蹤時間
- 今日待追蹤列表
- 逾期未追蹤列表
- 主控者發送通知
- 咨詢師接收通知

#### 完成標準

- 咨詢師每天知道需要追蹤誰
- 主控者能看到逾期未追蹤名單
- 主控者能發送提醒給咨詢師

---

### Phase 3：Dashboard 與分析

#### 目標

讓主控者可以用數據管理整體咨詢流程。

#### 功能

- 主控者 Overview Dashboard
- S1–S6 Funnel
- 咨詢師績效表
- 決策障礙分析
- 預估營收統計

#### 完成標準

- 主控者可查看全診所 S1–S6 分佈
- 可查看每位咨詢師績效
- 可找出最常見決策障礙
- 可初步估算潛在成交金額

---

### Phase 4：優化與自動化

#### 目標

讓系統從紀錄工具升級為管理工具。

#### 功能

- 自動提醒
- 高價值客戶標記
- 長時間未推進警示
- S5 卡關客戶提醒
- 簡易報表匯出
- Line / Email 通知整合

#### 完成標準

- 系統能主動提醒風險客戶
- 可匯出基本管理報表
- 可支援更完整的咨詢流程管理

---

## 13. MVP 成功標準

MVP 上線後，建議以以下標準判斷是否成功：

- 1 個月內，所有咨詢師都能用系統新增與追蹤客戶
- 80% 以上客戶都有明確 S1–S6 狀態
- 90% 以上追蹤紀錄不再依賴紙本、Excel 或個人 Line 記憶
- 主控者可以每天看到逾期追蹤名單
- 主控者可以每週查看每位咨詢師的客戶推進狀況
- 系統可以產出 S1–S6 funnel
- 系統能找出客戶最常卡關的決策障礙
- 系統能初步估算本月潛在成交金額

---

## 14. 後續擴充方向

MVP 完成後，可逐步擴充：

- Line 官方帳號整合
- Email 自動提醒
- AI 自動摘要咨詢紀錄
- AI 推薦下一步話術
- 客戶分級制度
- 療程報價單產生
- 電子簽署同意書
- 付款紀錄整合
- 治療後滿意度追蹤
- 轉介紹追蹤
- 多分院管理
- 醫師端查看客戶需求摘要
- 自動產生週報與月報

---

## 15. 系統核心價值

此 MVP 的重點不是一開始就打造完整 HIS 或大型 CRM，而是先聚焦在：

> 讓每位客戶都能被穩定地從 S1 推進到 S6，並讓主控者清楚知道每位咨詢師的追蹤狀態、客戶目前階段與卡關原因。

第一版最重要的功能是：

- 客戶管理
- S1–S6 狀態追蹤
- 追蹤紀錄
- 下次追蹤提醒
- 主控者 Dashboard
- 咨詢師 Dashboard
- 決策障礙標記
- 通知功能

透過這套系統，診所可以將高端咨詢流程標準化，降低客戶流失率，提高自費療程完成率，並逐步建立可複製、可管理、可擴張的標竿診所營運系統。
