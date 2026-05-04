// Defines shared API response contracts for Next.js route handlers.
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};
