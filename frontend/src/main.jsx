import React from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';
import './styles.css';
const API = 'http://localhost:4000/api';
const labels = ['housing','transportation','food','debt','subscriptions','medical','savings','personal','family','miscellaneous'];
function App(){
const [income,setIncome]=React.useState(3000); const [exp,setExp]=React.useState(Object.fromEntries(labels.map(l=>[l,0])));
const [rows,setRows]=React.useState([]); const [analysis,setAnalysis]=React.useState(null); const [loading,setLoading]=React.useState(false); const [error,setError]=React.useState('');
const [scenarios,setScenarios]=React.useState([]);
const totalExpenses=Object.values(exp).reduce((a,b)=>a+Number(b||0),0); const remaining=income-totalExpenses;
const healthColor=remaining>income*0.2?'text-green-400':remaining>=0?'text-yellow-400':'text-red-400';
const handleUpload=async(e)=>{const file=e.target.files?.[0]; if(!file) return; const fd=new FormData(); fd.append('file',file); const r=await fetch(`${API}/upload`,{method:'POST',body:fd}); const d=await r.json(); setRows(d.rows||[]);};
const runAnalysis=async()=>{setLoading(true);setError(''); try{const r=await fetch(`${API}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({income:Number(income),expenses:exp,scenarios})}); const d=await r.json(); setAnalysis(d);}catch{setError('Failed to analyze');}finally{setLoading(false);}};
const generatePdf=()=>{const doc=new jsPDF(); doc.text('Personal Household Financial Health Report',10,10); doc.text(`Income: $${income}`,10,20); doc.text(`Expenses: $${totalExpenses}`,10,30); doc.text(`Remaining: $${remaining}`,10,40); doc.text('AI-generated advice is educational only.',10,50); if(analysis?.advisor) doc.text(doc.splitTextToSize(analysis.advisor,180),10,60); doc.save('financial-report.pdf');};
const spendingData=labels.map(k=>({name:k,value:Number(exp[k]||0)}));
const scenarioData=analysis?.scenarios||[];
return <div className='min-h-screen bg-slate-950 text-slate-100 p-6'><h1 className='text-3xl font-bold mb-4'>AI Personal Household Financial Advisor</h1>
<div className='grid md:grid-cols-4 gap-4 mb-6'>{[['Income',income],['Expenses',totalExpenses],['Balance',remaining],['Health Score',analysis?.metrics?.healthScore?.toFixed(1)||'--']].map(([k,v])=><div key={k} className='bg-slate-900 p-4 rounded-xl border border-slate-700'><div className='text-sm text-slate-400'>{k}</div><div className={`text-2xl font-semibold ${k==='Balance'?healthColor:''}`}>${v}</div></div>)}</div>
<div className='grid lg:grid-cols-2 gap-6'>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700'><h2 className='font-semibold mb-2'>Manual Entry</h2><input type='number' value={income} onChange={e=>setIncome(Number(e.target.value))} className='w-full bg-slate-800 p-2 rounded mb-3'/>{labels.map(k=><div key={k} className='flex justify-between mb-2'><label className='capitalize'>{k}</label><input type='number' value={exp[k]} onChange={e=>setExp({...exp,[k]:Number(e.target.value)})} className='w-32 bg-slate-800 p-1 rounded'/></div>)}</div>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700'><h2 className='font-semibold mb-2'>Upload Spreadsheet (.xlsx/.csv)</h2><input type='file' accept='.xlsx,.csv' onChange={handleUpload} />
<div className='mt-3 max-h-48 overflow-auto text-xs'>{rows.slice(0,20).map((r,i)=><pre key={i}>{JSON.stringify(r)}</pre>)}</div></div></div>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700 mt-6'><h2 className='font-semibold mb-2'>Emergency Scenario Simulator</h2><div className='grid grid-cols-2 md:grid-cols-3 gap-2'>{['jobLoss','rentIncrease','medicalEmergency','carRepair','inflationIncrease','creditInterestIncrease'].map(s=><label key={s}><input type='checkbox' checked={scenarios.includes(s)} onChange={()=>setScenarios(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])}/> {s}</label>)}</div><button onClick={runAnalysis} className='mt-4 bg-emerald-600 px-4 py-2 rounded'>{loading?'Analyzing...':'Analyze with AI'}</button>{error&&<p className='text-red-400'>{error}</p>}</div>
<div className='grid lg:grid-cols-2 gap-6 mt-6'>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700 h-72'><h3>Monthly Spending Breakdown</h3><ResponsiveContainer><BarChart data={spendingData}><XAxis dataKey='name' hide/><YAxis/><Tooltip/><Bar dataKey='value' fill='#22c55e'/></BarChart></ResponsiveContainer></div>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700 h-72'><h3>Debt Distribution</h3><ResponsiveContainer><PieChart><Pie data={spendingData.filter(d=>d.value>0)} dataKey='value' nameKey='name'>{spendingData.map((_,i)=><Cell key={i} fill={['#22c55e','#eab308','#ef4444','#3b82f6','#a855f7'][i%5]} />)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700 h-72'><h3>Savings Progress</h3><ResponsiveContainer><LineChart data={[{m:'Now',s:exp.savings},{m:'12m',s:Number(exp.savings)*12}]}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='m'/><YAxis/><Tooltip/><Line dataKey='s' stroke='#22c55e'/></LineChart></ResponsiveContainer></div>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700 h-72'><h3>Emergency Impact Comparison</h3><ResponsiveContainer><BarChart data={scenarioData}><XAxis dataKey='scenario'/><YAxis/><Tooltip/><Legend/><Bar dataKey='remaining' fill='#ef4444'/><Bar dataKey='healthScore' fill='#22c55e'/></BarChart></ResponsiveContainer></div>
</div>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700 mt-6 h-72'><h3>Yearly Financial Projection</h3><ResponsiveContainer><LineChart data={Array.from({length:12},(_,i)=>({month:i+1,balance:remaining*(i+1)}))}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='month'/><YAxis/><Tooltip/><Line dataKey='balance' stroke='#38bdf8'/></LineChart></ResponsiveContainer></div>
<div className='bg-slate-900 p-4 rounded-xl border border-slate-700 mt-6'><h2 className='font-semibold'>AI Advisor</h2><p className='whitespace-pre-wrap text-slate-200'>{analysis?.advisor || 'Run analysis to generate advice.'}</p><p className='text-yellow-300 mt-2'>AI-generated advice is educational only.</p><button onClick={generatePdf} className='mt-4 bg-blue-600 px-4 py-2 rounded'>Download PDF Report</button></div>
</div>}
createRoot(document.getElementById('root')).render(<App/>);
