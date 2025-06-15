// Utilidades para el protocolo TK103B

export const TK103_MESSAGE_TYPES = {
  HEARTBEAT: "heartbeat",
  GPS_DATA: "gps_data",
  LOGIN: "login",
  ALARM: "alarm",
}

export const TK103_RESPONSES = {
  HEARTBEAT_ACK: "ON#",
  LOGIN_SUCCESS: "LOAD#",
  GPS_ACK: (imei) => `**,imei:${imei},A#`,
  REGISTER_REQUEST: (imei) => `**,imei:${imei},A#`,
}

export function isValidTK103Message(data) {
  return data && typeof data === "string" && data.startsWith("*") && data.endsWith("#") && data.length > 4
}

export function extractIMEI(data) {
  try {
    const parts = data.slice(1, -1).split(",")
    return parts.length >= 2 ? parts[1] : null
  } catch (error) {
    return null
  }
}

export function logTK103Message(rawData, parsedData) {
  console.log("=== TK103 Message Debug ===")
  console.log("Raw:", rawData)
  console.log("Parsed:", JSON.stringify(parsedData, null, 2))
  console.log("========================")
}
