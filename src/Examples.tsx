import React from 'react';
import { render } from 'react-dom';
import styled from 'styled-components';
import DrapedStage from './DrapedStage';

const Wrapper = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;

`
const Example = () => {

  const StageRef = React.useCallback((node) => {
    if(node !== null) {
      new DrapedStage(node,{ stats: true });
    }
  },[])
  return (
    <Wrapper ref={StageRef}></Wrapper>
  )
  
}

render(<Example/>,
  document.getElementById('root')
);

