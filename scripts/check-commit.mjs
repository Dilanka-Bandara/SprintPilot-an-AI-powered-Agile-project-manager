import { readFileSync } from 'node:fs';
const message = readFileSync(process.argv[2], 'utf8').split('\n')[0];
if (
  !/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w/-]+\))?!?: .+/.test(
    message,
  )
) {
  console.error(
    'Use a Conventional Commit, for example: feat(web): add sprint board',
  );
  process.exit(1);
}
