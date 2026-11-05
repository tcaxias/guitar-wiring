import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateIdentity } from './check-git-identity.mjs';

const root = '/Users/example/Code/guitar-wiring';
const personal =
  'Tiago Caxias <12184375+tcaxias@users.noreply.github.com> 1793577600 +0000';
const values = {
  'rev-parse --show-toplevel': root,
  'config --local --get-all user.name': 'Tiago Caxias',
  'config --local --get-all user.email':
    '12184375+tcaxias@users.noreply.github.com',
  'config --local --get user.useConfigOnly': 'true',
  'var GIT_AUTHOR_IDENT': personal,
  'var GIT_COMMITTER_IDENT': personal,
};

function reader(overrides = {}) {
  return (argumentsList) =>
    ({ ...values, ...overrides })[argumentsList.join(' ')];
}

test('accepts explicit personal author and committer', () => {
  assert.doesNotThrow(() => validateIdentity(reader(), root));
});

for (const key of Object.keys(values)) {
  test(`rejects a mismatch in ${key}`, () => {
    assert.throws(() =>
      validateIdentity(reader({ [key]: 'unexpected' }), root),
    );
  });
}

test('rejects duplicate local email configuration', () => {
  const key = 'config --local --get-all user.email';
  assert.throws(() =>
    validateIdentity(
      reader({ [key]: `${values[key]}\nother@example.test` }),
      root,
    ),
  );
});

test('rejects an environment-resolved author override', () => {
  assert.throws(() =>
    validateIdentity(
      reader({
        'var GIT_AUTHOR_IDENT':
          'Example Person <other@example.test> 1793577600 +0000',
      }),
      root,
    ),
  );
});

test('fails closed when Git configuration cannot be read', () => {
  assert.throws(() =>
    validateIdentity(() => {
      throw new Error('Git unavailable');
    }, root),
  );
});

test('real Git and installed hook reject identity overrides', () => {
  const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const cache = join(project, 'node_modules', '.cache');
  mkdirSync(cache, { recursive: true });
  const fixture = mkdtempSync(join(cache, 'identity-'));
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith('GIT_') && name !== 'EMAIL',
    ),
  );
  environment.GIT_CONFIG_NOSYSTEM = '1';
  environment.GIT_CONFIG_GLOBAL = '/dev/null';
  const git = (...argumentsList) =>
    execFileSync('git', argumentsList, {
      cwd: fixture,
      env: environment,
      stdio: 'pipe',
    });
  const runHook = (overrides = {}) =>
    spawnSync('git', ['hook', 'run', 'pre-commit'], {
      cwd: fixture,
      env: { ...environment, ...overrides },
      encoding: 'utf8',
    });

  try {
    mkdirSync(join(fixture, 'scripts'));
    mkdirSync(join(fixture, '.githooks'));
    copyFileSync(
      join(project, 'scripts/check-git-identity.mjs'),
      join(fixture, 'scripts/check-git-identity.mjs'),
    );
    copyFileSync(
      join(project, '.githooks/pre-commit'),
      join(fixture, '.githooks/pre-commit'),
    );
    chmodSync(join(fixture, '.githooks/pre-commit'), 0o755);
    git('init', '-b', 'main');
    git('config', '--local', 'user.name', 'Tiago Caxias');
    git(
      'config',
      '--local',
      'user.email',
      '12184375+tcaxias@users.noreply.github.com',
    );
    git('config', '--local', 'user.useConfigOnly', 'true');
    git('config', '--local', 'core.hooksPath', '.githooks');
    assert.equal(runHook().status, 0);

    for (const role of ['AUTHOR', 'COMMITTER']) {
      const result = runHook({ [`GIT_${role}_EMAIL`]: 'other@example.test' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /resolved (author|committer)/);
    }

    git('config', '--local', 'user.email', 'other@example.test');
    const result = runHook({
      GIT_AUTHOR_EMAIL: '12184375+tcaxias@users.noreply.github.com',
      GIT_COMMITTER_EMAIL: '12184375+tcaxias@users.noreply.github.com',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /local email/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
