import { Navigate, Outlet } from "react-router-dom";
import { getAuthToken } from "../../services/apiClient";

function PublicOnlyRoute() {
  const token = getAuthToken();

  if (token) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;