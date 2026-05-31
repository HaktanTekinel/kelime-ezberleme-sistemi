import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";

import AppLayout from "./components/AppLayout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute/PublicOnlyRoute";
import RootRoute from "./components/RootRoute/RootRoute";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";

import Home from "./pages/Home/Home";
import Quiz from "./pages/Quiz/Quiz";
import Words from "./pages/Words/Words";
import WordList from "./pages/WordList/WordList";
import Settings from "./pages/Settings/Settings";
import Reports from "./pages/Reports/Reports";
import WordChain from "./pages/WordChain/WordChain";
import Puzzle from "./pages/Puzzle/Puzzle";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<RootRoute />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />

            <Route path="/words" element={<WordList />} />
            <Route path="/word-list" element={<Navigate to="/words" replace />} />

            <Route path="/add-word" element={<Words />} />

            <Route path="/quiz" element={<Quiz />} />

            <Route path="/puzzle" element={<Puzzle />} />

            <Route path="/word-chain" element={<WordChain />} />

            <Route path="/reports" element={<Reports />} />

            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<Navigate to="/home" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;