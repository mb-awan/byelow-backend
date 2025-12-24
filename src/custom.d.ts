import { IUserPayload } from './common/models/user';

declare module 'express-serve-static-core' {
  export interface Request {
    user: IUserPayload;
  }
}
