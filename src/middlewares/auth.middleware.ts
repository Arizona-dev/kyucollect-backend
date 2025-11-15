import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/database";
import { User } from "../entities/auth/User";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized - No token provided" });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const secret = process.env.JWT_SECRET || "default-secret-key";
    const payload = jwt.verify(token, secret) as { userId: string; email: string; role: string };

    // Get user from database
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: payload.userId, isActive: true },
    });

    if (!user) {
      res.status(401).json({ message: "Unauthorized - Invalid token" });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Unauthorized - Invalid token" });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Unauthorized - Token expired" });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
