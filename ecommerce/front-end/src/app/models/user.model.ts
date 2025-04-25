export interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  banned: boolean;
  token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}