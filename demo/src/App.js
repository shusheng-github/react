import React, {useState, useEffect, useRef, useLayoutEffect, useTransition} from 'react';
import Init from './components/init';

function App() {
  const refValue = useRef(1);
	const [count, updateCount] = useState(1);
  const [state, updateState] = useState(0);
  // const [isPending, startTransition] = useTransition();
  const handleClick = () => {
    // updateCount((state) => state + 1)
    refValue.current++;
    console.log('refValue.current', refValue.current)
  }
  useEffect(() => {
    console.log('监听ref :>> ', refValue.current);
    // updateCount(3000);
    // startTransition(() => {
    //   updateCount(3000);
    // })
  }, [refValue.current])
	return (
		<div className='App' onClick={handleClick}>
      <div>state: {state}</div>
      <div>count: {count}</div>
      {/* <SyntheticEvent /> */}
			{/* <ul>
      <li>数量{count}</li>
				{Array(count)
					.fill(0)
					.map((_, i) => (
						<li key={i}>{i}</li>
					))}
			</ul> */}
      <Init></Init>
		</div>
	);
}

export default App;
