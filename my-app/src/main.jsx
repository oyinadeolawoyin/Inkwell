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
import ActiveSprint from './components/sprint/workspace';
import StartSprint from './components/sprint/startSprint';
import Notification from './components/notification/notification';
import Profile from './components/profile/profile';
// import EditProfile from './components/profile/editProfile';
import App from './App'

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />
  },
  {
    path: "/signup",
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
  },
  {
    path: "/profile/:userId",
    element: <Profile />,
    // children: [
     
    // ]
  },
  // {
  //   path: "/profile/edit",
  //   element: <EditProfile />
  // },
  {
    path: "/sprint/:sprintId",
    element: <ActiveSprint />,
  },
  {
    path: "/start-sprint",
    element: <StartSprint />
  },
  {
    path: "/notifications",
    element: <Notification />
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
