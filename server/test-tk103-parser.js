// Script de prueba para el parser TK103
import { parseTK103Message } from "./server.js"

const testMessages = [
  "*HQ,867232051081496,V0#", // Heartbeat
  "*HQ,867232051081496,V1,210543,A,2530.4192,S,05439.8740,W,000.00,342,150625,FFFFFBFF#", // GPS completo
  "*BP,867232051081496,HSO,210543,A,2530.4192,S,05439.8740,W,000.00,342,150625#", // Login
  "*HQ,867232051081496,V1,210543,V,0000.0000,N,00000.0000,E,000.00,000,150625,FFFFFBFF#", // GPS sin señal
]

console.log("=== Pruebas del Parser TK103 ===\n")

testMessages.forEach((message, index) => {
  console.log(`Prueba ${index + 1}:`)
  console.log(`Mensaje: ${message}`)

  const result = parseTK103Message(message)
  console.log("Resultado:", JSON.stringify(result, null, 2))
  console.log("---\n")
})
