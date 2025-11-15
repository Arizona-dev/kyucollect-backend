import { Request, Response } from "express";
import { InseeService } from "../../services/insee/insee.service";
import { logger } from "../../utils/logger";

export class InseeController {
  private inseeService: InseeService;

  constructor() {
    this.inseeService = new InseeService();
  }

  async lookupSiret(req: Request, res: Response): Promise<void> {
    try {
      const { siret } = req.query;

      if (!siret || typeof siret !== "string") {
        res.status(400).json({ message: "SIRET requis" });
        return;
      }

      const businessInfo = await this.inseeService.fetchSiretData(siret);

      res.json({
        message: "Données récupérées avec succès",
        data: businessInfo,
      });
    } catch (error) {
      logger.error("INSEE lookup error:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Erreur lors de la récupération des données",
      });
    }
  }
}
