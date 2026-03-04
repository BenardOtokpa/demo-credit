import Joi from "joi";

export const createUserSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Full name must be at least 2 characters",
    "any.required": "Full name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "any.required": "Email is required",
  }),
  phone_number: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
      "any.required": "Phone number is required",
    }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
  bvn: Joi.string().length(11).pattern(/^\d+$/).required().messages({
    "string.length": "BVN must be exactly 11 digits",
    "string.pattern.base": "BVN must contain only digits",
    "any.required": "BVN is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const fundWalletSchema = Joi.object({
  amount: Joi.number().positive().precision(2).min(1).required().messages({
    "number.positive": "Amount must be a positive number",
    "number.min": "Minimum funding amount is 1",
    "any.required": "Amount is required",
  }),
  description: Joi.string().max(255).optional(),
});

export const transferFundsSchema = Joi.object({
  recipient_email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid recipient email",
    "any.required": "Recipient email is required",
  }),
  amount: Joi.number().positive().precision(2).min(1).required().messages({
    "number.positive": "Amount must be a positive number",
    "number.min": "Minimum transfer amount is 1",
    "any.required": "Amount is required",
  }),
  description: Joi.string().max(255).optional(),
});

export const withdrawFundsSchema = Joi.object({
  amount: Joi.number().positive().precision(2).min(1).required().messages({
    "number.positive": "Amount must be a positive number",
    "number.min": "Minimum withdrawal amount is 1",
    "any.required": "Amount is required",
  }),
  description: Joi.string().max(255).optional(),
});
