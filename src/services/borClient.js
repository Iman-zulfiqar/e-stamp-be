import axios from 'axios';
import { getBorToken } from './borToken.js';

export const bor = axios.create({
  baseURL: process.env.BOR_BASE_URL,
  timeout: 15_000,
});

bor.interceptors.request.use(async (config) => {
  const token = await getBorToken();
  config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
  return config;
});
