import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = () => {
  return (
    <div className="console-shell theme-mode-clinical">
      <div className="console-aurora console-aurora-left" />
      <div className="console-aurora console-aurora-right" />
      <div className="console-grid">
        <Sidebar />
        <main className="main-column">
          <Navbar />
          <div className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
