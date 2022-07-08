import React, {useState, useEffect, useLayoutEffect, useTransition} from 'react';
import SyntheticEvent from './SyntheticEvent'

function App() {
	const [state, updateState] = useState(0);
	const [count, updateCount] = useState(1);
  // const [isPending, startTransition] = useTransition();
  const handleClick = () => {
    updateState((state) => state + 1)
  }
  useEffect(() => {
    // updateCount(3000);
    // startTransition(() => {
    //   updateCount(3000);
    // })
  }, [])
	return (
		<div className='App' onClick={handleClick}>
      <SyntheticEvent />
			{/* <ul>
      <li>数量{count}</li>
				{Array(count)
					.fill(0)
					.map((_, i) => (
						<li key={i}>{i}</li>
					))}
			</ul> */}
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
