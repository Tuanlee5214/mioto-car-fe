import { useState } from 'react'
import LoginPage from './pages/LoginPage/LoginPage'
import SignUpPage from './pages/SignUpPage/SignUpPage'

function App() {
  const [currentPage, setCurrentPage] = useState('login')

  return currentPage === 'login' ? (
    <LoginPage onNavigateToSignUp={() => setCurrentPage('signup')} />
  ) : (
    <SignUpPage onNavigateToLogin={() => setCurrentPage('login')} />
  )
}

export default App
