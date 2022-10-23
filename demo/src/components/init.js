import React, {useState} from 'react';
import logo from '../../public/images/logo.jpg';

function Init() {
  const [state, updateState] = useState(0);
  return (
    <header
      className="App-header"
      onClick={() => updateState(state => state + 1)}>
      <img
        src={logo}
        className="App-logo"
        alt="logo"
        style={{width: '200px', height: 'auto'}}
      />
      <p>
        Edit <code>src/App.js</code> and save to reload.
      </p>
      <a
        className="App-link"
        href="https://reactjs.org"
        target="_blank"
        rel="noopener noreferrer">
        Learn React: {state}
      </a>
    </header>
  );
}

export default Init;
