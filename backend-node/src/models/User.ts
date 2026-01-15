import { User } from '../../../shared/types';

// User collection interface for MongoDB
export interface UserDocument extends Omit<User, '_id'> {
  _id?: string;
}
