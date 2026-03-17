import { config } from './config.js';

export function isAuthorized(msg) {
  return msg.from?.id === config.telegramUserId;
}
