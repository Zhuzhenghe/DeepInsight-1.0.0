import bcrypt from 'bcryptjs';
import { getBcryptRounds, getPasswordMinLength } from '@/lib/config';

const SALT_ROUNDS = getBcryptRounds();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  const minLength = getPasswordMinLength();
  
  if (password.length < minLength) {
    return { valid: false, error: `密码长度至少为 ${minLength} 位` };
  }
  
  // 检查是否包含数字
  if (!/\d/.test(password)) {
    return { valid: false, error: '密码必须包含至少一个数字' };
  }
  
  // 检查是否包含字母
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: '密码必须包含至少一个字母' };
  }
  
  return { valid: true };
} 