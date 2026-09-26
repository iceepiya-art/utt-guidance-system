import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DataReviewPanel} from '../../src/components/schools/DataReviewPanel';
import '../../src/index.css';
function Fixture(){const [target,setTarget]=useState('');return <main style={{padding:20}}><DataReviewPanel ready items={[{type:'SUBMISSION',id:'source-1',label:'School A',date:'2026-09-01',missing:['Vehicle'],links:[]},{type:'GUIDANCE',id:'source-2',label:'School B',date:'',missing:[],links:['Missing appointment']}]} onOpen={t=>setTarget(t.type+':'+t.id)}/><output>{target}</output></main>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
