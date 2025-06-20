import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, real } from 'drizzle-orm/sqlite-core';

// 用户表
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // 使用 UUID
  email: text('email').unique().notNull(),
  password: text('password').notNull(), // bcrypt 加密
  username: text('username').unique().notNull(),
  role: text('role', { enum: ['free', 'pro', 'admin'] }).notNull().default('free'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  lastLoginAt: text('lastLoginAt'),
  isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
});

// Token 使用记录表
export const tokenUsage = sqliteTable('token_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => users.id),
  tokensUsed: integer('tokensUsed').notNull(),
  modelName: text('modelName').notNull(),
  usageType: text('usageType', { enum: ['chat', 'search', 'image', 'video'] }).notNull(),
  createdAt: text('createdAt').notNull(),
  requestId: text('requestId'),
  cost: real('cost'), // 估算成本
});

// 用户配额表
export const userQuotas = sqliteTable('user_quotas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => users.id).unique(),
  dailyLimit: integer('dailyLimit').notNull().default(1000),
  monthlyLimit: integer('monthlyLimit').notNull().default(30000),
  dailyUsed: integer('dailyUsed').notNull().default(0),
  monthlyUsed: integer('monthlyUsed').notNull().default(0),
  resetDailyAt: text('resetDailyAt').notNull(),
  resetMonthlyAt: text('resetMonthlyAt').notNull(),
});

// 登录会话表
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // 使用 UUID
  userId: text('userId').notNull().references(() => users.id),
  token: text('token').unique().notNull(),
  expiresAt: text('expiresAt').notNull(),
  createdAt: text('createdAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
});

// 审计日志表
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId'),
  action: text('action').notNull(),
  resource: text('resource'),
  details: text('details', { mode: 'json' }),
  ipAddress: text('ipAddress'),
  createdAt: text('createdAt').notNull(),
});

// 现有表的修改
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  content: text('content').notNull(),
  chatId: text('chatId').notNull(),
  messageId: text('messageId').notNull(),
  role: text('type', { enum: ['assistant', 'user'] }),
  metadata: text('metadata', {
    mode: 'json',
  }),
  // 新增字段
  tokensUsed: integer('tokensUsed'),
  modelUsed: text('modelUsed'),
});

interface File {
  name: string;
  fileId: string;
}

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('createdAt').notNull(),
  focusMode: text('focusMode').notNull(),
  files: text('files', { mode: 'json' })
    .$type<File[]>()
    .default(sql`'[]'`),
  // 新增字段
  userId: text('userId').references(() => users.id),
});

// 类型定义
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type UserQuota = typeof userQuotas.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
