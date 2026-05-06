import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;

    constructor(private configService: ConfigService) {
        const secret = this.configService.get<string>('ENCRYPTION_SECRET');
        if (!secret || secret.length < 32) {
            throw new Error('ENCRYPTION_SECRET must be a 32-byte hex string');
        }

        this.key = crypto.createHash('sha256').update(secret).digest();
    }

    encrypt(plaintext: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // GCM auth tag ngăn tamper — lưu kèm vào encrypted
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([authTag, encrypted]);

    return {
      encrypted: combined.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  decrypt(encryptedBase64: string, ivBase64: string): string {
    const iv = Buffer.from(ivBase64, 'base64');
    const combined = Buffer.from(encryptedBase64, 'base64');

    // Tách auth tag (16 bytes đầu) và ciphertext
    const authTag = combined.subarray(0, 16);
    const encrypted = combined.subarray(16);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }

  hashToken(token: string): string {
    // Dùng cho refresh_token của local JWT — one-way, không decrypt được
    return crypto
      .createHmac('sha256', this.key)
      .update(token)
      .digest('base64');
  }

  compareHash(raw: string, hash: string): boolean {
    const rawHash = this.hashToken(raw);
    return crypto.timingSafeEqual(
      Buffer.from(rawHash),
      Buffer.from(hash),
    );
  }
}