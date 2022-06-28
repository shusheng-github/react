import React from 'react';

function App() {
	return (
		<div className='App'>
			<header className="App-header" onClick={() => updateState((state) => state + 1)}>
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
      </header>
		</div>
	);
}

export default App;
