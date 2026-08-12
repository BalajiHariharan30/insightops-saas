import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface User {
      id: string;
    }
    
    interface Request {
      user?: User;
      organizationId?: string;
      userRole?: 'ADMIN' | 'STAFF';
    }
  }
}
