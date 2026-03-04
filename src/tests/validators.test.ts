import {
  createUserSchema,
  loginSchema,
  fundWalletSchema,
  transferFundsSchema,
  withdrawFundsSchema,
} from "../utils/validators";

describe("Validators", () => {
  // ─── createUserSchema ───────────────────────────────────────
  describe("createUserSchema", () => {
    const validPayload = {
      full_name: "John Doe",
      email: "john@example.com",
      phone_number: "+2348012345678",
      password: "password123",
      bvn: "12345678901",
    };

    // POSITIVE TESTS
    it("should pass with valid payload", () => {
      const { error } = createUserSchema.validate(validPayload);
      expect(error).toBeUndefined();
    });

    it("should pass with valid payload and no optional fields", () => {
      const { error } = createUserSchema.validate(validPayload);
      expect(error).toBeUndefined();
    });

    // NEGATIVE TESTS
    it("should fail with invalid email", () => {
      const { error } = createUserSchema.validate({
        ...validPayload,
        email: "invalid-email",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain("valid email");
    });

    it("should fail with BVN shorter than 11 digits", () => {
      const { error } = createUserSchema.validate({
        ...validPayload,
        bvn: "12345",
      });
      expect(error).toBeDefined();
    });

    it("should fail with BVN longer than 11 digits", () => {
      const { error } = createUserSchema.validate({
        ...validPayload,
        bvn: "123456789012",
      });
      expect(error).toBeDefined();
    });

    it("should fail with BVN containing letters", () => {
      const { error } = createUserSchema.validate({
        ...validPayload,
        bvn: "1234567890A",
      });
      expect(error).toBeDefined();
    });

    it("should fail with password shorter than 8 characters", () => {
      const { error } = createUserSchema.validate({
        ...validPayload,
        password: "short",
      });
      expect(error).toBeDefined();
    });

    it("should fail with missing full_name", () => {
      const { full_name, ...withoutName } = validPayload;
      const { error } = createUserSchema.validate(withoutName);
      expect(error).toBeDefined();
    });

    it("should fail with missing email", () => {
      const { email, ...withoutEmail } = validPayload;
      const { error } = createUserSchema.validate(withoutEmail);
      expect(error).toBeDefined();
    });

    it("should fail with full_name less than 2 characters", () => {
      const { error } = createUserSchema.validate({
        ...validPayload,
        full_name: "J",
      });
      expect(error).toBeDefined();
    });
  });

  // ─── loginSchema ────────────────────────────────────────────
  describe("loginSchema", () => {
    // POSITIVE
    it("should pass with valid email and password", () => {
      const { error } = loginSchema.validate({
        email: "test@example.com",
        password: "password123",
      });
      expect(error).toBeUndefined();
    });

    // NEGATIVE
    it("should fail with missing password", () => {
      const { error } = loginSchema.validate({
        email: "test@example.com",
      });
      expect(error).toBeDefined();
    });

    it("should fail with invalid email", () => {
      const { error } = loginSchema.validate({
        email: "not-an-email",
        password: "password123",
      });
      expect(error).toBeDefined();
    });
  });

  // ─── fundWalletSchema ────────────────────────────────────────
  describe("fundWalletSchema", () => {
    // POSITIVE
    it("should pass with valid amount", () => {
      const { error } = fundWalletSchema.validate({ amount: 1000 });
      expect(error).toBeUndefined();
    });

    it("should pass with amount and optional description", () => {
      const { error } = fundWalletSchema.validate({
        amount: 500,
        description: "Salary",
      });
      expect(error).toBeUndefined();
    });

    // NEGATIVE
    it("should fail with amount of zero", () => {
      const { error } = fundWalletSchema.validate({ amount: 0 });
      expect(error).toBeDefined();
    });

    it("should fail with negative amount", () => {
      const { error } = fundWalletSchema.validate({ amount: -500 });
      expect(error).toBeDefined();
    });

    it("should fail with missing amount", () => {
      const { error } = fundWalletSchema.validate({});
      expect(error).toBeDefined();
    });

    it("should fail with amount less than 1", () => {
      const { error } = fundWalletSchema.validate({ amount: 0.5 });
      expect(error).toBeDefined();
    });
  });

  // ─── transferFundsSchema ─────────────────────────────────────
  describe("transferFundsSchema", () => {
    // POSITIVE
    it("should pass with valid payload", () => {
      const { error } = transferFundsSchema.validate({
        recipient_email: "recipient@example.com",
        amount: 500,
      });
      expect(error).toBeUndefined();
    });

    // NEGATIVE
    it("should fail with invalid recipient email", () => {
      const { error } = transferFundsSchema.validate({
        recipient_email: "not-an-email",
        amount: 500,
      });
      expect(error).toBeDefined();
    });

    it("should fail with missing recipient email", () => {
      const { error } = transferFundsSchema.validate({ amount: 500 });
      expect(error).toBeDefined();
    });

    it("should fail with negative amount", () => {
      const { error } = transferFundsSchema.validate({
        recipient_email: "recipient@example.com",
        amount: -100,
      });
      expect(error).toBeDefined();
    });
  });

  // ─── withdrawFundsSchema ─────────────────────────────────────
  describe("withdrawFundsSchema", () => {
    // POSITIVE
    it("should pass with valid amount", () => {
      const { error } = withdrawFundsSchema.validate({ amount: 250 });
      expect(error).toBeUndefined();
    });

    // NEGATIVE
    it("should fail with negative amount", () => {
      const { error } = withdrawFundsSchema.validate({ amount: -250 });
      expect(error).toBeDefined();
    });

    it("should fail with missing amount", () => {
      const { error } = withdrawFundsSchema.validate({});
      expect(error).toBeDefined();
    });
  });
});
