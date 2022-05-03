import React from 'react';
import { render } from 'react-dom';
import DrapedStage from './DrapedStage';
import './index.scss';

const Example = () => {

  const StageRef = React.useCallback((node) => {
    if(node !== null) {
      new DrapedStage(node,{ stats: true });
    }
  },[])
  return (
    <div style={{ width: '100%', height: '100vh'}} ref={StageRef}></div>
  )
  
}

render(<Example/>,
  document.getElementById('root')
);

