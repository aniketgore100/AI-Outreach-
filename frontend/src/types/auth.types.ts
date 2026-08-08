export interface User {
  id: string;
  companyName: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface RegisterPayload {
  companyName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
