const { execSync, spawn } = require('child_process');
const path = require('path');

const PORT = Number(process.env.PORT || 5001);
const serverDir = path.resolve(__dirname, '..');

function killPort(port) {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const pids = new Set();

        output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => {
                const parts = line.split(/\s+/);
                const pid = parts[parts.length - 1];
                const localAddress = parts[1] || '';
                const state = parts[3] || '';

                if (localAddress.includes(`:${port}`) && state === 'LISTENING' && /^\d+$/.test(pid)) {
                    pids.add(pid);
                }
            });

        pids.forEach((pid) => {
            try {
                execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
                console.log(`Stopped process ${pid} on port ${port}`);
            } catch (error) {
                console.warn(`Could not stop process ${pid}: ${error.message}`);
            }
        });
    } catch (error) {
        // No process is listening on this port.
    }
}

killPort(PORT);

const child = spawn('node', ['src/server.js'], {
    cwd: serverDir,
    env: {
        ...process.env,
        PORT: String(PORT),
    },
    shell: true,
    stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
