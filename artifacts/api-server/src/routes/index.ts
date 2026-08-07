import { Router, type IRouter } from 'express';
import healthRouter from './health';
import usersRouter from './users';
import scoresRouter from './scores';
import leaderboardRouter from './leaderboard';
import wordsRouter from './words';
import statsRouter from './stats';
import drawRouter from './draw';
import playerStateRouter from './player-state';

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(scoresRouter);
router.use(leaderboardRouter);
router.use(wordsRouter);
router.use(statsRouter);
router.use(drawRouter);
router.use(playerStateRouter);

export default router;
