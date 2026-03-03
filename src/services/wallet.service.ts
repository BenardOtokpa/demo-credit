import { v4 as uuidv4 } from 'uuid';
import db from '../models/db';
import {
  FundWalletDTO,
  TransferFundsDTO,
  WithdrawFundsDTO,
  Transaction,
  Wallet,
} from '../types';
import { generateReference } from '../utils/response';
import logger from '../utils/logger';

export class WalletService {

  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    return db('wallets').where('user_id', userId).first();
  }

  async getWalletBalance(userId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) {
      throw new Error('NOT_FOUND: Wallet not found');
    }
    return {
      balance: Number(wallet.balance),
      currency: wallet.currency,
    };
  }

  async fundWallet(userId: string, dto: FundWalletDTO): Promise<Transaction> {
    // STEP 1 — Get wallet
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) throw new Error('NOT_FOUND: Wallet not found');
    if (!wallet.is_active) throw new Error('WALLET_INACTIVE: Your wallet is not active');

    // STEP 2 — Calculate balances
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + dto.amount;
    const reference = generateReference();

    // STEP 3 — Update DB atomically
    await db.transaction(async (trx) => {
      // Lock the wallet row before updating
      await trx('wallets')
        .where('id', wallet.id)
        .forUpdate()
        .select('balance');

      // Update wallet balance
      await trx('wallets')
        .where('id', wallet.id)
        .update({
          balance: balanceAfter,
          updated_at: new Date(),
        });

      // Record the transaction
      await trx('transactions').insert({
        id: uuidv4(),
        wallet_id: wallet.id,
        reference,
        type: 'credit',
        amount: dto.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: dto.description || 'Wallet funding',
        status: 'successful',
        metadata: JSON.stringify({ source: 'direct_funding' }),
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    logger.info(`Wallet funded: user=${userId}, amount=${dto.amount}, ref=${reference}`);

    // STEP 4 — Return the transaction record
    return db('transactions').where('reference', reference).first();
  }

  async transferFunds(
    senderUserId: string,
    dto: TransferFundsDTO,
  ): Promise<{
    sender_transaction: Transaction;
    recipient_transaction: Transaction;
  }> {
    // STEP 1 — Get sender wallet
    const senderWallet = await this.getWalletByUserId(senderUserId);
    if (!senderWallet) throw new Error('NOT_FOUND: Sender wallet not found');
    if (!senderWallet.is_active) throw new Error('WALLET_INACTIVE: Your wallet is not active');

    // STEP 2 — Get recipient user
    const recipientUser = await db('users')
      .where('email', dto.recipient_email)
      .first();
    if (!recipientUser) throw new Error('NOT_FOUND: Recipient user not found');

    // STEP 3 — Block self-transfer
    if (recipientUser.id === senderUserId) {
      throw new Error('INVALID_OPERATION: You cannot transfer funds to yourself');
    }

    // STEP 4 — Get recipient wallet
    const recipientWallet = await this.getWalletByUserId(recipientUser.id);
    if (!recipientWallet) throw new Error('NOT_FOUND: Recipient wallet not found');
    if (!recipientWallet.is_active) throw new Error('WALLET_INACTIVE: Recipient wallet is not active');

    // STEP 5 — Check sender balance
    const senderBalance = Number(senderWallet.balance);
    if (senderBalance < dto.amount) {
      throw new Error('INSUFFICIENT_FUNDS: Insufficient balance for this transfer');
    }

    // STEP 6 — Calculate all four balance values upfront
    const senderBalanceBefore    = senderBalance;
    const senderBalanceAfter     = senderBalanceBefore - dto.amount;
    const recipientBalanceBefore = Number(recipientWallet.balance);
    const recipientBalanceAfter  = recipientBalanceBefore + dto.amount;
    const reference              = generateReference();

    // STEP 7 — Execute everything atomically
    await db.transaction(async (trx) => {
      // Lock BOTH wallets in sorted order to prevent deadlocks
      const walletIds = [senderWallet.id, recipientWallet.id].sort();
      for (const walletId of walletIds) {
        await trx('wallets')
          .where('id', walletId)
          .forUpdate()
          .select('balance');
      }

      // Debit sender
      await trx('wallets')
        .where('id', senderWallet.id)
        .update({ balance: senderBalanceAfter, updated_at: new Date() });

      // Credit recipient
      await trx('wallets')
        .where('id', recipientWallet.id)
        .update({ balance: recipientBalanceAfter, updated_at: new Date() });

      // Sender's debit transaction record
      await trx('transactions').insert({
        id: uuidv4(),
        wallet_id: senderWallet.id,
        reference: `${reference}-S`,
        type: 'debit',
        amount: dto.amount,
        balance_before: senderBalanceBefore,
        balance_after: senderBalanceAfter,
        description: dto.description || `Transfer to ${dto.recipient_email}`,
        status: 'successful',
        metadata: JSON.stringify({
          transfer_reference: reference,
          recipient_email: dto.recipient_email,
        }),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Recipient's credit transaction record
      await trx('transactions').insert({
        id: uuidv4(),
        wallet_id: recipientWallet.id,
        reference: `${reference}-R`,
        type: 'credit',
        amount: dto.amount,
        balance_before: recipientBalanceBefore,
        balance_after: recipientBalanceAfter,
        description: `Transfer from ${senderUserId}`,
        status: 'successful',
        metadata: JSON.stringify({
          transfer_reference: reference,
          sender_user_id: senderUserId,
        }),
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    logger.info(
      `Transfer: sender=${senderUserId}, recipient=${dto.recipient_email}, amount=${dto.amount}`,
    );

    // STEP 8 — Return both transaction records
    const senderTransaction = await db('transactions')
      .where('reference', `${reference}-S`)
      .first() as Transaction;

    const recipientTransaction = await db('transactions')
      .where('reference', `${reference}-R`)
      .first() as Transaction;

    return { sender_transaction: senderTransaction, recipient_transaction: recipientTransaction };
  }

  async withdrawFunds(userId: string, dto: WithdrawFundsDTO): Promise<Transaction> {
    // STEP 1 — Get wallet
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) throw new Error('NOT_FOUND: Wallet not found');
    if (!wallet.is_active) throw new Error('WALLET_INACTIVE: Your wallet is not active');

    // STEP 2 — Check balance
    const balance = Number(wallet.balance);
    if (balance < dto.amount) {
      throw new Error('INSUFFICIENT_FUNDS: Insufficient balance for withdrawal');
    }

    // STEP 3 — Calculate balances
    const balanceBefore = balance;
    const balanceAfter  = balanceBefore - dto.amount;
    const reference     = generateReference();

    // STEP 4 — Update DB atomically
    await db.transaction(async (trx) => {
      await trx('wallets')
        .where('id', wallet.id)
        .forUpdate()
        .select('balance');

      await trx('wallets')
        .where('id', wallet.id)
        .update({ balance: balanceAfter, updated_at: new Date() });

      await trx('transactions').insert({
        id: uuidv4(),
        wallet_id: wallet.id,
        reference,
        type: 'debit',
        amount: dto.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: dto.description || 'Wallet withdrawal',
        status: 'successful',
        metadata: JSON.stringify({ destination: 'bank_account' }),
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    logger.info(`Withdrawal: user=${userId}, amount=${dto.amount}, ref=${reference}`);

    return db('transactions').where('reference', reference).first();
  }

  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) throw new Error('NOT_FOUND: Wallet not found');

    const offset = (page - 1) * limit;

    // Run both queries simultaneously with Promise.all
    const [transactions, countResult] = await Promise.all([
      db('transactions')
        .where('wallet_id', wallet.id)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),

      db('transactions')
        .where('wallet_id', wallet.id)
        .count('id as count')
        .first(),
    ]);

    return {
      transactions: transactions as Transaction[],
      total: Number((countResult as { count: string | number })?.count || 0),
      page,
      limit,
    };
  }
}

export const walletService = new WalletService();