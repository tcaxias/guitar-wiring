import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedName = 'Tiago Caxias';
const expectedEmail = '12184375+tcaxias@users.noreply.github.com';

export function validateIdentity(readGit, expectedRepository = repository) {
  const checks = [
    [['rev-parse', '--show-toplevel'], expectedRepository, 'repository root'],
    [
      ['config', '--local', '--get-all', 'user.name'],
      expectedName,
      'local name',
    ],
    [
      ['config', '--local', '--get-all', 'user.email'],
      expectedEmail,
      'local email',
    ],
    [
      ['config', '--local', '--get', 'user.useConfigOnly'],
      'true',
      'explicit identity',
    ],
  ];

  for (const [argumentsList, expected, label] of checks) {
    if (readGit(argumentsList).trim() !== expected) {
      throw new Error(
        `Personal Git identity check failed: ${label}. See AGENTS.md.`,
      );
    }
  }

  for (const role of ['AUTHOR', 'COMMITTER']) {
    const identity = readGit(['var', `GIT_${role}_IDENT`]).trim();
    const match = /^(.*?) <([^<>]+)> \d+ [+-]\d{4}$/.exec(identity);
    if (match?.[1] !== expectedName || match?.[2] !== expectedEmail) {
      throw new Error(
        `Personal Git identity check failed: resolved ${role.toLowerCase()}. Check Git environment overrides.`,
      );
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    validateIdentity((argumentsList) =>
      execFileSync('git', argumentsList, {
        cwd: repository,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
    console.log(
      `Personal Git identity verified: ${expectedName} <${expectedEmail}>`,
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : 'Git identity verification failed.',
    );
    process.exitCode = 1;
  }
}
