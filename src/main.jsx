import React from 'react'
import ReactDOM from 'react-dom/client'
import { AptosWalletProvider } from '@razorlabs/wallet-kit'
import '@razorlabs/wallet-kit/style.css'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AptosWalletProvider>
      <App />
    </AptosWalletProvider>
  </React.StrictMode>,
)