import { UserService } from "../services/user.service";

// ─── MOCK DATABASE ────────────────────────────────────────────
jest.mock("../models/db", () => {
  const mockDb: any = jest.fn();

  mockDb.transaction = jest.fn().mockImplementation(async (callback: any) => {
    // trx must be a FUNCTION that returns chainable object
    const mockTrx: any = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue([1]),
      update: jest.fn().mockResolvedValue(1),
      where: jest.fn().mockReturnThis(),
      forUpdate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    });
    await callback(mockTrx);
  });

  mockDb.raw = jest.fn().mockResolvedValue([]);

  return {
    __esModule: true,
    default: mockDb,
  };
});

// ─── MOCK BCRYPT ──────────────────────────────────────────────
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password_123"),
  compare: jest.fn().mockResolvedValue(true),
}));

// ─── MOCK UUID ────────────────────────────────────────────────
jest.mock("uuid", () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce("mock-user-id")
    .mockReturnValueOnce("mock-wallet-id")
    .mockReturnValue("mock-uuid"),
}));

// ─── MOCK ADJUTOR ─────────────────────────────────────────────
const mockCheckKarmaBlacklist = jest.fn().mockResolvedValue({
  is_blacklisted: false,
});

jest.mock("../services/adjutor.service", () => ({
  adjutorService: {
    checkKarmaBlacklist: (...args: any[]) => mockCheckKarmaBlacklist(...args),
  },
}));

