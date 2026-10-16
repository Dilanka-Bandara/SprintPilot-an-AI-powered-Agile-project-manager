import { spawnSync } from 'node:child_process';
for (const [command, args] of [
  ['go', ['-C', 'services/insights', 'mod', 'download']],
  ['uv', ['sync', '--project', 'services/agents']],
  ['pnpm', ['exec', 'lefthook', 'install']],
]) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    console.error(
      `Setup failed: install ${command} and retry. For the web/API demo only: pnpm install && pnpm dev.`,
    );
    process.exit(1);
  }
}
