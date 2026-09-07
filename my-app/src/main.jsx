import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import './index.css'

import { AuthProvider } from './components/auth/authContext'
import { ProfileModalProvider } from './components/profile/profilemodalcontext'

import Signup from './components/auth/signup';
import Login from './components/auth/login';
import ForgotPassword from './components/auth/forgotPassword';
import ResetPassword from './components/auth/resetPassword';

import Notification from './components/notification/notification';
// import UserFeedbackSubmissions from './components/profile/profile';
import NotFound from './components/NotFound';
import App from './App';

import Blog from './components/blog/blog';
import BlogPost from './components/blog/blogPost';
import BlogSeries from './components/blog/blogSeries';
// import AdminBlog from './components/blog/adminBlog';
// import BlogSubmit from './components/blog/blogsubmit';
import BlogCategoryArchive from './components/blog/blogcategoryarchive';

import Layout from './components/dashboard/layout';

import AdminSoundscapes from './components/sprint/Adminsoundscapes';
import SprintRoomPage from './components/sprint/sprintroompage';

import Settings from './components/profile/settings';
import ProfilePage from './components/profile/profilepage';

import FeedbackHub from './components/feedbackHub/feedbackhub';
// import SubmitFeedback from './components/feedbackHub/submitFeedback';
import FeedbackPage from './components/feedbackHub/feedbackPage';
import ArchivePage from './components/feedbackHub/archivePage';
import AdminReportsPage from './components/feedbackHub/adminreportspage';
import QueuePage from './components/feedbackHub/queuePage';
import MySubmissions from './components/feedbackHub/mysubmissions';

import DraftsPage from './components/drafts/draftspage';
// import WritePage from './components/drafts/writePage';

import DraftPlanPage from './components/draftPlan/draftPlanPage';
import DraftPlanListPage from './components/draftPlan/draftplanlistpage';
import DraftPlanTimeline from './components/draftPlan/draftPlantimeline';
import DraftPlanNewPage from './components/draftPlan/draftplannewpage';

import WorkspaceDashboard from './components/draftPlan/workspacedashboard';
import MailboxPage from './components/mailbox/mailboxpage';


import ThreadPage from './components/threads/threadpage';
import ThreadsFeedPage from './components/threads/threads';
import ThreadFormPage from './components/threads/threadformpage';
import AdminThreadsPage from './components/threads/adminthreadspage';

import InboxPage from './components/message/inboxpage';
import ConversationPage from './components/message/conversationpage';

import EventsPage from './components/event/eventspage';
import AdminEvents from './components/event/adminevents';

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}


const router = createBrowserRouter([
  {
    // Root wrapper route — not a URL segment, just a place to mount
    // ProfileModalProvider *inside* the router's own tree. It has to live
    // here (not around <RouterProvider> in the render call below) because
    // ProfileModal uses useNavigate(), which only works for components
    // actually rendered by the router.
    element: (
      <ProfileModalProvider>
        <Outlet />
      </ProfileModalProvider>
    ),
    children: [
      // ── Standalone (no sidebar) ── pages a person can hit before/without auth
      {
        path: "/signup",
        element: <Signup />
      },
      {
        path: "/login",
        element: <Login />
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />
      },
      {
        path: "/reset-password",
        element: <ResetPassword />
      },

      // ── Everything else shares the sidebar layout ──────────────────────────
      {
        path: "/",
        element: <Layout />,
        children: [
          {
            index: true,
            element: <App />
          },
          {
            path: "settings",
            element: <Settings />
          },
          {
            path: "notifications",
            element: <Notification />
          },
          {
            path: "community-update",
            element: <Blog />
          },
          {
            path: "blog/:postId",
            element: <BlogPost />
          },
          // {
          //   path: "admin/blog",
          //   element: <AdminBlog />
          // },
          {
            path: "blog/series/:slug",
            element: <BlogSeries />
          },
          // {
          //   path: "blog/submit",
          //   element: <BlogSubmit />
          // },
          {
            path: "/blog/category/:category",
            element: <BlogCategoryArchive />
          },
          {
            path: "admin/soundscapes",
            element: <AdminSoundscapes />
          },
          {
            path: "sprint-room",
            element: <SprintRoomPage />
          },
          {
            path: "threads",
            element: <ThreadsFeedPage />
          },
          {
            path: "threads/:threadId",
            element: <ThreadPage />
          },
          {
            path: "threads/submit",
            element: <ThreadFormPage />
          },
          {
            path: "threads/:threadId/edit",
            element: <ThreadFormPage />
          },
          {
            path: "admin/threads",
            element: <AdminThreadsPage />
          },
          {
            path: "critique",
            element: <FeedbackHub />
          },
          // {
          //   path: "critique/submit",
          //   element: <SubmitFeedback />
          // },
          // {
          //   path: "critique/:id/edit",
          //   element: <SubmitFeedback />
          // },
          {
            path: "critique/:id",
            element: <FeedbackPage />
          },
          {
            path: "critique/archive",
            element: <ArchivePage />
          },
          {
            path: "critique/queue",
            element: <QueuePage />
          },
          {
            path: "submissions",
            element: <MySubmissions />
          },
          {
            path: "admin/reports",
            element: <AdminReportsPage />
          },
          {
            path: "profile/:userId",
            element: <ProfilePage />
          },
          {
            path: "drafts",
            element: <DraftsPage />
          },
          // {
          //   path: "write",
          //   element: <WritePage />
          // },
          // {
          //   path: "write/:draftId",
          //   element: <WritePage />
          // },
          {
            // Multi-plan: /draftplan is now the plan-switcher list (see
            // draftPlanListPage.jsx). Individual plans live under /draftplan/:planId.
            path: "draftplan",
            element: <DraftPlanListPage />
          },
          {
            path: "draftplan/new",
            element: <DraftPlanNewPage />
          },
          {
            path: "draftplan/:planId",
            element: <DraftPlanPage />
          },
          {
            path: "draftplan/:planId/timeline",
            element: <DraftPlanTimeline />
          },
          {
            path: "workspace",
            element: <WorkspaceDashboard />
          },
          {
            path: "mailbox",
            element: <MailboxPage />
          },
          {
            path: "/admin/events",
            element: <AdminEvents />
          },
          {
            path: "/events",
            element: <EventsPage />
          },
          {
            path: "messages",
            element: <InboxPage />
          },
          {
            path: "messages/:conversationId",
            element: <ConversationPage />
          },
          {
            path: "*",
            element: <NotFound />
          }
        ]
      }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)