// ─── TEST DATA ────────────────────────────────────────────────
const mockUser = {
  id: "mock-user-id",
  full_name: "John Doe",
  email: "john@example.com",
  phone_number: "+2348012345678",
  password_hash: "hashed_password_123",
  bvn: "12345678901",
  is_blacklisted: false,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockWallet = {
  id: "mock-wallet-id",
  user_id: "mock-user-id",
  balance: 0,
  currency: "NGN",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

const validDto = {
  full_name: "John Doe",
  email: "john@example.com",
  phone_number: "+2348012345678",
  password: "password123",
  bvn: "12345678901",
};

// ─── HELPER ───────────────────────────────────────────────────
const setupDbChain = (returnValues: any[]) => {
  const mockDb = require("../models/db").default;
  let callCount = 0;

  mockDb.mockImplementation(() => ({
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    first: jest.fn().mockImplementation(() => {
      const value =
        returnValues[callCount] ?? returnValues[returnValues.length - 1];
      callCount++;
      return Promise.resolve(value);
    }),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
  }));
};

// reset adjutor to clean state
const resetAdjutor = () => {
  mockCheckKarmaBlacklist.mockResolvedValue({ is_blacklisted: false });
};
// ─── TESTS ────────────────────────────────────────────────────
describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAdjutor(); // ← reset adjutor to "clean" before every test
    userService = new UserService();
  });

  // ─── createUser ─────────────────────────────────────────────
  describe("createUser", () => {
    it("should create user and wallet successfully", async () => {
      // null = no duplicate, mockUser = findUserById, mockWallet = findWalletByUserId
      setupDbChain([null, mockUser, mockWallet]);

      const result = await userService.createUser(validDto);

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("wallet");
      expect(result).toHaveProperty("token");
      expect(result.user.email).toBe(validDto.email);
    });

    it("should not return password_hash in response", async () => {
      setupDbChain([null, mockUser, mockWallet]);

      const result = await userService.createUser(validDto);

      expect(result.user).not.toHaveProperty("password_hash");
    });

    it("should throw BLACKLISTED when email is on karma list", async () => {
      mockCheckKarmaBlacklist.mockResolvedValue({
        is_blacklisted: true,
        reason: "Fraud",
      });

      await expect(userService.createUser(validDto)).rejects.toThrow(
        "BLACKLISTED",
      );
    });

    it("should throw BLACKLISTED when BVN is on karma list", async () => {
      mockCheckKarmaBlacklist
        .mockResolvedValueOnce({ is_blacklisted: false }) // email passes
        .mockResolvedValueOnce({ is_blacklisted: true, reason: "Fraud" }); // BVN fails

      await expect(userService.createUser(validDto)).rejects.toThrow(
        "BLACKLISTED",
      );
    });

    it("should throw DUPLICATE when email already exists", async () => {
      setupDbChain([mockUser]); // existing user found

      await expect(userService.createUser(validDto)).rejects.toThrow(
        "DUPLICATE",
      );
    });

    it("should throw DUPLICATE when phone number already exists", async () => {
      const existingUser = {
        ...mockUser,
        email: "different@example.com",
        phone_number: validDto.phone_number,
      };
      setupDbChain([existingUser]);

      await expect(userService.createUser(validDto)).rejects.toThrow(
        "DUPLICATE",
      );
    });

    it("should throw DUPLICATE when BVN already exists", async () => {
      const existingUser = {
        ...mockUser,
        email: "different@example.com",
        phone_number: "+2349999999999",
        bvn: validDto.bvn,
      };
      setupDbChain([existingUser]);

      await expect(userService.createUser(validDto)).rejects.toThrow(
        "DUPLICATE",
      );
    });
  });

  // ─── loginUser ───────────────────────────────────────────────
  describe("loginUser", () => {
    it("should login successfully with valid credentials", async () => {
      setupDbChain([mockUser, mockWallet]);

      const result = await userService.loginUser(
        "john@example.com",
        "password123",
      );

      expect(result).toHaveProperty("token");
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user).not.toHaveProperty("password_hash");
    });

    it("should throw AUTH when user is not found", async () => {
      setupDbChain([null]);

      await expect(
        userService.loginUser("notfound@example.com", "password123"),
      ).rejects.toThrow("AUTH:");
    });

    it("should throw AUTH when password is incorrect", async () => {
      const bcrypt = require("bcryptjs");
      bcrypt.compare.mockResolvedValueOnce(false);
      setupDbChain([mockUser]);

      await expect(
        userService.loginUser("john@example.com", "wrongpassword"),
      ).rejects.toThrow("AUTH:");
    });

    it("should throw BLACKLISTED when account is blacklisted", async () => {
      const blacklistedUser = { ...mockUser, is_blacklisted: true };
      setupDbChain([blacklistedUser]);

      await expect(
        userService.loginUser("john@example.com", "password123"),
      ).rejects.toThrow("BLACKLISTED:");
    });

    it("should not expose password_hash in login response", async () => {
      setupDbChain([mockUser, mockWallet]);

      const result = await userService.loginUser(
        "john@example.com",
        "password123",
      );

      expect(result.user).not.toHaveProperty("password_hash");
    });
  });

  // ─── generateToken & verifyToken ────────────────────────────
  describe("generateToken and verifyToken", () => {
    it("should generate a valid JWT token", () => {
      const payload = { userId: "user-123", email: "test@example.com" };
      const token = userService.generateToken(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("should verify and decode a valid token", () => {
      const payload = { userId: "user-123", email: "test@example.com" };
      const token = userService.generateToken(payload);
      const decoded = userService.verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it("should throw error for invalid token", () => {
      expect(() => userService.verifyToken("invalid.token.string")).toThrow();
    });

    it("should throw error for tampered token", () => {
      const payload = { userId: "user-123", email: "test@example.com" };
      const token = userService.generateToken(payload);
      const tampered = token.slice(0, -5) + "XXXXX";

      expect(() => userService.verifyToken(tampered)).toThrow();
    });
  });

  // ─── sanitizeUser ────────────────────────────────────────────
  describe("sanitizeUser", () => {
    it("should remove password_hash from user object", () => {
      const sanitized = userService.sanitizeUser(mockUser);
      expect(sanitized).not.toHaveProperty("password_hash");
    });

    it("should keep all other user fields intact", () => {
      const sanitized = userService.sanitizeUser(mockUser);
      expect(sanitized).toHaveProperty("id");
      expect(sanitized).toHaveProperty("email");
      expect(sanitized).toHaveProperty("full_name");
      expect(sanitized).toHaveProperty("bvn");
    });
  });
});
