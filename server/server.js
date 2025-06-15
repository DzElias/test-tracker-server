import net from "net"
import Device from "./models/device.js"
import Bus from "./models/bus.js"
import Point from "./models/point.js"
import { isValidCoordinate, isValidIMEI, sanitizeGPSData } from "./utils/gps-validator.js"

const TCP_PORT = process.env.TCP_PORT || 9001

const server = net.createServer(async (socket) => {
  console.log(`Dispositivo conectado: ${socket.remoteAddress}:${socket.remotePort}`)

  // Configurar timeout para la conexión
  socket.setTimeout(300000) // 5 minutos

  socket.on("data", async (data) => {
    try {
      const rawData = data.toString().trim()
      console.log(`Datos recibidos: ${rawData}`)

      // Parsear datos según formato TK103B
      const parsedData = parseTK103Data(rawData)

      if (!parsedData) {
        console.log("No se pudieron parsear los datos")
        return
      }

      // Sanitizar y validar datos
      const sanitizedData = sanitizeGPSData(parsedData)

      if (!isValidIMEI(sanitizedData.imei)) {
        console.log(`IMEI inválido: ${sanitizedData.imei}`)
        return
      }

      if (!isValidCoordinate(sanitizedData.lat, sanitizedData.lon)) {
        console.log(`Coordenadas inválidas: ${sanitizedData.lat}, ${sanitizedData.lon}`)
        return
      }

      // Buscar el dispositivo asociado a este IMEI
      const device = await Device.findOneAndUpdate(
        { imei: sanitizedData.imei },
        { lastSeen: new Date() },
        { new: true },
      )

      if (!device) {
        console.log(`IMEI no registrado: ${sanitizedData.imei}`)
        // Opcional: registrar automáticamente dispositivos nuevos
        // await registerNewDevice(sanitizedData.imei);
        return
      }

      // Actualizar ubicación del bus
      const updatedBus = await Bus.findByIdAndUpdate(
        device.busId,
        {
          latitude: sanitizedData.lat,
          longitude: sanitizedData.lon,
          isActive: true,
          lastUpdate: new Date(),
        },
        { new: true },
      )

      if (!updatedBus) {
        console.log(`Bus no encontrado para dispositivo: ${device.busId}`)
        return
      }

      // Guardar punto histórico (opcional: agregar throttling para evitar demasiados puntos)
      if (shouldSavePoint(device.busId, sanitizedData)) {
        const point = new Point({
          busId: device.busId,
          latitude: sanitizedData.lat,
          longitude: sanitizedData.lon,
          speed: sanitizedData.speed,
          course: sanitizedData.course,
          date: sanitizedData.timestamp,
        })
        await point.save()
      }

      console.log(`Ubicación actualizada para bus ${device.busId}: ${sanitizedData.lat}, ${sanitizedData.lon}`)

      // Enviar confirmación al dispositivo (opcional)
      socket.write("OK\n")
    } catch (error) {
      console.error("Error procesando datos:", error)
      socket.write("ERROR\n")
    }
  })

  socket.on("timeout", () => {
    console.log(`Timeout en conexión: ${socket.remoteAddress}`)
    socket.end()
  })

  socket.on("close", () => {
    console.log(`Dispositivo desconectado: ${socket.remoteAddress}`)
  })

  socket.on("error", (error) => {
    console.error(`Error en conexión: ${error.message}`)
  })
})

// Cache para evitar guardar demasiados puntos
const lastPointCache = new Map()

function shouldSavePoint(busId, data) {
  const key = busId.toString()
  const lastPoint = lastPointCache.get(key)

  if (!lastPoint) {
    lastPointCache.set(key, { lat: data.lat, lon: data.lon, time: Date.now() })
    return true
  }

  const timeDiff = Date.now() - lastPoint.time
  const distance = calculateDistance(lastPoint.lat, lastPoint.lon, data.lat, data.lon)

  // Guardar si han pasado más de 30 segundos o se ha movido más de 10 metros
  if (timeDiff > 30000 || distance > 0.01) {
    lastPointCache.set(key, { lat: data.lat, lon: data.lon, time: Date.now() })
    return true
  }

  return false
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function parseTK103Data(data) {
  try {
    // Formato TK103B: *HQ,IMEI,V1,HHMMSS,A,DDMM.MMMM,N/S,DDDMM.MMMM,E/W,SPEED,COURSE,DDMMYY,CHECKSUM#
    if (!data.startsWith("*HQ,") || !data.endsWith("#")) {
      console.log("Formato de mensaje no válido")
      return null
    }

    const parts = data.slice(3, -1).split(",") // Remover *HQ, y #

    if (parts.length < 11) {
      console.log("Mensaje incompleto")
      return null
    }

    const imei = parts[0]
    const status = parts[3] // A = válido, V = inválido

    if (status !== "A") {
      console.log("GPS sin señal válida")
      return null
    }

    // Parsear coordenadas
    const latRaw = parts[4] // DDMM.MMMM
    const latHemisphere = parts[5] // N/S
    const lonRaw = parts[6] // DDDMM.MMMM
    const lonHemisphere = parts[7] // E/W

    // Convertir de formato DDMM.MMMM a decimal
    const lat = convertToDecimal(latRaw, latHemisphere)
    const lon = convertToDecimal(lonRaw, lonHemisphere)

    const speed = Number.parseFloat(parts[8]) || 0
    const course = Number.parseFloat(parts[9]) || 0
    const dateStr = parts[10] // DDMMYY

    return {
      imei: imei,
      lat: lat,
      lon: lon,
      speed: speed,
      course: course,
      timestamp: parseDate(dateStr),
      status: status,
    }
  } catch (error) {
    console.error("Error parseando datos TK103:", error)
    return null
  }
}

function convertToDecimal(coordinate, hemisphere) {
  try {
    if (!coordinate || coordinate.length < 4) {
      return Number.NaN
    }

    let degrees, minutes

    if (coordinate.length <= 9) {
      // Latitud DDMM.MMMM
      degrees = Number.parseInt(coordinate.substring(0, 2))
      minutes = Number.parseFloat(coordinate.substring(2))
    } else {
      // Longitud DDDMM.MMMM
      degrees = Number.parseInt(coordinate.substring(0, 3))
      minutes = Number.parseFloat(coordinate.substring(3))
    }

    let decimal = degrees + minutes / 60

    // Aplicar hemisferio
    if (hemisphere === "S" || hemisphere === "W") {
      decimal = -decimal
    }

    return decimal
  } catch (error) {
    console.error("Error convirtiendo coordenadas:", error)
    return Number.NaN
  }
}

function parseDate(dateStr) {
  try {
    if (!dateStr || dateStr.length !== 6) {
      return new Date()
    }

    const day = Number.parseInt(dateStr.substring(0, 2))
    const month = Number.parseInt(dateStr.substring(2, 4)) - 1 // Mes base 0
    const year = 2000 + Number.parseInt(dateStr.substring(4, 6))

    return new Date(year, month, day)
  } catch (error) {
    console.error("Error parseando fecha:", error)
    return new Date()
  }
}

server.listen(TCP_PORT, () => {
  console.log(`Servidor TCP escuchando en puerto ${TCP_PORT}`)
})

export default server
