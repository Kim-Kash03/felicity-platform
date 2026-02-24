import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Participant pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetail from './pages/participant/EventDetail';
import RegisterEvent from './pages/participant/RegisterEvent';
import ParticipantProfile from './pages/participant/Profile';
import Clubs from './pages/participant/Clubs';
import OrganizerDetail from './pages/participant/OrganizerDetail';
import TeamChatRoom from './pages/participant/TeamChatRoom';
import DirectChat from './pages/participant/DirectChat';

// Organizer pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import OrganizerProfile from './pages/organizer/Profile';
import OrganizerAnnouncements from './pages/organizer/Announcements';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageClubs from './pages/admin/ManageClubs';
import PasswordResets from './pages/admin/PasswordResets';

const Layout = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
  </>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            },
            success: { iconTheme: { primary: 'var(--color-success)', secondary: '#fff' } },
            error: { iconTheme: { primary: 'var(--color-danger)', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={
            <ProtectedRoute roles={['participant']}>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Participant routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['participant']}>
              <Layout><ParticipantDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/events" element={
            <Layout><BrowseEvents /></Layout>
          } />
          <Route path="/events/:id" element={
            <Layout><EventDetail /></Layout>
          } />
          <Route path="/events/:id/register" element={
            <ProtectedRoute roles={['participant']}>
              <Layout><RegisterEvent /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute roles={['participant']}>
              <Layout><ParticipantProfile /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clubs" element={
            <Layout><Clubs /></Layout>
          } />
          <Route path="/clubs/:id" element={
            <Layout><OrganizerDetail /></Layout>
          } />
          <Route path="/team/:id/chat" element={
            <ProtectedRoute roles={['participant']}>
              <Layout><TeamChatRoom /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/chat/:userId" element={
            <ProtectedRoute roles={['participant']}>
              <Layout><DirectChat /></Layout>
            </ProtectedRoute>
          } />

          {/* Organizer routes */}
          <Route path="/organizer/dashboard" element={
            <ProtectedRoute roles={['organizer']}>
              <Layout><OrganizerDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/organizer/create" element={
            <ProtectedRoute roles={['organizer']}>
              <Layout><CreateEvent /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/organizer/events/:id" element={
            <ProtectedRoute roles={['organizer']}>
              <Layout><OrganizerEventDetail /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/organizer/announcements" element={
            <ProtectedRoute roles={['organizer']}>
              <Layout><OrganizerAnnouncements /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/organizer/profile" element={
            <ProtectedRoute roles={['organizer']}>
              <Layout><OrganizerProfile /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/organizers" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><ManageClubs /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/resets" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><PasswordResets /></Layout>
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
