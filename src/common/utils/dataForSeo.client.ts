import axios from 'axios';

import { env } from './envConfig';

const auth = Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString('base64');

export const dataForSeoClient = axios.create({
  baseURL: 'https://api.dataforseo.com/v3',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});
