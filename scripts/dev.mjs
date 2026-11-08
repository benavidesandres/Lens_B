// Arranca todo lo necesario para probar LENS en el teléfono con un solo comando:
// el servidor de la API y Metro, que es quien muestra el código QR para Expo Go.
import { spawn } from 'node:child_process';
import net from 'node:net';

const API_PORT = 8787;

const isPortInUse = (port) =>
  new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

const run = (script) => spawn(`npm run ${script}`, { stdio: 'inherit', shell: true });

const children = [];

if (await isPortInUse(API_PORT)) {
  console.log(`El servidor ya está activo en el puerto ${API_PORT}; se reutiliza.`);
} else {
  children.push(run('dev:server'));
}

const metro = run('dev:mobile');
children.push(metro);

const stopAll = () => {
  for (const child of children) child.kill();
};

metro.once('exit', (code) => {
  stopAll();
  process.exit(code ?? 0);
});
process.once('SIGINT', stopAll);
process.once('SIGTERM', stopAll);
