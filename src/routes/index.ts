import { Router } from 'express';
import authRouter from './auth';
import propertiesRouter from './properties';
import landsRouter from './lands';
import inquiriesRouter from './inquiries';
import saleRequestsRouter from './saleRequests';

const router = Router();

router.use('/auth', authRouter);
router.use('/properties', propertiesRouter);
router.use('/lands', landsRouter);
router.use('/inquiries', inquiriesRouter);
router.use('/sale-requests', saleRequestsRouter);

export default router;
