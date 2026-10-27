import { defineConfig } from 'prisma/config';

// Offline schema generation only: never loads the project's environment files.
export default defineConfig({
  schema: '../../../prisma/schema.prisma',
  datasource: { url: 'postgresql://fixture:fixture@127.0.0.1:1/fixture_test' },
});
