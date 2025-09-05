import { Router } from 'express';
import { fetchInstruments, calcDuty, issueStamp, verifyStamp } from '../services/borService.js';

const r = Router();

r.get('/instruments', async (_req, res, next) => {
  try { res.json(await fetchInstruments()); } catch (e) { next(e); }
});

r.post('/duty-calc', async (req, res, next) => {
  try { res.json(await calcDuty(req.body)); } catch (e) { next(e); }
});

r.post('/issue', async (req, res, next) => {
  try { res.json(await issueStamp(req.body)); } catch (e) { next(e); }
});

r.get('/verify/:id', async (req, res, next) => {
  try { res.json(await verifyStamp(req.params.id)); } catch (e) { next(e); }
});

export default r;
