import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SchoolFormModal} from '../../src/components/schools/SchoolFormModal';
import type {School} from '../../src/types';
import '../../src/index.css';
const school={id:'local-only',schoolId:'001',schoolName:'Local QA school',teamId:'team1',province:'',district:'',educationLevels:'',teacherName:'Verified teacher',teacherPhone:'0123456789'} as School;
function Fixture(){const [open,setOpen]=useState(true);const [saved,setSaved]=useState('');return <><SchoolFormModal isOpen={open} schoolToEdit={school} onClose={()=>setOpen(false)} onSave={async data=>{setSaved(JSON.stringify(data));}}/><output>{saved}</output></>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
