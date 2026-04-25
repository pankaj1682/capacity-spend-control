import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import functionsRouter from "./functions";
import fxRatesRouter from "./fxRates";
import importsRouter from "./imports";
import projectsRouter from "./projects";
import resourcesRouter from "./resources";
import demandsRouter from "./demands";
import allocationsRouter from "./allocations";
import budgetsRouter from "./budgets";
import actualsRouter from "./actuals";
import dashboardRouter from "./dashboard";
import auditLogsRouter from "./auditLogs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(functionsRouter);
router.use(fxRatesRouter);
router.use(importsRouter);
router.use(projectsRouter);
router.use(resourcesRouter);
router.use(demandsRouter);
router.use(allocationsRouter);
router.use(budgetsRouter);
router.use(actualsRouter);
router.use(dashboardRouter);
router.use(auditLogsRouter);

export default router;
