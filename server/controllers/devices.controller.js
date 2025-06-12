// controllers/devices.controller.js
import Device from '../models/device.js';
import Bus from '../models/bus.js';

export const registerDevice = async (req, res) => {
  try {
    const { imei, busId } = req.body;
    
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus no encontrado' });
    }

    const device = new Device({ imei, busId });
    await device.save();
    
    res.status(201).json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDevices = async (req, res) => {
  try {
    const devices = await Device.find().populate('busId');
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};