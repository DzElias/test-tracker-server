// Utilidad para validar datos GPS
export function isValidCoordinate(lat, lon) {
  return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && lat !== 0 && lon !== 0
}

export function isValidIMEI(imei) {
  return imei && typeof imei === "string" && imei.length >= 15
}

export function sanitizeGPSData(data) {
  return {
    imei: data.imei?.toString().trim(),
    lat: Number.parseFloat(data.lat),
    lon: Number.parseFloat(data.lon),
    speed: Math.max(0, Number.parseFloat(data.speed) || 0),
    course: Math.max(0, Math.min(360, Number.parseFloat(data.course) || 0)),
    timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(),
  }
}
