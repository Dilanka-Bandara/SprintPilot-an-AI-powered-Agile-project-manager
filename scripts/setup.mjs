import { spawnSync } from 'node:child_process';
for (const [command, args] of [
  ['pnpm', ['--filter', '@sprintpilot/api', 'db:generate']],
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
      `Setup failed while running ${command}. Check the output above. For web/API only: pnpm install, pnpm --filter @sprintpilot/api db:generate, then pnpm dev.`,
    );
    process.exit(1);
  }
}
