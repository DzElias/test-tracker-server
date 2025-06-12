// server.js
import net from 'net';
import Device from './models/device.js';
import Bus from './models/bus.js';
import Point from './models/point.js';

const TCP_PORT = process.env.TCP_PORT || 9001;

const server = net.createServer(async (socket) => {
  console.log(`Dispositivo conectado: ${socket.remoteAddress}`);
  
  socket.on('data', async (data) => {
    try {
      const rawData = data.toString().trim();
      console.log(`Datos recibidos: ${rawData}`);
      
      // Parsear datos según formato TK103B
      const parsedData = parseTK103Data(rawData);
      
      // Buscar el bus asociado a este IMEI
      const device = await Device.findOne({ imei: parsedData.imei });
      if (!device) {
        console.log(`IMEI no registrado: ${parsedData.imei}`);
        return;
      }

      // Actualizar ubicación del bus
      await Bus.findByIdAndUpdate(device.busId, {
        latitude: parsedData.lat,
        longitude: parsedData.lon,
        isActive: true
      });

      // Guardar punto histórico
      const point = new Point({
        busId: device.busId,
        latitude: parsedData.lat,
        longitude: parsedData.lon,
        date: new Date()
      });
      await point.save();

      console.log(`Ubicación actualizada para bus ${device.busId}`);
      
    } catch (error) {
      console.error('Error procesando datos:', error);
    }
  });
});

function parseTK103Data(data) {
  // Implementa según el formato exacto de tus mensajes
  // Ejemplo para formato: *HQ,IMEI,V1,lat,lon,speed,fecha,hora#
  const parts = data.split(',');
  return {
    imei: parts[1],
    lat: parseFloat(parts[3]),
    lon: parseFloat(parts[4]),
    speed: parseFloat(parts[5]),
    timestamp: `${parts[6]} ${parts[7]}`
  };
}

server.listen(TCP_PORT, () => {
  console.log(`Servidor TCP escuchando en puerto ${TCP_PORT}`);
});