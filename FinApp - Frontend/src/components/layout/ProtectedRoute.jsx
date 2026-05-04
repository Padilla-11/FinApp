import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function ProtectedRoute() {
  const { isAuth } = useApp();
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
