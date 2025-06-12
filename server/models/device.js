// models/device.js
import { Schema, model } from "mongoose";

const deviceSchema = Schema({
  imei: { type: String, required: true, unique: true },
  busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default model("Device", deviceSchema);