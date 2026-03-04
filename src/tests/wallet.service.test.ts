import { WalletService } from "../services/wallet.service";

// ─── MOCK DATABASE ────────────────────────────────────────────
jest.mock("../models/db", () => {
  const mockDb: any = jest.fn();

  mockDb.transaction = jest.fn().mockImplementation(async (callback: any) => {
    const mockTrx: any = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue([1]),
      update: jest.fn().mockResolvedValue(1),
      where: jest.fn().mockReturnThis(),
      forUpdate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    });
    await callback(mockTrx);
  });

  return { __esModule: true, default: mockDb };
});

// ─── MOCK UUID ────────────────────────────────────────────────
jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("mock-tx-id"),
}));

// ─── TEST DATA ────────────────────────────────────────────────
const mockWallet = {
  id: "wallet-123",
  user_id: "user-123",
  balance: "5000.0000",
  currency: "NGN",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockTransaction = {
  id: "mock-tx-id",
  wallet_id: "wallet-123",
  reference: "DC-TEST-REF",
  type: "credit",
  amount: 1000,
  balance_before: 5000,
  balance_after: 6000,
  description: "Test",
  status: "successful",
  created_at: new Date(),
  updated_at: new Date(),
};

// ─── HELPER ───────────────────────────────────────────────────
const setupDbChain = (returnValues: any[]) => {
  const mockDb = require("../models/db").default;
  let callCount = 0;

  mockDb.mockImplementation(() => ({
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    forUpdate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue(1),
    insert: jest.fn().mockResolvedValue([1]),
    first: jest.fn().mockImplementation(() => {
      const value =
        returnValues[callCount] ?? returnValues[returnValues.length - 1];
      callCount++;
      return Promise.resolve(value);
    }),
  }));
};

// ─── TESTS ────────────────────────────────────────────────────
describe("WalletService", () => {
  let walletService: WalletService;

  beforeEach(() => {
    jest.clearAllMocks();
    walletService = new WalletService();
  });

  // ─── getWalletBalance ────────────────────────────────────────
  describe("getWalletBalance", () => {
    it("should return balance for valid user", async () => {
      setupDbChain([mockWallet]);

      const result = await walletService.getWalletBalance("user-123");

      expect(result.balance).toBe(5000);
      expect(result.currency).toBe("NGN");
    });

    it("should throw NOT_FOUND when wallet does not exist", async () => {
      setupDbChain([null]);

      await expect(walletService.getWalletBalance("user-123")).rejects.toThrow(
        "NOT_FOUND",
      );
    });
  });

  // ─── fundWallet ──────────────────────────────────────────────
  describe("fundWallet", () => {
    it("should fund wallet successfully", async () => {
      // First call: getWalletByUserId, Second call: fetch transaction after insert
      setupDbChain([mockWallet, mockTransaction]);

      const result = await walletService.fundWallet("user-123", {
        amount: 1000,
        description: "Test funding",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("reference");
    });

    it("should throw NOT_FOUND when wallet does not exist", async () => {
      setupDbChain([null]);

      await expect(
        walletService.fundWallet("user-123", { amount: 1000 }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should throw WALLET_INACTIVE when wallet is inactive", async () => {
      const inactiveWallet = { ...mockWallet, is_active: false };
      setupDbChain([inactiveWallet]);

      await expect(
        walletService.fundWallet("user-123", { amount: 1000 }),
      ).rejects.toThrow("WALLET_INACTIVE");
    });

    it("should use default description when none provided", async () => {
      setupDbChain([mockWallet, mockTransaction]);

      const result = await walletService.fundWallet("user-123", {
        amount: 500,
      });

      expect(result).toHaveProperty("id");
    });
  });

  // ─── withdrawFunds ───────────────────────────────────────────
  describe("withdrawFunds", () => {
    it("should withdraw successfully when balance is sufficient", async () => {
      const debitTx = { ...mockTransaction, type: "debit" };
      setupDbChain([mockWallet, debitTx]);

      const result = await walletService.withdrawFunds("user-123", {
        amount: 500,
      });

      expect(result).toHaveProperty("id");
    });

    it("should throw INSUFFICIENT_FUNDS when balance is too low", async () => {
      setupDbChain([mockWallet]);

      await expect(
        walletService.withdrawFunds("user-123", { amount: 99999 }),
      ).rejects.toThrow("INSUFFICIENT_FUNDS");
    });

    it("should throw NOT_FOUND when wallet does not exist", async () => {
      setupDbChain([null]);

      await expect(
        walletService.withdrawFunds("user-123", { amount: 500 }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should throw WALLET_INACTIVE when wallet is inactive", async () => {
      const inactiveWallet = { ...mockWallet, is_active: false };
      setupDbChain([inactiveWallet]);

      await expect(
        walletService.withdrawFunds("user-123", { amount: 500 }),
      ).rejects.toThrow("WALLET_INACTIVE");
    });
  });

  // ─── transferFunds ───────────────────────────────────────────
  describe("transferFunds", () => {
    const recipientUser = {
      id: "recipient-user-id",
      email: "recipient@example.com",
    };

    const recipientWallet = {
      id: "recipient-wallet-id",
      user_id: "recipient-user-id",
      balance: "2000.0000",
      currency: "NGN",
      is_active: true,
    };

    const senderTx = { ...mockTransaction, type: "debit" };
    const recipientTx = { ...mockTransaction, type: "credit" };

    it("should transfer funds successfully", async () => {
      setupDbChain([
        mockWallet, // sender wallet
        recipientUser, // recipient user
        recipientWallet, // recipient wallet
        senderTx, // sender transaction
        recipientTx, // recipient transaction
      ]);

      const result = await walletService.transferFunds("user-123", {
        recipient_email: "recipient@example.com",
        amount: 500,
      });

      expect(result).toHaveProperty("sender_transaction");
      expect(result).toHaveProperty("recipient_transaction");
    });

    it("should throw INSUFFICIENT_FUNDS when balance is too low", async () => {
      setupDbChain([
        mockWallet, // sender wallet (balance 5000)
        recipientUser, // recipient user
        recipientWallet,
      ]);

      await expect(
        walletService.transferFunds("user-123", {
          recipient_email: "recipient@example.com",
          amount: 99999, // more than balance
        }),
      ).rejects.toThrow("INSUFFICIENT_FUNDS");
    });

    it("should throw INVALID_OPERATION on self-transfer", async () => {
      const selfUser = { id: "user-123", email: "self@example.com" };
      setupDbChain([mockWallet, selfUser]);

      await expect(
        walletService.transferFunds("user-123", {
          recipient_email: "self@example.com",
          amount: 500,
        }),
      ).rejects.toThrow("INVALID_OPERATION");
    });

    it("should throw NOT_FOUND when recipient does not exist", async () => {
      setupDbChain([mockWallet, null]);

      await expect(
        walletService.transferFunds("user-123", {
          recipient_email: "ghost@example.com",
          amount: 500,
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should throw NOT_FOUND when sender wallet does not exist", async () => {
      setupDbChain([null]);

      await expect(
        walletService.transferFunds("user-123", {
          recipient_email: "recipient@example.com",
          amount: 500,
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should throw WALLET_INACTIVE when sender wallet is inactive", async () => {
      const inactiveWallet = { ...mockWallet, is_active: false };
      setupDbChain([inactiveWallet]);

      await expect(
        walletService.transferFunds("user-123", {
          recipient_email: "recipient@example.com",
          amount: 500,
        }),
      ).rejects.toThrow("WALLET_INACTIVE");
    });

    it("should throw WALLET_INACTIVE when recipient wallet is inactive", async () => {
      const inactiveRecipientWallet = { ...recipientWallet, is_active: false };
      setupDbChain([mockWallet, recipientUser, inactiveRecipientWallet]);

      await expect(
        walletService.transferFunds("user-123", {
          recipient_email: "recipient@example.com",
          amount: 500,
        }),
      ).rejects.toThrow("WALLET_INACTIVE");
    });
  });
});
