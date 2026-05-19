import argon2 from 'argon2';

export const hashPassword = (pass: string) => argon2.hash(pass);
export const verifyPassword = (hash: string, pass: string) => argon2.verify(hash, pass);
