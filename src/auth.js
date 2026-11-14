import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG_PATH = path.join(os.homedir(), '.adplat-session.json');

export class AuthManager {
  static getToken() {
    // 1. Prioritize environment variable
    if (process.env.ADPLAT_SESSION_TOKEN) {
      return process.env.ADPLAT_SESSION_TOKEN.trim();
    }

    // 2. Fallback to local user config file
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        if (data.sessionToken) {
          return data.sessionToken.trim();
        }
      } catch (e) {
        // Ignore read errors
      }
    }

    return null;
  }

  static setToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided');
    }
    const cleanToken = token.trim();
    const data = {
      sessionToken: cleanToken,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    process.env.ADPLAT_SESSION_TOKEN = cleanToken;
    return true;
  }

  static getCookieHeader() {
    const token = this.getToken();
    if (!token) return '';
    return `__Secure-better-auth.session_token=${token}`;
  }
}
