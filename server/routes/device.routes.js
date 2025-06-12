// routes/device.routes.js
import { Router } from 'express';
import * as deviceController from '../controllers/devices.controller.js';

const router = Router();
router.post('/', deviceController.registerDevice);
router.get('/', deviceController.getDevices);

export default router;