import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App.tsx';
import Register from './pages/Register.tsx';
import Login from './pages/Login.tsx';
import Settings from './pages/Settings.tsx';
import Home from './pages/Home.tsx';
import Dreams from './pages/Dreams.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dreams" element={<Dreams />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
