import { Schema, model } from "mongoose"

const deviceSchema = new Schema(
  {
    imei: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 15,
      maxlength: 17,
    },
    busId: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    connectionStatus: {
      type: String,
      enum: ["connected", "disconnected", "unknown"],
      default: "unknown",
    },
    deviceInfo: {
      model: String,
      firmware: String,
      lastIP: String,
    },
  },
  {
    timestamps: true,
  },
)

// Índice para búsquedas rápidas por IMEI
deviceSchema.index({ imei: 1 })

// Método para verificar si el dispositivo está online
deviceSchema.methods.isOnline = function () {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  return this.lastHeartbeat > fiveMinutesAgo
}

export default model("Device", deviceSchema)
