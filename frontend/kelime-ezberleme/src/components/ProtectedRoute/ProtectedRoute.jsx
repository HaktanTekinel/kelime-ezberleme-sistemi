import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAuthToken } from "../../services/apiClient";

function ProtectedRoute() {
  const location = useLocation();
  const token = getAuthToken();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;