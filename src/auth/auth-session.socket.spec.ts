import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import { EncryptionService } from '../encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthSessionService, type SessionClaims } from './auth-session.service';

describe('AuthSessionService socket lifecycle', () => {
  let service: AuthSessionService;
  const claims: SessionClaims = {
    sub: 'fixture-user',
    sid: 'fixture-session',
    token_use: 'access',
  };

  function socket() {
    return {
      handshake: {
        auth: { token: 'fixture-access-token' } as { token?: string },
        headers: { cookie: 'access_token=fixture-cookie-token' },
      },
      disconnected: false,
      data: {} as { sessionClaims?: SessionClaims },
      once: jest.fn<void, [string, () => void]>(),
      disconnect: jest.fn(),
    };
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    const module = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        { provide: PrismaService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: EncryptionService, useValue: {} },
      ],
    }).compile();
    service = module.get(AuthSessionService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('rejects a socket that disconnects while authentication is pending without registering a timer', async () => {
    const client = socket();
    jest.spyOn(service, 'authenticate').mockImplementation(async () => {
      await Promise.resolve();
      client.disconnected = true;
      return claims;
    });

    // A minimal transport double; no Socket.IO server or database is needed.
    await expect(
      service.bindSocket(client as unknown as Socket),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jest.getTimerCount()).toBe(0);
    expect(client.once).not.toHaveBeenCalled();
    expect(client.data.sessionClaims).toBeUndefined();
  });

  it.each(['handshake', 'cookie'])(
    'binds a connected socket using its %s token and clears its timer on disconnect',
    async (source) => {
      const client = socket();
      if (source === 'cookie') client.handshake.auth = {};
      const authenticate = jest
        .spyOn(service, 'authenticate')
        .mockResolvedValue(claims);
      const assertActive = jest
        .spyOn(service, 'assertActive')
        .mockRejectedValue(new UnauthorizedException());

      await expect(
        service.bindSocket(client as unknown as Socket),
      ).resolves.toEqual(claims);
      expect(authenticate).toHaveBeenCalledWith(
        source === 'cookie' ? 'fixture-cookie-token' : 'fixture-access-token',
      );
      expect(client.data.sessionClaims).toEqual(claims);
      expect(jest.getTimerCount()).toBe(1);
      await jest.advanceTimersByTimeAsync(4999);
      expect(assertActive).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(assertActive).toHaveBeenCalledWith(claims);
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.once).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
      client.once.mock.calls[0][1]();
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('does not register a timer when authentication fails', async () => {
    const client = socket();
    jest
      .spyOn(service, 'authenticate')
      .mockRejectedValue(new UnauthorizedException());
    await expect(
      service.bindSocket(client as unknown as Socket),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jest.getTimerCount()).toBe(0);
    expect(client.once).not.toHaveBeenCalled();
  });
});
