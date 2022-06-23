import React, {useState} from 'react';

function App() {
	const [state, updateState] = useState(0);
	const a = <div key='a'>shu sheng---a</div>;
	const b = <div key='b'>shu sheng---b</div>;
	// const len = 3000;
	return (
		<div className='App' onClick={() => updateState((state) => state + 1)}>
			{/* <ul>
				{Array(len)
					.fill(0)
					.map((_, i) => (
						<li key={i}>{i}</li>
					))}
			</ul> */}
			{state % 2 ? a : b}
			{/* <header className="App-header" onClick={() => updateState((state) => state + 1)}>
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React: {state}
        </a>
      </header> */}
		</div>
	);
}

export default App;
