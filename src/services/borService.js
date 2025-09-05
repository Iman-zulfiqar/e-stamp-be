import { bor } from './borClient.js';

export async function fetchInstruments() {
  const { data } = await bor.get('/instruments');   // path from spec
  return data;
}
export async function calcDuty(payload) {
  const { data } = await bor.post('/duty/calc', payload);
  return data;
}
export async function issueStamp(payload) {
  const { data } = await bor.post('/stamp/issue', payload);
  // data should contain the official eStamp ID
  return data;
}
export async function verifyStamp(id) {
  const { data } = await bor.get(`/stamp/verify/${encodeURIComponent(id)}`);
  return data;
}
