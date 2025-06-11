const net = require('net');
const https = require('https');
const moment = require('moment');

// Configuración
const TCP_PORT = process.env.TCP_PORT || 9001;

// Obtener IP pública al iniciar (usando un servicio externo)
https.get('https://api.ipify.org?format=json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const publicIp = JSON.parse(data).ip;
    console.log(`✅ Configura tu TK103B con estos datos:`);
    console.log(`IP PÚBLICA: ${publicIp}`);
    console.log(`PUERTO TCP: ${TCP_PORT}`);
    console.log('\nComandos SMS para enviar al tracker:');
    console.log(`APN123456 internet.tigo.com.py`);
    console.log(`adminip123456 ${publicIp} ${TCP_PORT}`);
    console.log(`GPRS123456`);
  });
}).on('error', (err) => {
  console.log('⚠️ No se pudo obtener la IP pública. Usa la IP del servidor manualmente.');
});

// Servidor TCP (igual que antes)
const server = net.createServer((socket) => {
  console.log(`Dispositivo conectado: ${socket.remoteAddress}`);
  
  socket.on('data', (data) => {
    const rawData = data.toString().trim();
    console.log(`📌 Datos recibidos: ${rawData}`);
    // Aquí puedes parsear y guardar los datos...
  });
});

server.listen(TCP_PORT, () => {
  console.log(`Servidor escuchando en puerto ${TCP_PORT} (local)`);
});