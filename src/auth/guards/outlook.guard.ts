// src/auth/guards/outlook.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OutlookGuard extends AuthGuard('outlook') {}