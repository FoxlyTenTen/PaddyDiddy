import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import IndexDetails from "@/pages/IndexDetails";
import MonitoringHistory from "@/pages/MonitoringHistory";
import MapDraw from "@/pages/MapDraw";
import Optimize from "@/pages/Optimize";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<MapDraw />} />
        <Route path="/index/:indexKey" element={<IndexDetails />} />
        <Route path="/history" element={<MonitoringHistory />} />
        <Route path="/optimize" element={<Optimize />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
