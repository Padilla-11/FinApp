import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="fo-layout">
      <Sidebar />
      <main className="fo-main">
        <Outlet />
      </main>
    </div>
  );
}
