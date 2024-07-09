// src/components/Home/Home.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-component">
      <h1>Welcome to the Home Page</h1>
      <div className="buttons">
        <button onClick={() => navigate('/chimviz')}>Go to ChimViz Plot</button>
        <button onClick={() => navigate('/splicemap')}>Go to SpliceMap Plot</button>
      </div>
    </div>
  );
};

export default Home;
