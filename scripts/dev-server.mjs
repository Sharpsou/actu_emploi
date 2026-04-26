import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const runtimeDir = path.join(projectRoot, "data", "runtime");
const statePath = path.join(runtimeDir, "dev-server.json");
const port = Number(process.env.PORT || 3000);

function ensureRuntimeDir() {
  fs.mkdirSync(runtimeDir, { recursive: true });
}

function readState() {
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  ensureRuntimeDir();
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function removeState() {
  try {
    fs.unlinkSync(statePath);
  } catch {
    // Already gone.
  }
}

function isProcessAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function waitForPort(timeoutMs = 10_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function probe() {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Le port ${port} ne repond pas apres ${timeoutMs} ms.`));
          return;
        }
        setTimeout(probe, 250);
      });
    }

    probe();
  });
}

async function status() {
  const state = readState();
  const portOpen = await isPortOpen();

  if (state?.pid && isProcessAlive(state.pid)) {
    console.log(`Serveur Next suivi: PID ${state.pid}, URL ${state.url}`);
    return;
  }

  if (portOpen) {
    console.log(`Port ${port} occupe par un processus non suivi.`);
    console.log(`Pour l'identifier: netstat -ano | findstr :${port}`);
    return;
  }

  console.log(`Aucun serveur detecte sur le port ${port}.`);
}

async function start() {
  const existingState = readState();
  if (existingState?.pid && isProcessAlive(existingState.pid)) {
    console.log(`Serveur deja lance: PID ${existingState.pid}, URL ${existingState.url}`);
    return;
  }

  if (await isPortOpen()) {
    console.error(`Impossible de lancer Next: le port ${port} est deja occupe.`);
    console.error(`Lance npm run dev:status pour verifier, puis libere le processus existant.`);
    process.exit(1);
  }

  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port)], {
    cwd: projectRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();

  const state = {
    pid: child.pid,
    port,
    url: `http://localhost:${port}`,
    command: `${process.execPath} ${nextBin} dev -p ${port}`,
    startedAt: new Date().toISOString()
  };
  writeState(state);

  await waitForPort().catch((error) => {
    removeState();
    throw error;
  });

  console.log(`Serveur Next lance: PID ${child.pid}, URL ${state.url}`);
}

function stop() {
  const state = readState();
  const pid = state?.pid && isProcessAlive(state.pid) ? state.pid : null;

  if (!pid || !isProcessAlive(pid)) {
    removeState();
    console.log("Aucun serveur suivi a arreter. Si le port reste occupe, utilise: netstat -ano | findstr :3000");
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      cwd: projectRoot,
      stdio: "ignore",
      windowsHide: true
    });
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      process.kill(pid, "SIGTERM");
    }
  }

  removeState();
  console.log(`Serveur Next arrete: PID ${pid}`);
}

const command = process.argv[2] || "status";

if (command === "start") {
  await start();
} else if (command === "stop") {
  stop();
} else if (command === "status") {
  await status();
} else {
  console.error(`Commande inconnue: ${command}`);
  process.exit(1);
}
