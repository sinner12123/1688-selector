const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const CLI = process.env.BB1688_CLI || path.join(process.env.APPDATA, 'npm', '1688.cmd');

function q(s) { s = String(s).replace(/"/g, ''); return /\s/.test(s) ? `"${s}"` : s; }

function runCli(args, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const outFile = path.join(os.tmpdir(), `1688-${id}.json`);
    const errFile = path.join(os.tmpdir(), `1688-${id}.err`);
    const cmd = `"${CLI}" ${args.map(q).join(' ')} > "${outFile}" 2> "${errFile}"`;
    const child = spawn(cmd, { shell: true, stdio: 'ignore', windowsHide: true });
    const timer = setTimeout(() => { try { child.kill(); } catch {} resolve({ ok: false, error: 'timeout' }); }, timeoutMs);
    child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: String(e.message) }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      let stdout = '', stderr = '';
      try { stdout = fs.readFileSync(outFile, 'utf8'); } catch {}
      try { stderr = fs.readFileSync(errFile, 'utf8'); } catch {}
      try { fs.unlinkSync(outFile); } catch {}
      try { fs.unlinkSync(errFile); } catch {}
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

(async () => {
  const r = await runCli(['search', '手机壳', '--max', '3', '--json']);
  console.log('ok:', r.ok, '| exit code:', r.code);
  if (!r.ok) {
    console.log('stderr:', r.stderr);
    console.log('stdout:', r.stdout.slice(0, 300));
    return;
  }
  const j = JSON.parse(r.stdout);
  console.log('keyword:', j.keyword, '| total:', j.total, '| offers:', (j.offers || []).length);
  (j.offers || []).slice(0, 3).forEach((o) => {
    console.log(' -', (o.price && o.price.text) || '-', '|', (o.supplier && o.supplier.name) || '-', '|', o.title);
  });
})();
