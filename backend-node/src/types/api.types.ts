export interface ApiResponse<T = unknown> {
  statusCode: number;
  statusMessage: string;
  data: T;
}

export interface ApiError {
  statusCode: number;
  statusMessage: string;
  data: {
    message: string;
  };
}
