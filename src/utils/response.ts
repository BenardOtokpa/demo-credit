import { Response } from "express";
import { ApiResponse } from "../types";

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  error?: string,
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  return res.status(statusCode).json(response);
};

export const generateReference = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DC-${timestamp}-${random}`;
};
