// src/auth/strategies/outlook.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

// passport-microsoft dùng cú pháp CommonJS
const MicrosoftStrategy = require('passport-microsoft').Strategy;

@Injectable()
export class OutlookStrategy extends PassportStrategy(MicrosoftStrategy, 'outlook') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('OUTLOOK_CLIENT_ID'),
      clientSecret: config.get('OUTLOOK_CLIENT_SECRET'),
      callbackURL: config.get('OUTLOOK_CALLBACK_URL'),
      scope: ['user.read'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    const user = {
      email: profile.emails?.[0]?.value ?? profile.userPrincipalName,
      full_name: profile.displayName,
      provider: 'outlook',
      provider_id: profile.id,
    };

    done(null, user);
  }
}