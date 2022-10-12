import React from 'react';

const SyntheticEvent = () => {
  const handleClick = (e) => {
    console.log('e :>> ', e);
    console.log('点击', '点击')
    setTimeout(() => {
      console.log('setTimeoute', e)
    }, 1000)
  }
  const handleChange = () => {
    console.log('input', 'input')
  }
  return <div>
    <div onClick={handleClick}>合成事件点击事件</div>
    <input type="text" onChange={handleChange} />
  </div>
}

export default SyntheticEvent;