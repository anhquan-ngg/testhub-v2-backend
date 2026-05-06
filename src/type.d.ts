declare module 'express' {
  export interface Request {
    user?: {
      id?: string;
      role?: string;
      email?: string;
      [key: string]: unknown;
    }; // The `user` property is optional
  }
}
