import * as jwt from "jsonwebtoken";

import { config } from "../cfg";

export const createToken = (
  id: string,
  email: string,
  hasVerifiedEmail: boolean,
  roles: string[]
): string => {
  return jwt.sign({ id, email, hasVerifiedEmail, roles }, config.JWT_SECRET);
};
