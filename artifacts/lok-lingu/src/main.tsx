import { createRoot } from 'react-dom/client';

import App from './App';
import { initializeStorageMigration } from './lib/storage-migration';

import './index.css';

// Preserve player data across deployments
initializeStorageMigration();

createRoot(document.getElementById('root')!).render(<App />);
