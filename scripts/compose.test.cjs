const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { copyFileSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

function config({ profile = false, overrides = {} } = {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'testhub-compose-'));
  try {
    copyFileSync(
      path.join(root, 'docker-compose.yaml'),
      path.join(directory, 'docker-compose.yaml'),
    );
    writeFileSync(path.join(directory, '.env'), 'SYNTHETIC_ONLY=true\n');
    const env = {
      ...process.env,
      POSTGRES_USER: 'fixture',
      POSTGRES_PASSWORD: 'fixture-password',
      POSTGRES_DB: 'fixture_db',
      REDIS_PASSWORD: 'fixture-redis',
      PORT: '3301',
      DOCKER_DATABASE_URL: '',
      DOCKER_AI_SERVICE_BASE_URL: '',
      COMPOSE_PROFILES: '',
      COMPOSE_FILE: '',
      ...overrides,
    };
    const result = spawnSync(
      'docker',
      [
        'compose',
        '--project-directory',
        directory,
        '--file',
        path.join(directory, 'docker-compose.yaml'),
        '--env-file',
        path.join(directory, '.env'),
        ...(profile ? ['--profile', 'generation'] : []),
        'config',
        '--no-env-resolution',
        '--format',
        'json',
      ],
      { env, encoding: 'utf8', timeout: 30_000 },
    );
    assert.equal(result.status, 0, result.error?.message || result.stderr);
    return JSON.parse(result.stdout);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('default startup remains infrastructure-only and retains existing volumes', () => {
  const { services, volumes } = config();
  assert.deepEqual(Object.keys(services).sort(), ['postgres', 'redis']);
  assert.equal(services.postgres.image, 'postgres:17-alpine');
  assert.equal(services.postgres.container_name, 'testhub_db');
  assert.equal(services.redis.container_name, 'testhub_redis');
  assert.deepEqual(Object.keys(volumes).sort(), [
    'postgres_data',
    'redis_data',
  ]);
});

test('generation profile wires API and both dedicated workers consistently', () => {
  const { services } = config({ profile: true });
  assert.deepEqual(Object.keys(services).sort(), [
    'ai-worker',
    'api',
    'document-worker',
    'postgres',
    'redis',
  ]);
  for (const name of ['api', 'ai-worker', 'document-worker']) {
    const service = services[name];
    assert.equal(service.image, 'testhub-backend:local');
    assert.equal(service.build.dockerfile, 'Dockerfile');
    assert.equal(service.init, true);
    assert.equal(service.stop_grace_period, '4m0s');
    assert.equal(
      service.environment.DATABASE_URL,
      'postgresql://fixture:fixture-password@postgres:5432/fixture_db',
    );
    assert.equal(service.environment.REDIS_URL, 'redis://redis:6379');
    assert.equal(service.environment.REDIS_PASSWORD, 'fixture-redis');
    assert.equal(
      service.environment.AI_SERVICE_BASE_URL,
      'http://host.docker.internal:8000',
    );
    assert.equal(service.environment.AI_QUESTION_GENERATION_ENABLED, 'true');
    assert.equal(service.environment.AI_RAG_ENABLED, 'true');
    assert.equal(service.environment.NODE_ENV, 'development');
    assert.equal(service.environment.PORT, '3001');
    assert.ok(service.env_file[0].path.endsWith('.env'));
    for (const dependency of ['postgres', 'redis']) {
      assert.equal(service.depends_on[dependency].condition, 'service_healthy');
    }
  }
  assert.deepEqual(services.api.command, ['node', 'dist/main.js']);
  assert.deepEqual(services['ai-worker'].command, [
    'node',
    'dist/question-generation.worker.js',
  ]);
  assert.deepEqual(services['document-worker'].command, [
    'node',
    'dist/document.worker.js',
  ]);
  assert.equal(services.api.ports[0].host_ip, '127.0.0.1');
  assert.equal(services.api.ports[0].published, '3301');
  assert.equal(services.api.ports[0].target, 3001);
  assert.ok(services.api.healthcheck.test.includes('node'));
  assert.equal(services['ai-worker'].ports, undefined);
  assert.equal(services['document-worker'].ports, undefined);
});

test('explicit Docker URLs retain encoded credentials and connection options', () => {
  const databaseUrl =
    'postgresql://fixture:p%40ss%24word@postgres:5432/fixture_db?schema=public';
  const { services } = config({
    profile: true,
    overrides: {
      DOCKER_DATABASE_URL: databaseUrl,
      DOCKER_AI_SERVICE_BASE_URL: 'http://host.docker.internal:8100',
    },
  });
  for (const name of ['api', 'ai-worker', 'document-worker']) {
    assert.equal(services[name].environment.DATABASE_URL, databaseUrl);
    assert.equal(
      services[name].environment.AI_SERVICE_BASE_URL,
      'http://host.docker.internal:8100',
    );
  }
});
