import { Request, Response, NextFunction } from "express";
import { walletService } from "../services/wallet.service";
import { sendSuccess, sendError } from "../utils/response";
import { FundWalletDTO, TransferFundsDTO, WithdrawFundsDTO } from "../types";

export class WalletController {
  async getBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const balance = await walletService.getWalletBalance(userId);
      sendSuccess(res, "Wallet balance retrieved successfully", balance);
    } catch (error) {
      const err = error as Error;
      if (err.message.startsWith("NOT_FOUND:")) {
        sendError(res, err.message.replace("NOT_FOUND: ", ""), 404);
      } else {
        next(error);
      }
    }
  }

  async fundWallet(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const dto: FundWalletDTO = req.body;
      const transaction = await walletService.fundWallet(userId, dto);
      sendSuccess(res, "Wallet funded successfully", transaction, 201);
    } catch (error) {
      const err = error as Error;
      if (err.message.startsWith("NOT_FOUND:")) {
        sendError(res, err.message.replace("NOT_FOUND: ", ""), 404);
      } else if (err.message.startsWith("WALLET_INACTIVE:")) {
        sendError(res, err.message.replace("WALLET_INACTIVE: ", ""), 403);
      } else {
        next(error);
      }
    }
  }

  async transferFunds(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const dto: TransferFundsDTO = req.body;
      const result = await walletService.transferFunds(userId, dto);
      sendSuccess(res, "Transfer completed successfully", result, 201);
    } catch (error) {
      const err = error as Error;
      if (err.message.startsWith("NOT_FOUND:")) {
        sendError(res, err.message.replace("NOT_FOUND: ", ""), 404);
      } else if (err.message.startsWith("INSUFFICIENT_FUNDS:")) {
        sendError(res, err.message.replace("INSUFFICIENT_FUNDS: ", ""), 422);
      } else if (err.message.startsWith("WALLET_INACTIVE:")) {
        sendError(res, err.message.replace("WALLET_INACTIVE: ", ""), 403);
      } else if (err.message.startsWith("INVALID_OPERATION:")) {
        sendError(res, err.message.replace("INVALID_OPERATION: ", ""), 400);
      } else {
        next(error);
      }
    }
  }

  async withdrawFunds(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const dto: WithdrawFundsDTO = req.body;
      const transaction = await walletService.withdrawFunds(userId, dto);
      sendSuccess(res, "Withdrawal successful", transaction, 201);
    } catch (error) {
      const err = error as Error;
      if (err.message.startsWith("NOT_FOUND:")) {
        sendError(res, err.message.replace("NOT_FOUND: ", ""), 404);
      } else if (err.message.startsWith("INSUFFICIENT_FUNDS:")) {
        sendError(res, err.message.replace("INSUFFICIENT_FUNDS: ", ""), 422);
      } else if (err.message.startsWith("WALLET_INACTIVE:")) {
        sendError(res, err.message.replace("WALLET_INACTIVE: ", ""), 403);
      } else {
        next(error);
      }
    }
  }

  async getTransactionHistory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      if (page < 1 || limit < 1 || limit > 100) {
        sendError(res, "Invalid pagination parameters", 400);
        return;
      }

      const result = await walletService.getTransactionHistory(
        userId,
        page,
        limit,
      );
      sendSuccess(res, "Transaction history retrieved successfully", result);
    } catch (error) {
      const err = error as Error;
      if (err.message.startsWith("NOT_FOUND:")) {
        sendError(res, err.message.replace("NOT_FOUND: ", ""), 404);
      } else {
        next(error);
      }
    }
  }
}

export const walletController = new WalletController();
