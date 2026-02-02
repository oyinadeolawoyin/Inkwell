import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'

import { AuthProvider } from './components/auth/authContext'

import Signup from './components/auth/signup';
import Login from './components/auth/login';
import Welcome from './components/auth/welcome';
import SetupPlan from './components/writingPlan/setupPlan';
import Dashboard from './components/dashboard/dashboard';
// import App from './App'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Signup />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/welcome",
    element: <Welcome />
  },
  {
    path: "/setup-plan",
    element: <SetupPlan />
  },
  {
    path: "/dashboard",
    element: <Dashboard />
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
