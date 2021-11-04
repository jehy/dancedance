import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type { Input } from './input';

export function getAxiosInstance(args: Input): AxiosInstance {
  const url = args.customServer || (args.server === 'jehy' ? 'http://step.jehy.ru:8888/' : 'http://localhost:8888/');
  return axios.create({
    baseURL: url,
    timeout: 16 * 60 * 1000, // 16 minutes
    headers: { Authorization: args.token },
    maxContentLength: 1024 * 1024 * 30,
    maxBodyLength: 1024 * 1024 * 30,
    responseType: 'stream',
  });
}
