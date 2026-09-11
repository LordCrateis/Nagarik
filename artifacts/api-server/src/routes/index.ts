import { Router, type IRouter } from "express";
import healthRouter from "./health";
import benefitsRouter from "./benefits";

const router: IRouter = Router();

router.use(healthRouter);
router.use(benefitsRouter);

export default router;
