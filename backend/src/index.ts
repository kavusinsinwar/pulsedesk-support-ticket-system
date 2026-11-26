import { createApp } from './app';
import { initializeEventSubscribers } from './events';

initializeEventSubscribers();
const app = createApp();

export default app;
