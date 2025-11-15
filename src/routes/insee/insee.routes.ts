import { Router } from "express";
import { InseeController } from "../../controllers/insee/insee.controller";

const router = Router();
const inseeController = new InseeController();

// GET /api/insee/siret?siret=12345678901234
router.get("/siret", inseeController.lookupSiret.bind(inseeController));

export default router;
