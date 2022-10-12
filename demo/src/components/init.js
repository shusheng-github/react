import React, {useState} from 'react';
const logo = 'https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fpic1.win4000.com%2Fwallpaper%2F2020-10-15%2F5f88029ef3b39.jpg&refer=http%3A%2F%2Fpic1.win4000.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1668151287&t=9509c7c3555f56f13bfce2675e04f3c0';
function Init() {
  const [state, updateState] = useState(0);
  return (
    <header className="App-header" onClick={() => updateState((state) => state + 1)}>
        <img src={logo} className="App-logo" alt="logo" style={{width: '200px', height: 'auto'}} />
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
    </header>
  )
}

export default Init;