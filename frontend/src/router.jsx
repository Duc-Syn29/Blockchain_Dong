import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/routes/ProtectedRoute";
import { GuestRoute } from "./components/routes/GuestRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { CheckInPage } from "./pages/CheckInPage";
import { OrganizerPage } from "./pages/OrganizerPage";
import { OrganizerEventEditPage } from "./pages/OrganizerEventEditPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={<EventDetailPage />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute>
              <MyTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/check-in"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <CheckInPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer"
          element={
            <ProtectedRoute>
              <OrganizerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:eventId/edit"
          element={
            <ProtectedRoute>
              <OrganizerEventEditPage />
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
