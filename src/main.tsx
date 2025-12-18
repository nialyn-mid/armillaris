import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DataProvider } from './context/DataContext'
import { ValidationProvider } from './context/ValidationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <ValidationProvider>
        <App />
      </ValidationProvider>
    </DataProvider>
  </StrictMode>,
)
