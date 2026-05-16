import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import stockRouter from "./stock";
import entriesRouter from "./entries";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import creditsRouter from "./credits";
import analyticsRouter from "./analytics";
import issuesRouter from "./issues";
import settingsRouter from "./settings";
import suppliersRouter from "./suppliers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(stockRouter);
router.use(entriesRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(creditsRouter);
router.use(analyticsRouter);
router.use(issuesRouter);
router.use(settingsRouter);
router.use(suppliersRouter);

export default router;
