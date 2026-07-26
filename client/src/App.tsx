// Root component: page layout (nav bar) and client-side route definitions.
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import TaskListPage from "./pages/TaskListPage.tsx";
import TaskCreatePage from "./pages/TaskCreatePage.tsx";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link to="/tasks" className="text-xl font-bold text-gray-900">
                Task Assignment
              </Link>
              <Link
                to="/tasks/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Task
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
