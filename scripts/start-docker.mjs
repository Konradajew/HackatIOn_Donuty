import { networkInterfaces, homedir } from 'os';
import { spawn } from 'child_process';

const tunnelMode = process.argv.includes('--tunnel');

function detectLanIp() {
  if (process.env.HOST_IP) {
    console.log(`[start-docker] Using HOST_IP override: ${process.env.HOST_IP}`);
    return process.env.HOST_IP;
  }

  const nets = networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const ip = addr.address;
      if (ip.startsWith('169.254.')) continue;
      const octets = ip.split('.');
      const second = parseInt(octets[1], 10);
      if (ip.startsWith('172.') && second >= 16 && second <= 31) continue;
      candidates.push({ name, ip });
    }
  }

  if (candidates.length === 0) {
    console.error('[start-docker] Nie znaleziono pasującego interfejsu sieciowego.');
    console.error('[start-docker] Ustaw HOST_IP=<twoje_ip> i uruchom ponownie.');
    process.exit(1);
  }

  if (candidates.length > 1) {
    console.log('[start-docker] Znalezione interfejsy:');
    for (const c of candidates) console.log(`  ${c.name}: ${c.ip}`);
  }

  const preferred =
    candidates.find(c => c.ip.startsWith('192.168.')) ||
    candidates.find(c => c.ip.startsWith('10.')) ||
    candidates[0];

  console.log(`[start-docker] Using REACT_NATIVE_PACKAGER_HOSTNAME=${preferred.ip} (${preferred.name})`);
  console.log('[start-docker] Tip: ustaw HOST_IP=<ip> aby nadpisać auto-detekcję.\n');
  return preferred.ip;
}

const ip = tunnelMode ? '' : detectLanIp();

if (tunnelMode) {
  console.log('[start-docker] Tunnel mode — pomijam LAN IP detection.');
  console.log('[start-docker] Upewnij się, że jesteś zalogowany w Expo: npx expo login\n');
}

const child = spawn('docker', ['compose', 'up', '--build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: ip,
    EXPO_START_FLAGS: tunnelMode ? '--tunnel' : '--lan',
    EXPO_HOME_DIR: homedir(),
  },
});

const forward = (sig) => child.kill(sig);
process.on('SIGINT', forward);
process.on('SIGTERM', forward);

child.on('exit', (code) => process.exit(code ?? 0));
