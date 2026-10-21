import { ConfigService } from '@nestjs/config';

/** Resolve the shared Redis connection for API queues and dedicated workers. */
export function getRedisConnection(config: ConfigService) {
  const redisUrl = config.get<string>('REDIS_URL');
  const redisPassword = config.get<string>('REDIS_PASSWORD');
  if (!redisUrl) {
    return {
      host: '127.0.0.1',
      port: 6379,
      password: redisPassword || undefined,
    };
  }

  const parsed = new URL(redisUrl);
  const db = parsed.pathname ? Number(parsed.pathname.replace('/', '')) : 0;
  const tls = parsed.protocol === 'rediss:' ? {} : undefined;

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : redisPassword || undefined,
    db: Number.isNaN(db) ? 0 : db,
    ...(tls !== undefined ? { tls } : {}),
  };
}
