import { randomBytes, scrypt, timingSafeEqual } from "crypto";



const SALT_LENGTH_BYTES = 32;
const HASH_LENGTH_BYTES = 64;
const HASH_ITERATIONS = 1024;
const JOIN_CHARACTER = ".";



async function _hash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      HASH_LENGTH_BYTES,
      { N: HASH_ITERATIONS },
      (err, hash) => {
        if (err) {
          reject(err);
        } else {
          resolve(hash);
        }
      }
    );
  });
}

/**
 * @returns hashed password
 * @description hashes a password
 */
export async function hash(password: string) {
  const salt = randomBytes(SALT_LENGTH_BYTES).toString("hex");
  const hash = await _hash(password, salt).then((x) => x.toString("hex"));
  return `${hash}${JOIN_CHARACTER}${salt}`;
}

/**
 * @returns true if passwords match, else false
 * @description compares a plain password to a hashed password
 */
export async function compare(plainPassword: string, hashedPassword: string) {
  const [originalHash, originalSalt] = hashedPassword.split(JOIN_CHARACTER);

  if (!originalHash || !originalSalt) {
    throw Error("Invalid format for hashed password");
  }

  const originalHashBuffer = Buffer.from(originalHash, "hex");
  const generatedHashBuffer = await _hash(plainPassword, originalSalt);

  return timingSafeEqual(originalHashBuffer, generatedHashBuffer);
}