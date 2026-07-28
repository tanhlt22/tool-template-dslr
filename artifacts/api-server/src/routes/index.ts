import { Router, type IRouter } from "express";
import healthRouter from "./health";
import framesRouter from "./frames";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(framesRouter);
router.use(authRouter);

export default router;
