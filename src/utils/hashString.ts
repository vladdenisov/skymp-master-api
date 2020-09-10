import * as crypto from "crypto";

const staticSalt = "a64dd85b01a87604999b74675bdd5304";

export const hashString = async (
  text: string,
  salt: string
): Promise<string> => {
  return crypto
    .createHash("md5")
    .update(text + staticSalt + salt)
    .digest("hex");
};
