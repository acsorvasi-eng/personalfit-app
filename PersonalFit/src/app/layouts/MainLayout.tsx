import { Outlet } from 'react-router';

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pb-20">
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
