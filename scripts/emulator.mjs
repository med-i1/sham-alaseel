// تشغيل محاكي Firebase المحلي. محتاج Java 21 أو أحدث.
//   node scripts/emulator.mjs start
//   node scripts/emulator.mjs exec "node --test tests/rules/rules.test.js"
// بيدور على Java في SHAM_JAVA_HOME ثم .tools/ ثم JAVA_HOME ثم Eclipse Adoptium ثم PATH.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const exe = process.platform === 'win32' ? 'java.exe' : 'java';
const tools = join(root, '.tools');
const adoptium = join(process.env.ProgramFiles || 'C:/Program Files', 'Eclipse Adoptium');
const inside = (dir) => (existsSync(dir) ? readdirSync(dir).map((name) => join(dir, name)) : []);

const homes = [
  process.env.SHAM_JAVA_HOME,
  ...inside(tools),
  process.env.JAVA_HOME,
  // على ويندوز ممكن Java 8 تفضل سابقة في PATH بعد التثبيت
  ...inside(adoptium).filter((home) => /jdk-(2[1-9]|[3-9]\d)/.test(home)).reverse(),
].filter((home) => home && existsSync(join(home, 'bin', exe)));

const env = { ...process.env };
if (homes[0]) {
  env.JAVA_HOME = homes[0];
  const key = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
  env[key] = join(homes[0], 'bin') + delimiter + env[key];
}

const version = spawnSync(homes[0] ? join(homes[0], 'bin', exe) : 'java', ['-version'], { encoding: 'utf8' });
const major = Number(/version "(\d+)(?:\.(\d+))?/.exec(version.stderr || '')?.[1] || 0);
if (major < 21) {
  console.error(`محاكي Firebase محتاج Java 21 أو أحدث (الموجود: ${major === 1 ? '8 أو أقدم' : major || 'مفيش'}).`);
  console.error('نزّل JDK 21 وحطه في مجلد .tools أو اضبط SHAM_JAVA_HOME.');
  process.exit(1);
}

const [mode, command] = process.argv.slice(2);
const firebase = join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const args = mode === 'exec'
  ? ['emulators:exec', '--only', 'firestore', '--project', 'demo-sham', command]
  : ['emulators:start', '--project', 'demo-sham'];

spawn(process.execPath, [firebase, ...args], { cwd: root, env, stdio: 'inherit' })
  .on('exit', (code) => process.exit(code ?? 1));
