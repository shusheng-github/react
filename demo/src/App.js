import React, {useState} from 'react';
import Init from './components/init';

function App() {
  const count = 20; 
	return (
		<div className='App'>
			<ul>
        <li>数量{count}</li>
          {Array(count)
            .fill(0)
            .map((_, i) => (
              <li key={i}>{i}</li>
            ))}
			</ul>
		</div>
	);
  // return (
  //   <div className="App">
  //     <Init />
  //     <div className="test">测试</div>
  //   </div>
  // );
}

export default App;
