import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  User, 
  FileText, 
  CheckCircle, 
  LogOut, 
  AlertTriangle, 
  Database,
  BarChart3,
  ListPlus,
  Download,
  Users,
  Trash2,
  UserPlus,
  TrendingUp,
  Lock,
  Eye,
  X,
  CalendarDays,
  FileDown,
  Globe,
  Car
} from 'lucide-react';

// Helper function to get correct flag image path based on market
const getFlagSrc = (market) => {
  if (market === 'uk') return 'uk-flag.jpg';
  if (market === 'ireland') return 'ireland-flag.jpg';
  if (market === 'mixed') return 'mixed-flag.png';
  return null;
};

// Helper for loading images asynchronously for jsPDF
const loadImageForPDF = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// Normalizes a chassisRegistry entry
const getRegistryEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { agentName: entry, saleMonth: null };
  }
  return entry;
};

// Formats a 'YYYY-MM' string into a readable "Month Year" label
const formatSaleMonth = (saleMonth) => {
  if (!saleMonth) return null;
  return new Date(saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

export default function App() {
  // Global State
  const [view, setView] = useState('landing'); 
  const [salesData, setSalesData] = useState([]);
  const [flaggedData, setFlaggedData] = useState([]);
  const [chassisRegistry, setChassisRegistry] = useState({});
  const [agents, setAgents] = useState([
    { name: 'Ali Khan', market: 'uk' },
    { name: 'Sara Ahmed', market: 'ireland' },
    { name: 'Danish Pirzada', market: 'mixed' }
  ]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [toast, setToast] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null); 
  const [pdfLibraryReady, setPdfLibraryReady] = useState(false);

  // Load all shared data from database
  useEffect(() => {
    const loadKey = async (key, fallback) => {
      try {
        const res = await fetch(`/api/kv?key=${key}`);
        const data = await res.json();
        return data.value !== null && data.value !== undefined ? data.value : fallback;
      } catch (err) {
        console.error(`Failed to load ${key}:`, err);
        return fallback;
      }
    };

    (async () => {
      const [sd, fd, cr, agRaw] = await Promise.all([
        loadKey('nbj_sales_data', []),
        loadKey('nbj_flagged_data', []),
        loadKey('nbj_chassis_registry', {}),
        loadKey('nbj_agents', null),
      ]);
      setSalesData(sd);
      setFlaggedData(fd);
      setChassisRegistry(cr);
      
      if (agRaw && agRaw.length > 0 && typeof agRaw[0] === 'string') {
         setAgents(agRaw.map(name => ({ name, market: 'uk' })));
      } else if (agRaw) {
         setAgents(agRaw);
      }
      
      // Artificial delay to make the beautiful loading screen visible smoothly
      setTimeout(() => {
        setDataLoaded(true);
      }, 1200);
    })();
  }, []);

  // Dynamically load jsPDF
  useEffect(() => {
    if (!window.jspdf) {
      const jsPdfScript = document.createElement('script');
      jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      jsPdfScript.async = true;
      jsPdfScript.onload = () => {
        const autoTableScript = document.createElement('script');
        autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
        autoTableScript.async = true;
        autoTableScript.onload = () => {
          setPdfLibraryReady(true);
        };
        document.body.appendChild(autoTableScript);
      };
      document.body.appendChild(jsPdfScript);
    } else {
      setPdfLibraryReady(true);
    }
  }, []);

  // Persist data
  useEffect(() => {
    if (!dataLoaded) return;
    const saveKey = (key, value) => {
      fetch('/api/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      }).catch((err) => console.error(`Failed to save ${key}:`, err));
    };
    saveKey('nbj_sales_data', salesData);
    saveKey('nbj_flagged_data', flaggedData);
    saveKey('nbj_chassis_registry', chassisRegistry);
    saveKey('nbj_agents', agents);
  }, [salesData, flaggedData, chassisRegistry, agents, dataLoaded]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const navigate = (newView) => setView(newView);

  /* =========================================
     PROGRAMMATIC CLIENT-SIDE PDF GENERATORS
     ========================================= */
  const generateAgentReceiptPDF = async (record) => {
    if (!window.jspdf) {
      showToast("PDF Engine loading. Please try again in a few seconds.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(220, 38, 38); 
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(17, 17, 21);
    doc.text("NOBUKO JAPAN", 105, 24, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    doc.text("A U T O M O T I V E   W O R L D", 105, 29, { align: "center" });

    const agentObj = agents.find(a => a.name === record.agentName);
    if (agentObj && agentObj.market) {
      const flagUrl = getFlagSrc(agentObj.market);
      if (flagUrl) {
        const img = await loadImageForPDF(flagUrl);
        if (img) {
          const format = flagUrl.endsWith('.png') ? 'PNG' : 'JPEG';
          doc.addImage(img, format, 175, 12, 20, 13);
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(agentObj.market.toUpperCase() + " TEAM", 185, 28, { align: "center" });
        }
      }
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("AGENT SALES RECEIPT", 105, 37, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 42, 195, 42);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Receipt ID: #${record.id.toUpperCase()}`, 15, 50);
    doc.text(`Date Submitted: ${new Date(record.date).toLocaleDateString()}`, 15, 56);
    
    let monthString = record.saleMonth ? new Date(record.saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';
    doc.text(`Sales Month: ${monthString}`, 15, 62);

    doc.setFillColor(248, 250, 252);
    doc.rect(15, 68, 180, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 68, 180, 18, 'S');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 21);
    doc.text(`AGENT NAME: ${record.agentName.toUpperCase()}`, 20, 79);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(`Registered Chassis Codes (${record.validCount} Units Registered)`, 15, 96);

    const tableBody = record.codes.map((code, idx) => [idx + 1, code, "Verified Unique & Secure"]);
    doc.autoTable({
      head: [['S.NO', 'CHASSIS NUMBER', 'STATUS']],
      body: tableBody,
      startY: 101,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { font: 'courier', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 20, font: 'helvetica', halign: 'center' },
        2: { cellWidth: 50, font: 'helvetica', fontStyle: 'bold', textColor: [22, 163, 74] }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 130;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for your registration submission.", 105, finalY + 20, { align: "center" });

    doc.save(`NBJ_Receipt_${record.agentName.replace(/\s+/g, '_')}_${record.id.toUpperCase()}.pdf`);
    showToast("Receipt downloaded successfully!", "success");
  };

  const generateAdminReportPDF = (filterMonth = 'all', filterTeam = 'all') => {
    if (!window.jspdf) {
      showToast("PDF Engine loading. Please try again.", "error");
      return;
    }

    let reportData = filterMonth === 'all' ? salesData : salesData.filter(d => d.saleMonth === filterMonth);

    if (filterTeam !== 'all') {
      reportData = reportData.filter(d => {
        const ag = agents.find(a => a.name === d.agentName);
        return ag && ag.market === filterTeam;
      });
    }

    if (reportData.length === 0) {
      showToast("Selected filters ke liye koi sales record nahi mila!", "error");
      return;
    }

    const monthLabel = filterMonth === 'all' ? 'All Months' : new Date(filterMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const teamLabel = filterTeam === 'all' ? 'All Teams' : filterTeam.toUpperCase() + ' Team';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(220, 38, 38); 
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(17, 17, 21);
    doc.text("NOBUKO JAPAN", 15, 24);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text("A U T O M O T I V E   W O R L D   M A S T E R   R E P O R T", 15, 29);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 15, 35);
    doc.text(`Period: ${monthLabel}  |  Market: ${teamLabel}`, 100, 35);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 38, 195, 38);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 17, 21);
    doc.text(`1. Verified Sales Registry (${teamLabel})`, 15, 46);

    const tableRows = [];
    reportData.forEach(data => {
      let monthString = data.saleMonth ? new Date(data.saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';
      data.codes.forEach(code => {
        tableRows.push([
          tableRows.length + 1,
          data.agentName,
          code,
          monthString,
          new Date(data.date).toLocaleDateString()
        ]);
      });
    });

    doc.autoTable({
      head: [['S.NO', 'AGENT NAME', 'CHASSIS NUMBER', 'MONTH OF SALES', 'ENTRY DATE']],
      body: tableRows,
      startY: 51,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { font: 'courier' }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 70;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 17, 21);
    doc.text("2. Agent Performance Summary", 15, finalY + 15);

    const summaryAgents = filterTeam === 'all' ? agents : agents.filter(a => a.market === filterTeam);
    const summaryRows = summaryAgents.map(agent => {
      const total = reportData.filter(s => s.agentName === agent.name).reduce((sum, item) => sum + item.validCount, 0);
      return [agent.name, agent.market.toUpperCase(), `${total} Units`];
    });

    doc.autoTable({
      head: [['AGENT NAME', 'MARKET', 'TOTAL UNIQUE SALES']],
      body: summaryRows,
      startY: finalY + 20,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { right: 80 } 
    });

    const fileSuffix = filterMonth === 'all' ? new Date().toISOString().split('T')[0] : filterMonth;
    doc.save(`NBJ_Master_Sales_Report_${filterTeam}_${fileSuffix}.pdf`);
    showToast("Master PDF Report downloaded successfully!", "success");
  };

  // Upgraded Beautiful Luxury Loading Screen
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-[#07070c] flex flex-col items-center justify-center text-slate-200 font-sans relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[140px] animate-pulse"></div>
        <div className="z-10 flex flex-col items-center text-center px-4 animate-fadeIn">
          
          {/* Elite Animated Car Vector & Rings */}
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-red-600/30 animate-[spin_20s_linear_infinite]"></div>
            <div className="absolute inset-2 rounded-full border-4 border-t-red-600 border-r-transparent border-b-red-800 border-l-transparent animate-[spin_1.5s_cubic-bezier(0.4,0,0.2,1)_infinite]"></div>
            <div className="w-20 h-20 bg-[#11111a] rounded-full flex items-center justify-center border border-red-900/40 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
              <Car className="text-red-500 animate-[pulse_2s_infinite]" size={36} />
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-[0.4em] text-white uppercase ml-4">Nobuko Japan</h2>
          <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent my-3"></div>
          <p className="text-xs text-slate-400 font-medium tracking-[0.2em] uppercase max-w-xs animate-pulse">
            Loading Automotive Logistics Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070c] text-slate-200 font-sans selection:bg-red-900 selection:text-white relative overflow-x-hidden">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-[0_15px_50px_rgba(0,0,0,0.7)] border flex items-center gap-3 transition-all backdrop-blur-xl bg-slate-950/90 border-slate-800 text-slate-100 animate-slideDown">
          {toast.type === 'error' && <AlertTriangle size={18} className="text-red-500 animate-bounce" />}
          {toast.type === 'success' && <CheckCircle size={18} className="text-green-500 animate-pulse" />}
          {toast.type === 'info' && <AlertTriangle size={18} className="text-blue-400" />}
          <span className="font-semibold text-xs tracking-wider uppercase">{toast.message}</span>
        </div>
      )}

      {/* Success Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12121a] border border-red-900/20 rounded-[2rem] w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-scaleUp">
            <div className="bg-gradient-to-b from-red-950/40 to-transparent p-8 border-b border-slate-900 text-center relative">
              <button onClick={() => setActiveReceipt(null)} className="absolute right-5 top-5 p-2 hover:bg-slate-900 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
              <div className="w-16 h-16 bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-800/40 shadow-inner">
                <CheckCircle className="text-green-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Authenticated Securely</h3>
              <p className="text-slate-400 text-xs mt-1">Chassis unique verification status recorded.</p>
            </div>

            <div className="p-8 space-y-4 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-900/60 pb-3">
                <span className="text-slate-400 font-medium">Agent Profile:</span>
                <span className="font-bold text-white flex items-center gap-2">
                  {activeReceipt.agentName}
                  {agents.find(a => a.name === activeReceipt.agentName)?.market && (
                     <img 
                       src={getFlagSrc(agents.find(a => a.name === activeReceipt.agentName).market)} 
                       alt="flag" 
                       className="w-5 h-3 object-cover rounded-sm border border-slate-800"
                     />
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-3">
                <span className="text-slate-400 font-medium">Target Period:</span>
                <span className="font-bold text-red-400">
                  {new Date(activeReceipt.saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-3">
                <span className="text-slate-400 font-medium">Registry Count:</span>
                <span className="font-bold text-green-400 bg-green-950/40 border border-green-900/30 px-2.5 py-0.5 rounded-full text-xs">{activeReceipt.validCount} Units</span>
              </div>
              
              <div>
                <span className="text-slate-400 text-[10px] block mb-2 font-black uppercase tracking-widest">Validated Chassis List:</span>
                <div className="bg-[#08080f] border border-slate-900 p-4 rounded-xl max-h-36 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-300 space-y-1.5 shadow-inner">
                  {activeReceipt.codes.map((code, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-900/40 pb-1 last:border-0">
                      <span className="text-slate-400">{idx + 1}. {code}</span>
                      <span className="text-emerald-500 font-black text-[9px] uppercase tracking-wider bg-emerald-950/50 px-1.5 py-0.5 rounded">PASSED</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#161622] p-5 border-t border-slate-900 flex gap-3">
              <button onClick={() => setActiveReceipt(null)} className="w-1/3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-3.5 rounded-xl font-bold transition text-xs uppercase tracking-wider">
                Dismiss
              </button>
              <button 
                onClick={() => generateAgentReceiptPDF(activeReceipt)} 
                className="w-2/3 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-xl shadow-red-950/40 border border-red-700/50"
              >
                <FileDown size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Router */}
      {view === 'landing' && <LandingPage navigate={navigate} />}
      {view === 'admin-login' && <AdminLogin navigate={navigate} showToast={showToast} />}
      {view === 'agent' && (
        <AgentPortal 
          navigate={navigate} 
          chassisRegistry={chassisRegistry}
          setChassisRegistry={setChassisRegistry}
          setSalesData={setSalesData}
          setFlaggedData={setFlaggedData}
          showToast={showToast}
          agents={agents}
          setActiveReceipt={setActiveReceipt}
        />
      )}
      {view === 'admin' && (
        <AdminPanel 
          navigate={navigate} 
          salesData={salesData} 
          setSalesData={setSalesData}
          chassisRegistry={chassisRegistry}
          setChassisRegistry={setChassisRegistry}
          flaggedData={flaggedData} 
          setFlaggedData={setFlaggedData} 
          agents={agents}
          setAgents={setAgents}
          showToast={showToast}
          generateAdminReportPDF={generateAdminReportPDF}
          generateAgentReceiptPDF={generateAgentReceiptPDF}
        />
      )}
    </div>
  );
}

/* =========================================
   1. HIGH-END LANDING PAGE
   ========================================= */
function LandingPage({ navigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-mesh">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-red-600/10 to-transparent rounded-full blur-[130px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-gradient-to-br from-amber-600/5 to-transparent rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center bg-[#0f0f17]/70 backdrop-blur-2xl p-10 md:p-14 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.7)] border border-red-900/20 max-w-md w-full text-center relative overflow-hidden animate-fadeInUp">
        
        {/* Brand Accents */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

        {/* Logo Section */}
        <div className="mb-8 relative group">
           <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity duration-700"></div>
           <div className="absolute inset-0 rounded-full border border-red-500/20 animate-[spin_12s_linear_infinite] p-1"></div>
           <img 
              src="133745.png" 
              alt="NBJ Logo" 
              className="relative w-36 h-36 object-cover rounded-full shadow-3xl border border-red-900/40 z-10 transition-transform duration-700 ease-out hover:scale-105 bg-[#0a0a0f]"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
           />
           <div className="hidden relative w-36 h-36 rounded-full border-2 border-red-600 bg-[#0c0c12] items-center justify-center shadow-2xl text-4xl font-black tracking-tighter text-red-600 z-10">
              NBJ
           </div>
        </div>

        {/* Corporate Titles */}
        <h1 className="text-3xl font-black text-white mb-2 tracking-[0.15em] uppercase bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow">
          NBJ Sales Portal
        </h1>
        <p className="text-red-500 mb-12 text-xs font-black tracking-[0.3em] uppercase flex items-center gap-2 justify-center">
          <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
          Nobuko Japan Automotive
        </p>

        {/* Action Controls */}
        <div className="flex flex-col gap-4 w-full">
          <button 
            onClick={() => navigate('agent')}
            className="group relative flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-xl shadow-red-950/50 hover:shadow-red-900/60 hover:-translate-y-0.5 border border-red-600/30"
          >
            <User size={18} className="group-hover:scale-110 transition-transform duration-300" />
            Agent Portal Entry
          </button>
          
          <button 
            onClick={() => navigate('admin-login')}
            className="group flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-[#14141f] hover:bg-[#1b1b2a] border border-slate-800 hover:border-red-900/40 text-slate-300 font-bold text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-lg"
          >
            <ShieldAlert size={18} className="text-red-500 group-hover:rotate-12 transition-transform duration-300" />
            Executive Access
          </button>
        </div>

        {/* Subtle Footer inside card */}
        <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mt-10">
          Global Logistics Secured Registry System
        </p>
      </div>
    </div>
  );
}

/* =========================================
   1.1 PREMIUM SECURE ADMIN LOGIN
   ========================================= */
function AdminLogin({ navigate, showToast }) {
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'ubaid7894') {
      showToast('Authentication Successful!', 'success');
      navigate('admin');
    } else {
      showToast('Access Denied. Invalid Secure Token.', 'error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-950/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 bg-[#0f0f17]/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl border border-red-900/20 max-w-sm w-full text-center relative animate-scaleUp">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-950/20 flex items-center justify-center border border-red-900/30 shadow-[0_0_30px_rgba(185,28,28,0.15)]">
            <Lock className="text-red-500 animate-[pulse_3s_infinite]" size={28} />
          </div>
        </div>

        <h2 className="text-xl font-black text-white mb-2 uppercase tracking-[0.15em]">Security Gateway</h2>
        <p className="text-slate-400 text-[11px] font-medium tracking-wide mb-8">Verification required to bypass terminal encryption.</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ENTER AUTHORIZATION ACCESS PHRASE..."
            className="w-full bg-[#07070b] border border-slate-800 rounded-xl px-4 py-4 text-white font-mono tracking-widest focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-center placeholder:text-slate-700 shadow-inner text-xs"
          />

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => navigate('landing')}
              className="w-1/3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all border border-slate-800"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-2/3 bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-950/30 border border-red-700/30"
            >
              Authenticate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================
   2. AGENT PORTAL
   ========================================= */
function AgentPortal({ navigate, chassisRegistry, setChassisRegistry, setSalesData, setFlaggedData, showToast, agents, setActiveReceipt }) {
  const [agentName, setAgentName] = useState('');
  const [saleCount, setSaleCount] = useState('');
  const [chassisInput, setChassisInput] = useState('');
  const [saleMonth, setSaleMonth] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!agentName) {
      showToast('Please select your Agent Name.', 'error');
      return;
    }
    if (!saleMonth) {
      showToast('Please select the Month of Sales.', 'error');
      return;
    }
    if (!saleCount.trim() || !chassisInput.trim()) {
      showToast('All fields are mandatory.', 'error');
      return;
    }

    const declaredCount = parseInt(saleCount, 10);
    if (isNaN(declaredCount) || declaredCount <= 0) {
      showToast('Sale count must be a valid positive number.', 'error');
      return;
    }

    const rawCodes = chassisInput.split(/[\n,]+/).map(c => c.trim().toUpperCase()).filter(c => c);
    
    if (rawCodes.length === 0) {
      showToast('No valid chassis codes detected.', 'error');
      return;
    }

    if (rawCodes.length !== declaredCount) {
      showToast(`Count Mismatch: You declared ${declaredCount} sales, but entered ${rawCodes.length} codes.`, 'error');
      return;
    }

    let newFlags = [];
    let validCodes = [];
    let currentSubmissionRegistry = new Set(); 

    rawCodes.forEach(code => {
      if (currentSubmissionRegistry.has(code)) {
        newFlags.push({
          code, attemptedBy: agentName, originalOwner: agentName, 
          date: new Date().toISOString(), saleMonth, 
          originalMonth: saleMonth,
          reason: 'Duplicate in current submission block'
        });
      } else if (chassisRegistry[code]) {
        const existingEntry = getRegistryEntry(chassisRegistry[code]);
        newFlags.push({
          code, attemptedBy: agentName, originalOwner: existingEntry.agentName,
          date: new Date().toISOString(), saleMonth, 
          originalMonth: existingEntry.saleMonth,
          reason: 'Chassis already registered in database'
        });
      } else {
        validCodes.push(code);
        currentSubmissionRegistry.add(code);
      }
    });

    if (newFlags.length > 0) {
      setFlaggedData(prev => [...newFlags, ...prev]);
    }

    if (validCodes.length > 0) {
      const registryUpdates = {};
      validCodes.forEach(code => { registryUpdates[code] = { agentName, saleMonth }; });
      setChassisRegistry(prev => ({ ...prev, ...registryUpdates }));

      const newSaleRecord = {
        id: Math.random().toString(36).substr(2, 9),
        agentName,
        saleMonth, 
        date: new Date().toISOString(),
        declaredCount,
        validCount: validCodes.length,
        codes: validCodes
      };

      setSalesData(prev => [newSaleRecord, ...prev]);
      setActiveReceipt(newSaleRecord);
    }

    if (newFlags.length === rawCodes.length) {
      showToast('Submission Failed: All entered codes were flagged as duplicates.', 'error');
    } else if (newFlags.length > 0) {
      showToast(`Partial Success: ${validCodes.length} registered. ${newFlags.length} duplicates blocked.`, 'error');
    } else {
      showToast('Sales successfully registered!', 'success');
    }

    if (validCodes.length > 0) {
      setChassisInput('');
      setSaleCount('');
    }
  };

  return (
    <div className="min-h-screen bg-[#07070c] pb-12 relative overflow-hidden animate-fadeIn">
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-900/5 rounded-full blur-[100px] pointer-events-none"></div>

      <header className="bg-[#0f0f17]/70 backdrop-blur-xl border-b border-red-900/10 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-red-900/30 bg-[#07070a] overflow-hidden flex items-center justify-center shadow-lg">
             <img src="133745.png" alt="Logo" className="w-full h-full object-contain" 
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}/>
             <span className="hidden text-red-500 font-bold text-xs">NBJ</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-wide uppercase">NBJ Agent Portal</h2>
            <p className="text-[9px] text-red-500 font-black tracking-widest uppercase">Secure Fleet Entry System</p>
          </div>
        </div>
        <button onClick={() => navigate('landing')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-xs font-bold bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-600 uppercase tracking-wider">
          <LogOut size={14} /> Exit
        </button>
      </header>

      <main className="max-w-3xl mx-auto mt-10 px-4 relative z-10 animate-fadeInUp">
        <div className="bg-[#0f0f17] rounded-[2rem] shadow-2xl border border-slate-900 p-8 sm:p-10 relative overflow-hidden">
          <div className="mb-8 border-b border-slate-900 pb-6">
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
              <div className="p-2.5 bg-red-950/30 rounded-xl border border-red-900/30 text-red-500"><ListPlus size={20} /></div>
              Monthly Log Submission
            </h3>
            <p className="text-slate-400 text-xs mt-3 ml-1">Ensure precise data accuracy. All submissions are cross-verified across our universal database ledger dynamically.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Agent Profile</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <select 
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-[#07070b] border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-red-600 transition-all cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="" disabled>Select agent identity...</option>
                    {agents.map((agent, idx) => (
                      <option key={idx} value={agent.name}>{agent.name}</option>
                    ))}
                  </select>
                  {agentName && agents.find(a => a.name === agentName)?.market && (
                    <img 
                      src={getFlagSrc(agents.find(a => a.name === agentName).market)} 
                      alt="flag" 
                      className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-3 object-cover rounded-sm shadow border border-slate-800 pointer-events-none"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Reporting Target Month</label>
                <div className="relative">
                  <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="month" 
                    value={saleMonth}
                    onChange={(e) => setSaleMonth(e.target.value)}
                    className="w-full bg-[#07070b] border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-red-600 transition-all cursor-pointer shadow-inner [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Declared Inventory Volume</label>
                <div className="relative">
                  <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="number" 
                    value={saleCount}
                    onChange={(e) => setSaleCount(e.target.value)}
                    placeholder="ENTER TOTAL CARS QUANTITY SUBMITTED (e.g. 12)"
                    min="1"
                    className="w-full bg-[#07070b] border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-red-600 transition-all placeholder:text-slate-700 shadow-inner tracking-wider"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 flex justify-between items-end uppercase tracking-widest">
                <span>Unique Chassis Numbers</span>
                <span className="text-[9px] text-red-400 font-bold bg-red-950/40 border border-red-900/20 px-2 py-0.5 rounded">LINE BREAK SEPARATION</span>
              </label>
              <textarea 
                value={chassisInput}
                onChange={(e) => setChassisInput(e.target.value)}
                placeholder="ENTER CHASSIS UNIQUE CODES LINE BY LINE...&#10;WVWZZZAUZHW188235&#10;NHP130-2017196"
                rows="7"
                className="w-full bg-[#07070b] border border-slate-800 rounded-xl px-5 py-4 text-slate-200 focus:outline-none focus:border-red-600 transition-all placeholder:text-slate-700 font-mono text-xs resize-y shadow-inner leading-relaxed tracking-widest uppercase"
              ></textarea>
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-red-900 to-red-600 hover:from-red-800 hover:to-red-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest shadow-xl border border-red-700/20 hover:-translate-y-0.5"
            >
              <CheckCircle size={16} />
              Validate & Transmit Logs
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

/* =========================================
   3. ADMIN PANEL
   ========================================= */
function AdminPanel({ 
  navigate, 
  salesData, 
  setSalesData, 
  chassisRegistry, 
  setChassisRegistry, 
  flaggedData, 
  setFlaggedData, 
  agents, 
  setAgents, 
  showToast, 
  generateAdminReportPDF, 
  generateAgentReceiptPDF 
}) {
  const [activeTab, setActiveTab] = useState('registry');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentMarket, setNewAgentMarket] = useState('uk');
  const [selectedChassisModal, setSelectedChassisModal] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [analyticsMonth, setAnalyticsMonth] = useState('all');

  const availableMonths = [...new Set(salesData.map(d => d.saleMonth).filter(Boolean))].sort().reverse();
  const totalValidSales = salesData.reduce((sum, item) => sum + item.validCount, 0);
  const totalFlags = flaggedData.length;

  const handleRemoveChassis = (recordId, codeToRemove) => {
    const updatedRegistry = { ...chassisRegistry };
    delete updatedRegistry[codeToRemove];
    setChassisRegistry(updatedRegistry);

    const updatedSalesData = salesData.map(record => {
      if (record.id === recordId) {
        const updatedCodes = record.codes.filter(code => code !== codeToRemove);
        return {
          ...record,
          codes: updatedCodes,
          validCount: updatedCodes.length
        };
      }
      return record;
    }).filter(record => record.validCount > 0); 

    setSalesData(updatedSalesData);

    if (selectedChassisModal && selectedChassisModal.id === recordId) {
      const updatedModalCodes = selectedChassisModal.codes.filter(code => code !== codeToRemove);
      if (updatedModalCodes.length === 0) {
        setSelectedChassisModal(null); 
      } else {
        setSelectedChassisModal({
          ...selectedChassisModal,
          codes: updatedModalCodes,
          validCount: updatedModalCodes.length
        });
      }
    }
    showToast(`Chassis ${codeToRemove} evicted by executive order.`, 'info');
  };

  const handleRemoveFlagged = (indexToRemove) => {
    const updatedFlags = flaggedData.filter((_, idx) => idx !== indexToRemove);
    setFlaggedData(updatedFlags);
    showToast('Flag item cleared permanently.', 'info');
  };

  const handleAddAgent = (e) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    if (agents.some(a => a.name === newAgentName.trim())) {
      showToast('Agent database record already exists!', 'error');
      return;
    }
    setAgents([...agents, { name: newAgentName.trim(), market: newAgentMarket }]);
    setNewAgentName('');
    showToast('Agent profile committed successfully!', 'success');
  };

  const handleRemoveAgent = (agentToRemove) => {
    setAgents(agents.filter(a => a.name !== agentToRemove));
    showToast(`${agentToRemove} record purged.`, 'info');
  };

  const exportToCSV = () => {
    let reportData = selectedMonth === 'all' ? salesData : salesData.filter(d => d.saleMonth === selectedMonth);

    if (teamFilter !== 'all') {
      reportData = reportData.filter(d => {
        const ag = agents.find(a => a.name === d.agentName);
        return ag && ag.market === teamFilter;
      });
    }

    if (reportData.length === 0) {
      showToast('No structured data to map to CSV currently.', 'error');
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "AGENT NAME,MARKET,CHASSIS,MONTH OF SALES\n";

    reportData.forEach(data => {
      let monthString = data.saleMonth ? new Date(data.saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'Not Specified';
      const agentMarket = agents.find(a => a.name === data.agentName)?.market?.toUpperCase() || 'N/A';
      
      data.codes.forEach(code => {
        csvContent += `"${data.agentName}","${agentMarket}","${code}","${monthString}"\n`;
      });
    });

    csvContent += "\n\n";
    csvContent += "--- AGENT PERFORMANCE SUMMARY ---\n";
    csvContent += "AGENT NAME,MARKET,TOTAL SALES COUNT\n";
    
    const summaryAgents = teamFilter === 'all' ? agents : agents.filter(a => a.market === teamFilter);
    summaryAgents.forEach(agent => {
      const total = reportData.filter(s => s.agentName === agent.name).reduce((sum, item) => sum + item.validCount, 0);
      csvContent += `"${agent.name}","${agent.market.toUpperCase()}","${total}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileSuffix = selectedMonth === 'all' ? new Date().toISOString().split('T')[0] : selectedMonth;
    link.setAttribute("download", `NBJ_Sales_Report_${teamFilter}_${fileSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const agentStats = agents.map(agentObj => {
    const agent = agentObj.name;
    const filteredSales = analyticsMonth === 'all' ? salesData : salesData.filter(d => d.saleMonth === analyticsMonth);
    const agentSales = filteredSales.filter(s => s.agentName === agent);
    const totalAgentValid = agentSales.reduce((sum, item) => sum + item.validCount, 0);
    
    const agentFlags = flaggedData.filter(f => {
      if (f.attemptedBy !== agent) return false;
      if (analyticsMonth === 'all') return true;
      if (f.saleMonth) return f.saleMonth === analyticsMonth;
      return f.date.startsWith(analyticsMonth);
    }).length;

    return { name: agent, market: agentObj.market, valid: totalAgentValid, flags: agentFlags };
  }).sort((a, b) => b.valid - a.valid);

  return (
    <div className="min-h-screen bg-[#07070c] flex flex-col relative animate-fadeIn">
      
      {/* Chassis Viewer Modal */}
      {selectedChassisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f0f17] border border-slate-900 rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="flex items-center justify-between p-6 border-b border-slate-900">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider">
                  <Database className="text-red-500" size={18} />
                  Chassis Logs: {selectedChassisModal.agentName}
                </h3>
                <p className="text-slate-400 text-xs mt-1 font-bold">
                  Total Active Units: <strong className="text-green-400">{selectedChassisModal.validCount}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedChassisModal(null)} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedChassisModal.codes.map((code, index) => (
                  <div key={index} className="bg-[#07070b] border border-slate-900 p-3.5 rounded-xl flex items-center justify-between hover:border-red-900/20 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-black">{index + 1}</div>
                      <span className="font-mono text-slate-200 tracking-widest text-xs font-semibold uppercase">{code}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveChassis(selectedChassisModal.id, code)}
                      className="p-2 bg-red-950/20 text-red-500 hover:text-white hover:bg-red-600 rounded-lg border border-red-900/30 transition-all opacity-40 group-hover/item:opacity-100"
                      title="Purge Entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-900 bg-slate-950/20 rounded-b-[2rem] flex justify-between items-center">
               <button 
                  onClick={() => generateAgentReceiptPDF(selectedChassisModal)} 
                  className="bg-red-900 hover:bg-red-700 border border-red-700/30 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 text-xs uppercase tracking-widest shadow-lg"
               >
                 <Download size={13} /> Export PDF Receipt
               </button>
               <button onClick={() => setSelectedChassisModal(null)} className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-6 py-2.5 rounded-xl font-bold transition-colors text-xs uppercase tracking-wider">
                 Dismiss
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#0f0f17]/60 border-b border-red-900/10 px-6 py-4 flex justify-between items-center sticky top-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-950/30 rounded-xl border border-red-900/20 shadow-[0_0_15px_rgba(185,28,28,0.1)]">
            <ShieldAlert className="text-red-500 animate-pulse" size={20} />
          </div>
          <h2 className="text-base font-black text-white tracking-[0.2em] uppercase">NBJ Admin Dashboard</h2>
        </div>
        <button onClick={() => navigate('landing')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-all text-xs font-bold bg-[#14141f] px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-600 uppercase tracking-wider shadow-md">
          <LogOut size={14} /> Exit
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full animate-fadeInUp">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#0f0f17] rounded-2xl border border-slate-900 p-6 flex items-center gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
            <div className="w-14 h-14 rounded-xl bg-green-950/20 flex items-center justify-center border border-green-900/30 shadow-inner">
              <Database className="text-green-500" size={24} />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Global Confirmed Sales</p>
              <h3 className="text-3xl font-black text-white">{totalValidSales} <span className="text-xs text-slate-500 tracking-normal font-medium">Units</span></h3>
            </div>
          </div>

          <div className="bg-[#0f0f17] rounded-2xl border border-slate-900 p-6 flex items-center gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors"></div>
            <div className="w-14 h-14 rounded-xl bg-red-950/20 flex items-center justify-center border border-red-900/30 shadow-inner">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Intercepted Duplicates</p>
              <h3 className="text-3xl font-black text-white">{totalFlags} <span className="text-xs text-slate-500 tracking-normal font-medium">Violations</span></h3>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-[#0f0f17] p-1.5 rounded-xl border border-slate-900 overflow-x-auto w-max shadow-lg">
          <button onClick={() => setActiveTab('registry')} className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'registry' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <FileText size={15} /> Sales Ledger
          </button>
          
          <button onClick={() => setActiveTab('flags')} className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'flags' ? 'bg-red-950/60 border border-red-900/40 text-red-100 shadow' : 'text-slate-400 hover:text-white'}`}>
            <ShieldAlert size={15} /> Integrity Flags
            {totalFlags > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded ml-1 font-black">{totalFlags}</span>}
          </button>
          
          <button onClick={() => setActiveTab('agents')} className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'agents' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <Users size={15} /> Executive Staff
          </button>

          <button onClick={() => setActiveTab('analytics')} className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <TrendingUp size={15} /> Metrics & Analytics
          </button>
        </div>

        {/* Content: Registry */}
        {activeTab === 'registry' && (
          <div className="space-y-4">
            <div className="flex justify-between items-end flex-wrap gap-4">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Active Inventory Registry</h3>
              <div className="flex gap-3 items-center flex-wrap">
                
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="appearance-none bg-[#07070b] border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer shadow-inner"
                  >
                    <option value="all">All Regional Squads</option>
                    <option value="uk">UK Operations</option>
                    <option value="ireland">Ireland Division</option>
                    <option value="mixed">Mixed Markets</option>
                  </select>
                </div>

                <div className="relative">
                  <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="appearance-none bg-[#07070b] border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer shadow-inner"
                  >
                    <option value="all">All Historic Periods</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>
                        {new Date(m + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>

                <button onClick={exportToCSV} className="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-lg">
                  <Download size={14} /> Excel
                </button>
                <button onClick={() => generateAdminReportPDF(selectedMonth, teamFilter)} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-lg">
                  <Download size={14} /> Master PDF
                </button>
              </div>
            </div>
            
            <div className="bg-[#0f0f17] border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
              {salesData.length === 0 ? (
                <div className="p-16 text-center text-slate-600 flex flex-col items-center">
                  <BarChart3 size={48} className="mb-3 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-wider">No transactional data maps found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-900">
                        <th className="p-5 font-black">Submission Date</th>
                        <th className="p-5 font-black">Authorized Agent</th>
                        <th className="p-5 font-black">Log Month</th>
                        <th className="p-5 font-black">Unique Count</th>
                        <th className="p-5 font-black text-right">Terminal Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-950/40">
                      {salesData
                        .filter(data => {
                          if (teamFilter === 'all') return true;
                          return agents.find(a => a.name === data.agentName)?.market === teamFilter;
                        })
                        .map((data) => {
                        let displayMonth = data.saleMonth ? new Date(data.saleMonth + "-01").toLocaleString('en-US', { month: 'short', year: 'numeric' }) : "N/A";
                        let agentMarket = agents.find(a => a.name === data.agentName)?.market;
                        return (
                          <tr key={data.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-5 text-xs text-slate-400 whitespace-nowrap font-medium">
                              {new Date(data.date).toLocaleDateString()} <span className="text-slate-600 text-[10px] ml-1 block mt-0.5">{new Date(data.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="p-5 text-xs font-black text-white flex items-center gap-2 mt-1">
                              {agentMarket && (
                                <img src={getFlagSrc(agentMarket)} alt={agentMarket} className="w-5 h-3 object-cover rounded-sm border border-slate-800" />
                              )}
                              {data.agentName}
                            </td>
                            <td className="p-5 text-xs text-blue-400 font-bold tracking-wider">{displayMonth}</td>
                            <td className="p-5">
                              <span className="bg-green-950/30 text-green-400 border border-green-900/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                {data.validCount} Passed
                              </span>
                            </td>
                            <td className="p-5 text-right">
                              <button onClick={() => setSelectedChassisModal(data)} className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border border-slate-800 uppercase tracking-wider">
                                <Eye size={13} /> Review Logs
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content: Flags */}
        {activeTab === 'flags' && (
          <div className="bg-[#0f0f17] border border-red-900/10 rounded-2xl overflow-hidden shadow-2xl">
            {flaggedData.length === 0 ? (
              <div className="p-16 text-center text-slate-600 flex flex-col items-center">
                <ShieldAlert size={48} className="mb-3 text-green-600 opacity-40 animate-pulse" />
                <p className="text-sm font-bold uppercase tracking-wider text-green-500/80">Integrity Clear. Zero anomalies reported.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="p-4 bg-red-950/20 border-b border-red-900/20 flex items-center gap-2 text-red-400 text-[11px] font-black uppercase tracking-widest">
                  <AlertTriangle size={15} /> System Notice: The following collision anomalies were actively blocked.
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 text-[10px] uppercase tracking-widest border-b border-red-900/20">
                      <th className="p-5 font-black">Timestamp</th>
                      <th className="p-5 font-black">Intercepted User</th>
                      <th className="p-5 font-black text-red-400">Flagged Chassis</th>
                      <th className="p-5 font-black">Database Owner</th>
                      <th className="p-5 font-black">Initial Registration</th>
                      <th className="p-5 font-black">Violation Signature</th>
                      <th className="p-5 font-black text-right">Purge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950/40">
                    {flaggedData.map((flag, idx) => (
                      <tr key={idx} className="hover:bg-red-950/5 transition-colors">
                        <td className="p-5 text-xs text-slate-400 whitespace-nowrap font-medium">
                          {new Date(flag.date).toLocaleDateString()} <span className="text-slate-600 text-[10px] ml-1 block mt-0.5">{new Date(flag.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="p-5 text-xs font-black text-white">{flag.attemptedBy}</td>
                        <td className="p-5 text-xs">
                          <span className="font-mono font-bold text-red-400 bg-red-950/30 border border-red-900/40 px-2 py-1 rounded shadow-inner text-xs tracking-wider uppercase">
                            {flag.code}
                          </span>
                        </td>
                        <td className="p-5 text-xs font-semibold">
                          {flag.originalOwner === flag.attemptedBy ? (
                             <span className="text-orange-400 text-[9px] font-black border border-orange-900/40 bg-orange-950/20 px-2 py-0.5 rounded flex w-max items-center gap-1 uppercase tracking-wider">
                                Self Collision
                             </span>
                          ) : (
                            <span className="text-emerald-400 font-black">{flag.originalOwner}</span>
                          )}
                        </td>
                        <td className="p-5 text-xs">
                          {flag.originalMonth ? (
                            <span className="flex items-center gap-1.5 text-slate-300 font-bold text-xs">
                              <CalendarDays size={13} className="text-slate-600" />
                              {formatSaleMonth(flag.originalMonth)}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic text-[11px]">Legacy Record</span>
                          )}
                        </td>
                        <td className="p-5 text-[11px] font-medium text-slate-400">{flag.reason}</td>
                        <td className="p-5 text-right">
                          <button
                            onClick={() => handleRemoveFlagged(idx)}
                            className="p-2 bg-red-950/20 text-red-500 hover:text-white hover:bg-red-600 rounded-lg border border-red-900/30 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Content: Manage Agents */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0f0f17] border border-slate-900 rounded-2xl p-8 shadow-xl h-fit">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-wider">
                <div className="p-2 bg-slate-950/40 border border-slate-800 rounded-lg text-red-500"><UserPlus size={18} /></div>
                Provision Staff Profile
              </h3>
              <form onSubmit={handleAddAgent} className="flex flex-col gap-4">
                
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="text" 
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="ENTER EXECUTIVE FULL NAME..."
                    className="w-full bg-[#07070b] border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-xs font-semibold text-white focus:outline-none focus:border-red-600 shadow-inner tracking-wider"
                  />
                </div>
                
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <select
                    value={newAgentMarket}
                    onChange={(e) => setNewAgentMarket(e.target.value)}
                    className="w-full appearance-none bg-[#07070b] border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-red-600 shadow-inner cursor-pointer"
                  >
                    <option value="uk">United Kingdom (UK)</option>
                    <option value="ireland">Ireland Market</option>
                    <option value="mixed">Mixed Corporate Team</option>
                  </select>
                </div>

                <button type="submit" className="bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 text-white w-full py-3.5 rounded-xl font-black text-xs transition-all shadow-lg uppercase tracking-widest mt-2 border border-red-700/20">
                  Commit Registration
                </button>
              </form>
            </div>
            
            <div className="bg-[#0f0f17] border border-slate-900 rounded-2xl p-8 shadow-xl">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-wider">
                <div className="p-2 bg-slate-950/40 border border-slate-800 rounded-lg text-emerald-500"><Users size={18} /></div>
                Active Deployment Roster
              </h3>
              <ul className="divide-y divide-slate-950/60 border border-slate-900 rounded-xl overflow-hidden bg-[#07070b] shadow-inner">
                {agents.length === 0 ? (
                  <li className="text-slate-600 p-6 text-center text-xs font-bold uppercase tracking-wider">Database completely unstaffed.</li>
                ) : (
                  agents.map((agent, idx) => (
                    <li key={idx} className="p-4 px-5 flex justify-between items-center hover:bg-slate-900/10 transition-colors group">
                      <span className="font-black text-xs text-slate-200 flex items-center gap-3 uppercase tracking-wider">
                        {agent.market && (
                           <img 
                             src={getFlagSrc(agent.market)} 
                             alt={agent.market} 
                             className="w-5 h-3 object-cover rounded-sm border border-slate-800" 
                           />
                        )}
                        {agent.name}
                      </span>
                      <button onClick={() => handleRemoveAgent(agent.name)} className="text-slate-500 hover:text-red-500 bg-slate-900 hover:bg-red-950/30 p-2 rounded-lg transition-all" title="Purge Staff">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Content: Analytics */}
        {activeTab === 'analytics' && (
          <div className="bg-[#0f0f17] border border-slate-900 rounded-2xl p-8 shadow-xl">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-wider">
                <div className="p-2 bg-slate-950/40 border border-slate-800 rounded-lg text-blue-500"><TrendingUp size={18} /></div>
                Performance Matrix Overview
              </h3>
              
              <div className="relative">
                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                <select
                  value={analyticsMonth}
                  onChange={(e) => setAnalyticsMonth(e.target.value)}
                  className="appearance-none bg-[#07070b] border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">Cumulative Lifetime Analytics</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      {new Date(m + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {agentStats.map((stat, idx) => (
                <div key={idx} className="bg-[#07070b] border border-slate-900 rounded-2xl p-5 hover:border-red-900/30 transition-all relative overflow-hidden group shadow-md">
                  
                  {stat.market && (
                    <>
                      <img 
                        src={getFlagSrc(stat.market)} 
                        alt={stat.market} 
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.04] group-hover:opacity-[0.12] transition-opacity duration-700 pointer-events-none scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07070b] via-[#07070b]/90 to-transparent pointer-events-none"></div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-slate-400 border border-slate-800 shadow-sm">
                      <User size={15} />
                    </div>
                    {stat.market && (
                       <div className="bg-[#07070b]/90 px-2 py-0.5 rounded border border-slate-800 shadow-sm">
                         <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{stat.market}</span>
                       </div>
                    )}
                  </div>

                  <h4 className="text-white font-black text-sm mb-5 truncate tracking-wide relative z-10 uppercase">
                    {stat.name}
                  </h4>
                  
                  <div className="flex justify-between items-end bg-[#0f0f17]/80 backdrop-blur-md p-3 rounded-xl border border-slate-900 relative z-10 shadow-inner">
                    <div>
                      <p className="text-[9px] text-slate-500 mb-0.5 uppercase font-black tracking-wider">Valid Volume</p>
                      <p className="text-xl font-black text-emerald-400">{stat.valid}</p>
                    </div>
                    <div className="text-right border-l border-slate-950 pl-4">
                      <p className="text-[9px] text-slate-500 mb-0.5 uppercase font-black tracking-wider">Collisions</p>
                      <p className="text-lg font-black text-red-400">{stat.flags}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* Universal Premium CSS Injector */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #07070b; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1c1c28; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2d2d3f; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -15px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        .animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scaleUp { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .bg-mesh {
          background-image: radial-gradient(rgba(220, 38, 38, 0.02) 1px, transparent 0);
          background-size: 24px 24px;
        }
      `}} />
    </div>
  );
}
