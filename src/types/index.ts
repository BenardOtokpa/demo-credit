export interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  password_hash: string;
  bvn: string;
  is_blacklisted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type TransactionType = "credit" | "debit";
export type TransactionStatus = "pending" | "successful" | "failed";

export interface Transaction {
  id: string;
  wallet_id: string;
  reference: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// Request DTOs (Data Transfer Objects)
// These define what the request BODY must look like
export interface CreateUserDTO {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
  bvn: string;
}

export interface FundWalletDTO {
  amount: number;
  description?: string; // optional (the ? means not required)
}

export interface TransferFundsDTO {
  recipient_email: string;
  amount: number;
  description?: string;
}

export interface WithdrawFundsDTO {
  amount: number;
  description?: string;
}

// JWT token payload
export interface AuthPayload {
  userId: string;
  email: string;
}

// Standard API response shape
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Adjutor Karma check result
export interface KarmaCheckResult {
  is_blacklisted: boolean;
  karma_identity?: string;
  reason?: string;
}
