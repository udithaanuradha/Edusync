import { Routes, Route } from 'react-router-dom';
import Overview from './pages/overview';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="*" element={<Overview />} />
    </Routes>
  );
}

export default App
