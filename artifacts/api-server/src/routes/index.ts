import { Router, type IRouter } from "express";
import healthRouter from "./health";
import benefitsRouter from "./benefits";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(benefitsRouter);
router.use(chatRouter);

export default router;
