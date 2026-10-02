import './styles/tokens.css';
import './styles/main.css';
import './styles/components.css';
import './styles/auth.css';

import { AppRouter } from './router.ts';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Pure TypeScript Single Page App in root #app
  new AppRouter('app');
});
