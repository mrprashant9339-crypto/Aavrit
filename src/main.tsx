import { createRoot } from 'react-dom/client';
import App from './App';
import PublicPortfolio from './PublicPortfolio';
import './styles.css';

createRoot(document.getElementById('root')!).render(window.location.pathname.startsWith('/portfolio/') ? <PublicPortfolio /> : <App />);
