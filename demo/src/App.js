import React, {useState} from 'react';
import Init from './components/init';

function App() {
  const [state, updateState] = useState(0);
  const handleClick = () => {
    updateCount(state => state + 1);
  };
  return (
    <div className="App" onClick={handleClick}>
      <div>state: {state}</div>
      <Init></Init>
    </div>
  );
}

export default App;
