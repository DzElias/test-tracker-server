import net from "net"
import Device from "./models/device.js"
import Bus from "./models/bus.js"
import Point from "./models/point.js"

const TCP_PORT = process.env.TCP_PORT || 9001

const server = net.createServer(async (socket) => {
  console.log(`Dispositivo conectado: ${socket.remoteAddress}:${socket.remotePort}`)

  socket.setTimeout(300000) // 5 minutos timeout

  socket.on("data", async (data) => {
    try {
      const rawData = data.toString().trim()
      console.log(`Datos recibidos: ${rawData}`)

      // Parsear diferentes tipos de mensajes TK103B
      const parsedData = parseTK103Message(rawData)

      if (!parsedData) {
        console.log("No se pudo parsear el mensaje")
        return
      }

      console.log("Mensaje parseado:", parsedData)

      // Manejar diferentes tipos de mensajes
      await handleTK103Message(parsedData, socket)
    } catch (error) {
      console.error("Error procesando datos:", error)
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

async function handleTK103Message(parsedData, socket) {
  try {
    // Validar IMEI
    if (!parsedData.imei || parsedData.imei.length < 15) {
      console.log(`IMEI inválido: ${parsedData.imei}`)
      return
    }

    // Buscar dispositivo
    const device = await Device.findOneAndUpdate({ imei: parsedData.imei }, { lastSeen: new Date() }, { new: true })

    if (!device) {
      console.log(`IMEI no registrado: ${parsedData.imei}`)
      socket.write("**,imei:" + parsedData.imei + ",A#") // Respuesta de registro
      return
    }

    // Manejar según tipo de mensaje
    switch (parsedData.type) {
      case "heartbeat":
        console.log(`Heartbeat recibido de IMEI: ${parsedData.imei}`)
        socket.write("ON#") // Respuesta estándar para heartbeat
        break

      case "gps_data":
        if (parsedData.lat && parsedData.lon && !isNaN(parsedData.lat) && !isNaN(parsedData.lon)) {
          // Actualizar ubicación del bus
          await Bus.findByIdAndUpdate(device.busId, {
            latitude: parsedData.lat,
            longitude: parsedData.lon,
            isActive: true,
            lastUpdate: new Date(),
          })

          // Guardar punto histórico
          const point = new Point({
            busId: device.busId,
            latitude: parsedData.lat,
            longitude: parsedData.lon,
            speed: parsedData.speed || 0,
            date: parsedData.timestamp || new Date(),
          })
          await point.save()

          console.log(`Ubicación actualizada para bus ${device.busId}: ${parsedData.lat}, ${parsedData.lon}`)
          socket.write("**,imei:" + parsedData.imei + ",A#") // Confirmación
        } else {
          console.log("Coordenadas GPS inválidas")
        }
        break

      case "login":
        console.log(`Login recibido de IMEI: ${parsedData.imei}`)
        socket.write("LOAD#") // Respuesta de login exitoso
        break

      default:
        console.log(`Tipo de mensaje no manejado: ${parsedData.type}`)
    }
  } catch (error) {
    console.error("Error manejando mensaje TK103:", error)
  }
}

function parseTK103Message(data) {
  try {
    if (!data.startsWith("*") || !data.endsWith("#")) {
      console.log("Formato de mensaje inválido - no tiene delimitadores correctos")
      return null
    }

    // Remover delimitadores
    const content = data.slice(1, -1) // Remover * y #
    const parts = content.split(",")

    console.log("Partes del mensaje:", parts)

    if (parts.length < 2) {
      console.log("Mensaje demasiado corto")
      return null
    }

    const messageType = parts[0]
    const imei = parts[1]

    // Diferentes tipos de mensajes TK103B
    switch (messageType) {
      case "HQ":
        // Heartbeat: *HQ,IMEI,V0# o *HQ,IMEI,V1,time,status,...#
        if (parts.length === 3 && parts[2].startsWith("V")) {
          return {
            type: "heartbeat",
            imei: imei,
            version: parts[2],
          }
        } else if (parts.length >= 11) {
          // Mensaje GPS completo
          return parseGPSData(parts)
        }
        break

      case "BP":
        // Mensaje de login: *BP,IMEI,HSO,time,A,lat,N/S,lon,E/W,speed,course,date,checksum#
        if (parts.length >= 11) {
          return parseGPSData(parts, "login")
        }
        break

      default:
        console.log(`Tipo de mensaje desconocido: ${messageType}`)
        return null
    }

    return null
  } catch (error) {
    console.error("Error parseando mensaje TK103:", error)
    return null
  }
}

function parseGPSData(parts, messageType = "gps_data") {
  try {
    // Formato típico: HQ,IMEI,V1,HHMMSS,A,DDMM.MMMM,N/S,DDDMM.MMMM,E/W,SPEED,COURSE,DDMMYY,...
    const imei = parts[1]
    const time = parts[3]
    const status = parts[4] // A = válido, V = inválido

    if (status !== "A") {
      console.log("GPS sin señal válida (status V)")
      return {
        type: messageType,
        imei: imei,
        status: "invalid",
      }
    }

    // Parsear coordenadas
    const latRaw = parts[5]
    const latHemisphere = parts[6]
    const lonRaw = parts[7]
    const lonHemisphere = parts[8]

    const lat = convertDMSToDecimal(latRaw, latHemisphere)
    const lon = convertDMSToDecimal(lonRaw, lonHemisphere)

    const speed = Number.parseFloat(parts[9]) || 0
    const course = Number.parseFloat(parts[10]) || 0
    const dateStr = parts[11]

    return {
      type: messageType,
      imei: imei,
      lat: lat,
      lon: lon,
      speed: speed,
      course: course,
      timestamp: parseGPSDate(dateStr, time),
      status: "valid",
    }
  } catch (error) {
    console.error("Error parseando datos GPS:", error)
    return null
  }
}

function convertDMSToDecimal(coordinate, hemisphere) {
  try {
    if (!coordinate || !hemisphere) {
      console.log("Coordenada o hemisferio faltante")
      return Number.NaN
    }

    console.log(`Convirtiendo coordenada: ${coordinate} ${hemisphere}`)

    // Determinar si es latitud (DDMM.MMMM) o longitud (DDDMM.MMMM)
    let degrees, minutes

    if (coordinate.length <= 9) {
      // Latitud: DDMM.MMMM
      degrees = Number.parseInt(coordinate.substring(0, 2))
      minutes = Number.parseFloat(coordinate.substring(2))
    } else {
      // Longitud: DDDMM.MMMM
      degrees = Number.parseInt(coordinate.substring(0, 3))
      minutes = Number.parseFloat(coordinate.substring(3))
    }

    if (isNaN(degrees) || isNaN(minutes)) {
      console.log("Error parseando grados o minutos")
      return Number.NaN
    }

    let decimal = degrees + minutes / 60

    // Aplicar hemisferio
    if (hemisphere === "S" || hemisphere === "W") {
      decimal = -decimal
    }

    console.log(`Resultado: ${decimal}`)
    return decimal
  } catch (error) {
    console.error("Error convirtiendo coordenadas:", error)
    return Number.NaN
  }
}

function parseGPSDate(dateStr, timeStr) {
  try {
    if (!dateStr || dateStr.length !== 6) {
      return new Date()
    }

    const day = Number.parseInt(dateStr.substring(0, 2))
    const month = Number.parseInt(dateStr.substring(2, 4)) - 1 // Mes base 0
    const year = 2000 + Number.parseInt(dateStr.substring(4, 6))

    let hour = 0,
      minute = 0,
      second = 0

    if (timeStr && timeStr.length >= 6) {
      hour = Number.parseInt(timeStr.substring(0, 2))
      minute = Number.parseInt(timeStr.substring(2, 4))
      second = Number.parseInt(timeStr.substring(4, 6))
    }

    return new Date(year, month, day, hour, minute, second)
  } catch (error) {
    console.error("Error parseando fecha GPS:", error)
    return new Date()
  }
}

server.listen(TCP_PORT, () => {
  console.log(`Servidor TCP escuchando en puerto ${TCP_PORT}`)
})

// Manejo de cierre graceful
process.on("SIGTERM", () => {
  console.log("Cerrando servidor TCP...")
  server.close(() => {
    console.log("Servidor TCP cerrado")
    process.exit(0)
  })
})

export default server
