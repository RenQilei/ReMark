import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/app.css'
import './styles/themes.css'
import './styles/document.css'
import './styles/settings.css'
import './styles/editor.css'

createRoot(document.getElementById('root')!).render(<App />)
