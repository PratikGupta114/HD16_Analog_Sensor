import React from 'react';
import './App.css';
import SensorDisplay from './SensorDisplay';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Sensor Data Visualizer</h1>
      </header>
      <main>
        <SensorDisplay />
      </main>
    </div>
  );
}

export default App;
