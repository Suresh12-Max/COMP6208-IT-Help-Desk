import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ITDashboard from "./pages/ITDashboard";
import CreateTicket from "./pages/CreateTicket";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/employee-dashboard"
          element={<EmployeeDashboard />}
        />
        <Route
          path="/it-dashboard"
          element={<ITDashboard />}
        />
        <Route
          path="/create-ticket"
          element={<CreateTicket />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;