import { Schema, model } from "mongoose"

const deviceSchema = new Schema(
  {
    imei: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
  },
  {
    timestamps: true,
  },
)

export default model("Device", deviceSchema)
