import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './product.css';
class Boundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){if(this.state.failed)return <div className="fatal"><h1>页面暂时没有整理好</h1><p>你的研究保存在本机，刷新页面即可重新打开。</p><button className="button primary" onClick={()=>location.reload()}>重新打开</button></div>;return this.props.children;}}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary><App/></Boundary></React.StrictMode>);
