import { createRoot } from 'react-dom/client';

import App from './App';
import { initializeStorageMigration } from './lib/storage-migration';
import { startLokPlaytime } from './lib/lok/lokPlaytime';

import './index.css';

// Preserve player data across deployments
initializeStorageMigration();
startLokPlaytime();

createRoot(document.getElementById('root')!).render(<App />);
