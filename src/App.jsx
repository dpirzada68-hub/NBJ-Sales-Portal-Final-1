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
  FileDown
} from 'lucide-react';

export default function App() {
  // Global State — now backed by a shared Neon Postgres database via /api/kv,
  // instead of per-device localStorage.
  const [view, setView] = useState('landing'); // 'landing', 'admin-login', 'agent', 'admin'
  const [salesData, setSalesData] = useState([]);
  const [flaggedData, setFlaggedData] = useState([]);
  const [chassisRegistry, setChassisRegistry] = useState({});
  const [agents, setAgents] = useState(['Ali Khan', 'Sara Ahmed', 'Danish Pirzada']);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [toast, setToast] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null); // Triggers success receipt modal
  const [pdfLibraryReady, setPdfLibraryReady] = useState(false);

  // Load all shared data from the database once, on first app load
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
      const [sd, fd, cr, ag] = await Promise.all([
        loadKey('nbj_sales_data', []),
        loadKey('nbj_flagged_data', []),
        loadKey('nbj_chassis_registry', {}),
        loadKey('nbj_agents', ['Ali Khan', 'Sara Ahmed', 'Danish Pirzada']),
      ]);
      setSalesData(sd);
      setFlaggedData(fd);
      setChassisRegistry(cr);
      setAgents(ag);
      setDataLoaded(true);
    })();
  }, []);

  // Dynamically load jsPDF and jspdf-autotable to prevent sandboxed window.print() failures
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

  // Persist data to the shared database (skip the very first render, before
  // the initial load above has finished, so we don't overwrite saved data
  // with the empty defaults)
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

  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const navigate = (newView) => setView(newView);

  /* =========================================
     PROGRAMMATIC CLIENT-SIDE PDF GENERATORS
     ========================================= */

  // 1. Agent Receipt PDF
  const generateAgentReceiptPDF = (record) => {
    if (!window.jspdf) {
      showToast("PDF Engine loading. Please try again in a few seconds.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Red Header accent block
    doc.setFillColor(220, 38, 38); 
    doc.rect(0, 0, 210, 8, 'F');

    // Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(17, 17, 21);
    doc.text("NOBUKO JAPAN", 105, 24, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    doc.text("A U T O M O T I V E   W O R L D", 105, 29, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("AGENT SALES RECEIPT", 105, 37, { align: "center" });

    // Decorative separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 42, 195, 42);

    // Meta Details
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Receipt ID: #${record.id.toUpperCase()}`, 15, 50);
    doc.text(`Date Submitted: ${new Date(record.date).toLocaleDateString()}`, 15, 56);
    
    let monthString = record.saleMonth ? new Date(record.saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';
    doc.text(`Sales Month: ${monthString}`, 15, 62);

    // Agent highlight box
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 68, 180, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 68, 180, 18, 'S');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 21);
    doc.text(`AGENT NAME: ${record.agentName.toUpperCase()}`, 20, 79);

    // Chassis Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(`Registered Chassis Codes (${record.validCount} Units Registered)`, 15, 96);

    // Draw the Chassis List Table using AutoTable
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

    // Add summary statement below
    const finalY = doc.lastAutoTable.finalY || 130;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for your registration submission.", 105, finalY + 20, { align: "center" });

    // Save as PDF
    doc.save(`NBJ_Receipt_${record.agentName.replace(/\s+/g, '_')}_${record.id.toUpperCase()}.pdf`);
    showToast("Receipt downloaded successfully!", "success");
  };

  // 2. Master Admin PDF Report
  const generateAdminReportPDF = () => {
    if (!window.jspdf) {
      showToast("PDF Engine loading. Please try again.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Red Header accent block
    doc.setFillColor(220, 38, 38); 
    doc.rect(0, 0, 210, 8, 'F');

    // Title Block
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

    // Decorative Separator
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 38, 195, 38);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 17, 21);
    doc.text("1. Verified Sales Registry", 15, 46);

    // Flatten sales lists
    const tableRows = [];
    salesData.forEach(data => {
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

    // Sales table
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

    // Agent Summaries Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 17, 21);
    doc.text("2. Agent Performance Summary", 15, finalY + 15);

    const summaryRows = agents.map(agent => {
      const total = salesData.filter(s => s.agentName === agent).reduce((sum, item) => sum + item.validCount, 0);
      return [agent, `${total} Units`];
    });

    doc.autoTable({
      head: [['AGENT NAME', 'TOTAL UNIQUE SALES']],
      body: summaryRows,
      startY: finalY + 20,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { right: 80 } // Compact right side layout
    });

    doc.save(`NBJ_Master_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("Master PDF Report downloaded successfully!", "success");
  };

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center text-slate-400 font-sans">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-200 font-sans selection:bg-red-900 selection:text-white relative">
      
      {/* Toast Notification System */}
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-5 backdrop-blur-md bg-slate-800/90 border-slate-600 text-slate-200">
          {toast.type === 'error' && <AlertTriangle size={18} className="text-red-500" />}
          {toast.type === 'success' && <CheckCircle size={18} className="text-green-500" />}
          <span className="font-medium text-sm tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Success Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#16161f] border border-slate-700 rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="bg-red-900/20 p-6 border-b border-slate-800 text-center relative">
              <div className="absolute right-4 top-4">
                <button onClick={() => setActiveReceipt(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <CheckCircle className="text-green-500 mx-auto mb-2" size={44} />
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Registration Success</h3>
              <p className="text-slate-400 text-xs mt-1">Sale successfully authenticated & registered.</p>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Agent:</span>
                <span className="font-bold text-white">{activeReceipt.agentName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Month:</span>
                <span className="font-bold text-blue-400">
                  {new Date(activeReceipt.saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Registered Count:</span>
                <span className="font-bold text-green-400">{activeReceipt.validCount} Units</span>
              </div>
              
              <div>
                <span className="text-slate-400 text-xs block mb-2 font-bold uppercase tracking-wider">Validated Chassis:</span>
                <div className="bg-[#0d0d12] border border-slate-800 p-3 rounded-xl max-h-36 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-400 space-y-1 leading-relaxed">
                  {activeReceipt.codes.map((code, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{idx + 1}. {code}</span>
                      <span className="text-green-600 font-bold uppercase text-[10px]">Verified</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#1c1c27] p-4 border-t border-slate-800 flex gap-3">
              <button onClick={() => setActiveReceipt(null)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold transition text-sm">
                Close
              </button>
              <button 
                onClick={() => generateAgentReceiptPDF(activeReceipt)} 
                className="w-2/3 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-950/40"
              >
                <FileDown size={18} /> Download PDF Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main App Navigation Router */}
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
          flaggedData={flaggedData} 
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
   1. LANDING PAGE
   ========================================= */
function LandingPage({ navigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="z-10 flex flex-col items-center bg-[#16161f]/80 backdrop-blur-xl p-12 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-red-900/20 max-w-md w-full text-center transition-all hover:border-red-900/40">
        
        <div className="mb-8 relative group">
           <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
           <img 
              src="133745.png" 
              alt="NBJ Logo" 
              className="relative w-36 h-36 object-cover rounded-full shadow-2xl border border-red-900/50 z-10 transition-transform duration-500 hover:scale-105 bg-[#111]"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
           />
           <div className="hidden relative w-36 h-36 rounded-full border-4 border-red-600 bg-[#111115] items-center justify-center shadow-2xl text-5xl font-bold tracking-tighter text-red-600 z-10">
              NBJ
           </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-1 tracking-widest uppercase">NBJ Sales Portal</h1>
        <p className="text-red-500 mb-10 text-xs font-bold tracking-[0.2em] uppercase">Nobuko Japan Automotive</p>

        <div className="flex flex-col gap-4 w-full">
          <button 
            onClick={() => navigate('agent')}
            className="group flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-bold transition-all shadow-lg hover:shadow-red-900/50"
          >
            <User size={20} className="group-hover:scale-110 transition-transform" />
            Enter Agent Portal
          </button>
          
          <button 
            onClick={() => navigate('admin-login')}
            className="group flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-[#22222d] hover:bg-[#2a2a38] border border-slate-700 hover:border-slate-500 text-slate-200 font-bold transition-all shadow-lg"
          >
            <ShieldAlert size={20} className="text-red-500 group-hover:scale-110 transition-transform" />
            Admin Access
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   1.1 ADMIN LOGIN PAGE
   ========================================= */
function AdminLogin({ navigate, showToast }) {
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Ubaid-m-nbj123') {
      showToast('Authentication Successful!', 'success');
      navigate('admin');
    } else {
      showToast('Access Denied. Invalid Password.', 'error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-950/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 bg-[#16161f]/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl border border-red-900/20 max-w-sm w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-900/10 flex items-center justify-center border border-red-900/30 shadow-[0_0_30px_rgba(185,28,28,0.2)]">
            <Lock className="text-red-500" size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider">Admin Security</h2>
        <p className="text-slate-400 text-xs mb-8">Enter credentials to access the NBJ dashboard.</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password..."
            className="w-full bg-[#0d0d12] border border-slate-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-center placeholder:text-slate-600 shadow-inner"
          />
          <p className="text-slate-500 text-[10px] italic">Hint: ...nbj123</p>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => navigate('landing')}
              className="w-1/3 bg-[#22222d] hover:bg-[#2a2a38] text-slate-300 font-bold py-3.5 rounded-xl text-sm transition-colors border border-slate-700"
            >
              Back
            </button>
            <button 
              type="submit"
              className="w-2/3 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-red-950/30"
            >
              Verify
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

    // Parse chassis codes strictly
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
          date: new Date().toISOString(), reason: 'Duplicate in current submission block'
        });
      } else if (chassisRegistry[code]) {
        newFlags.push({
          code, attemptedBy: agentName, originalOwner: chassisRegistry[code],
          date: new Date().toISOString(), reason: 'Chassis already registered in database'
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
      validCodes.forEach(code => { registryUpdates[code] = agentName; });
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

      // Trigger automatic pop-up receipt receipt details
      setActiveReceipt(newSaleRecord);
    }

    // Feedback
    if (newFlags.length === rawCodes.length) {
      showToast('Submission Failed: All entered codes were flagged as duplicates.', 'error');
    } else if (newFlags.length > 0) {
      showToast(`Partial Success: ${validCodes.length} registered. ${newFlags.length} duplicates blocked.`, 'error');
    } else {
      showToast('Sales successfully registered!', 'success');
    }

    // Reset Form if at least one succeeded
    if (validCodes.length > 0) {
      setChassisInput('');
      setSaleCount('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] pb-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-900/5 rounded-full blur-[100px] pointer-events-none"></div>

      <header className="bg-[#16161f]/80 backdrop-blur-lg border-b border-red-900/20 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-red-800 bg-[#111] overflow-hidden flex items-center justify-center shadow-lg">
             <img src="133745.png" alt="Logo" className="w-full h-full object-contain" 
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}/>
             <span className="hidden text-red-500 font-bold text-sm">NBJ</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">NBJ Agent Portal</h2>
            <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase">Secure Entry System</p>
          </div>
        </div>
        <button onClick={() => navigate('landing')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold bg-[#1c1c25] px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-600">
          <LogOut size={16} /> Exit
        </button>
      </header>

      <main className="max-w-3xl mx-auto mt-10 px-4 relative z-10">
        <div className="bg-[#16161f] rounded-3xl shadow-2xl border border-slate-800/60 p-8 sm:p-10">
          <div className="mb-8 border-b border-slate-800 pb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-red-900/20 rounded-lg text-red-500"><ListPlus size={24} /></div>
              Monthly Sales Submission
            </h3>
            <p className="text-slate-400 text-sm mt-3 ml-1">Select your profile and enter details carefully. Duplicates will be strictly flagged.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Agent Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <select 
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-[#0d0d12] border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="" disabled>Select your name</option>
                    {agents.map((agent, idx) => (
                      <option key={idx} value={agent}>{agent}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Month of Sales</label>
                <div className="relative">
                  <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="month" 
                    value={saleMonth}
                    onChange={(e) => setSaleMonth(e.target.value)}
                    className="w-full bg-[#0d0d12] border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer shadow-inner [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Total Sales Count</label>
                <div className="relative">
                  <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="number" 
                    value={saleCount}
                    onChange={(e) => setSaleCount(e.target.value)}
                    placeholder="e.g. 10"
                    min="1"
                    className="w-full bg-[#0d0d12] border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-600 shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 flex justify-between items-end uppercase tracking-wider">
                <span>Chassis Codes</span>
                <span className="text-[10px] text-red-400 font-bold bg-red-950/30 px-2 py-1 rounded">Separate by Enter (New Line)</span>
              </label>
              <textarea 
                value={chassisInput}
                onChange={(e) => setChassisInput(e.target.value)}
                placeholder="Enter codes here...&#10;WVWZZZAUZHW188235&#10;NHP130-2017196"
                rows="8"
                className="w-full bg-[#0d0d12] border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-600 font-mono text-sm resize-y shadow-inner leading-relaxed tracking-wider uppercase"
              ></textarea>
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(185,28,28,0.3)] hover:shadow-[0_10px_40px_rgba(185,28,28,0.5)] scale-100 hover:scale-[1.01]"
            >
              <CheckCircle size={22} />
              Submit Sales & Generate Receipt
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
function AdminPanel({ navigate, salesData, flaggedData, agents, setAgents, showToast, generateAdminReportPDF, generateAgentReceiptPDF }) {
  const [activeTab, setActiveTab] = useState('registry');
  const [newAgentName, setNewAgentName] = useState('');
  const [selectedChassisModal, setSelectedChassisModal] = useState(null);

  const totalValidSales = salesData.reduce((sum, item) => sum + item.validCount, 0);
  const totalFlags = flaggedData.length;

  const handleAddAgent = (e) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    if (agents.includes(newAgentName.trim())) {
      showToast('Agent already exists!', 'error');
      return;
    }
    setAgents([...agents, newAgentName.trim()]);
    setNewAgentName('');
    showToast('Agent added successfully!', 'success');
  };

  const handleRemoveAgent = (agentToRemove) => {
    setAgents(agents.filter(a => a !== agentToRemove));
    showToast(`${agentToRemove} has been removed.`, 'info');
  };

  // Highly Customized CSV Export to match the requested Image Format + Summary Footer
  const exportToCSV = () => {
    if (salesData.length === 0) {
      showToast('No data available to export!', 'error');
      return;
    }
    
    // Core Headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "AGENT NAME,CHASSIS,MONTH OF SALES\n";

    salesData.forEach(data => {
      let monthString = data.saleMonth ? new Date(data.saleMonth + "-01").toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'Not Specified';
      data.codes.forEach(code => {
        csvContent += `"${data.agentName}","${code}","${monthString}"\n`;
      });
    });

    // Add Spacing before Footer
    csvContent += "\n\n";
    
    // Add Summary Footer
    csvContent += "--- AGENT PERFORMANCE SUMMARY ---\n";
    csvContent += "AGENT NAME,TOTAL SALES COUNT\n";
    
    agents.forEach(agent => {
      const total = salesData.filter(s => s.agentName === agent).reduce((sum, item) => sum + item.validCount, 0);
      csvContent += `"${agent}","${total}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NBJ_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const agentStats = agents.map(agent => {
    const agentSales = salesData.filter(s => s.agentName === agent);
    const totalAgentValid = agentSales.reduce((sum, item) => sum + item.validCount, 0);
    const agentFlags = flaggedData.filter(f => f.attemptedBy === agent).length;
    return { name: agent, valid: totalAgentValid, flags: agentFlags };
  }).sort((a, b) => b.valid - a.valid);

  return (
    <div className="min-h-screen bg-[#0d0d12] flex flex-col relative">
      
      {/* Chassis Viewer Modal */}
      {selectedChassisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#16161f] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database className="text-red-500" size={20} />
                  Codes: {selectedChassisModal.agentName}
                </h3>
                <p className="text-slate-400 text-sm mt-1 font-bold">
                  Valid Count: <strong className="text-green-400">{selectedChassisModal.validCount}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedChassisModal(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedChassisModal.codes.map((code, index) => (
                  <div key={index} className="bg-[#0d0d12] border border-slate-800 p-3 rounded-lg flex items-center gap-3 hover:border-slate-600 transition-colors">
                    <div className="w-6 h-6 rounded bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">{index + 1}</div>
                    <span className="font-mono text-slate-200 tracking-wider text-sm">{code}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900/30 rounded-b-2xl flex justify-between">
               <button 
                  onClick={() => generateAgentReceiptPDF(selectedChassisModal)} 
                  className="bg-red-700 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 text-xs"
               >
                 <Download size={14} /> Download Receipt PDF
               </button>
               <button onClick={() => setSelectedChassisModal(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold transition-colors text-xs">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-red-950/30 border-b border-red-900/40 px-6 py-4 flex justify-between items-center sticky top-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-900/20 rounded-lg border border-red-900/30 shadow-[0_0_15px_rgba(185,28,28,0.2)]">
            <ShieldAlert className="text-red-500" size={24} />
          </div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase">NBJ Admin Dashboard</h2>
        </div>
        <button onClick={() => navigate('landing')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-bold bg-[#16161f] px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 shadow-md">
          <LogOut size={16} /> Exit Panel
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#16161f] rounded-2xl border border-slate-800/80 p-6 flex items-center gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
            <div className="w-16 h-16 rounded-2xl bg-green-950/40 flex items-center justify-center border border-green-900/50 shadow-inner">
              <Database className="text-green-500" size={32} />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-sm font-bold mb-1 uppercase tracking-wider">Total Verified Sales</p>
              <h3 className="text-4xl font-black text-white">{totalValidSales}</h3>
            </div>
          </div>

          <div className="bg-[#16161f] rounded-2xl border border-slate-800/80 p-6 flex items-center gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors"></div>
            <div className="w-16 h-16 rounded-2xl bg-red-950/40 flex items-center justify-center border border-red-900/50 shadow-inner">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-sm font-bold mb-1 uppercase tracking-wider">Flagged Duplicates</p>
              <h3 className="text-4xl font-black text-white">{totalFlags}</h3>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-[#16161f] p-1.5 rounded-xl border border-slate-800 overflow-x-auto w-max shadow-lg">
          <button onClick={() => setActiveTab('registry')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'registry' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
            <FileText size={18} /> Sales Registry
          </button>
          
          <button onClick={() => setActiveTab('flags')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'flags' ? 'bg-red-950/50 border border-red-900/50 text-red-100 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
            <ShieldAlert size={18} className={activeTab === 'flags' ? 'text-red-400' : ''} /> Flag Reports
            {totalFlags > 0 && <span className="bg-red-600 text-white text-[11px] px-2 py-0.5 rounded-md ml-1 shadow-sm">{totalFlags}</span>}
          </button>
          
          <button onClick={() => setActiveTab('agents')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'agents' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
            <Users size={18} /> Manage Agents
          </button>

          <button onClick={() => setActiveTab('analytics')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
            <TrendingUp size={18} /> Performance Stats
          </button>
        </div>

        {/* Content: Registry */}
        {activeTab === 'registry' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
              <h3 className="text-xl font-bold text-white">Current Sales Data</h3>
              <div className="flex gap-3">
                <button onClick={exportToCSV} className="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-[0_5px_15px_rgba(4,120,87,0.3)] hover:shadow-[0_8px_20px_rgba(4,120,87,0.4)]">
                  <Download size={18} /> Export Excel (CSV)
                </button>
                <button onClick={generateAdminReportPDF} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-[0_5px_15px_rgba(51,65,85,0.3)]">
                  <Download size={18} /> Download Master PDF
                </button>
              </div>
            </div>
            
            <div className="bg-[#16161f] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {salesData.length === 0 ? (
                <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                  <BarChart3 size={64} className="mb-4 opacity-20" />
                  <p className="text-lg font-bold">No sales records found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1c1c25] text-slate-400 text-xs uppercase tracking-widest border-b border-slate-800">
                        <th className="p-5 font-bold">Date</th>
                        <th className="p-5 font-bold">Agent Name</th>
                        <th className="p-5 font-bold">Sales Month</th>
                        <th className="p-5 font-bold">Valid Registered</th>
                        <th className="p-5 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {salesData.map((data) => {
                        let displayMonth = data.saleMonth ? new Date(data.saleMonth + "-01").toLocaleString('en-US', { month: 'short', year: 'numeric' }) : "N/A";
                        return (
                          <tr key={data.id} className="hover:bg-slate-800/30 transition-colors group">
                            <td className="p-5 text-sm text-slate-300 whitespace-nowrap">
                              {new Date(data.date).toLocaleDateString()} <span className="text-slate-500 text-xs ml-1 block mt-0.5">{new Date(data.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="p-5 text-sm font-bold text-white">{data.agentName}</td>
                            <td className="p-5 text-sm text-blue-300 font-bold">{displayMonth}</td>
                            <td className="p-5">
                              <span className="bg-green-950/50 text-green-400 border border-green-800/50 px-3 py-1 rounded-full text-xs font-black">
                                {data.validCount} Codes
                              </span>
                            </td>
                            <td className="p-5 text-right">
                              <button onClick={() => setSelectedChassisModal(data)} className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-slate-700">
                                <Eye size={14} /> View Details
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
          <div className="bg-[#16161f] border border-red-900/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(185,28,28,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {flaggedData.length === 0 ? (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                <ShieldAlert size={64} className="mb-4 opacity-30 text-green-500" />
                <p className="text-lg font-bold text-green-500/80">System clean. No duplicates detected.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="p-4 bg-red-950/20 border-b border-red-900/30 flex items-center gap-2 text-red-400 text-sm font-bold uppercase tracking-wider">
                  <AlertTriangle size={18} /> The following entries were blocked due to duplication.
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1c1c25] text-slate-400 text-xs uppercase tracking-widest border-b border-red-900/30">
                      <th className="p-5 font-bold">Timestamp</th>
                      <th className="p-5 font-bold">Attempted By</th>
                      <th className="p-5 font-bold text-red-400">Duplicate Chassis</th>
                      <th className="p-5 font-bold">Original Owner</th>
                      <th className="p-5 font-bold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {flaggedData.map((flag, idx) => (
                      <tr key={idx} className="hover:bg-red-900/10 transition-colors">
                        <td className="p-5 text-sm text-slate-300 whitespace-nowrap">
                          {new Date(flag.date).toLocaleDateString()} <span className="text-slate-500 text-xs ml-1 block mt-0.5">{new Date(flag.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="p-5 text-sm font-bold text-white">{flag.attemptedBy}</td>
                        <td className="p-5 text-sm">
                          <span className="font-mono font-bold text-red-400 bg-red-950 border border-red-900 px-2 py-1 rounded shadow-inner">
                            {flag.code}
                          </span>
                        </td>
                        <td className="p-5 text-sm text-slate-300">
                          {flag.originalOwner === flag.attemptedBy ? (
                             <span className="text-orange-400 text-xs font-black border border-orange-800 bg-orange-950/30 px-2 py-1 rounded flex w-max items-center gap-1 uppercase">
                                <User size={12}/> Self Duplicate
                             </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">{flag.originalOwner}</span>
                          )}
                        </td>
                        <td className="p-5 text-xs font-bold text-slate-400">{flag.reason}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#16161f] border border-slate-800 rounded-2xl p-8 shadow-xl h-fit">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded text-red-500"><UserPlus size={20} /></div>
                Register New Agent
              </h3>
              <form onSubmit={handleAddAgent} className="flex flex-col gap-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="Enter agent name..."
                    className="w-full bg-[#0d0d12] border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-red-500 shadow-inner"
                  />
                </div>
                <button type="submit" className="bg-red-700 hover:bg-red-600 text-white w-full py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 uppercase tracking-wider">
                  Add Agent
                </button>
              </form>
            </div>
            
            <div className="bg-[#16161f] border border-slate-800 rounded-2xl p-8 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded text-emerald-500"><Users size={20} /></div>
                Active Agents List
              </h3>
              <ul className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-[#0d0d12] shadow-inner">
                {agents.length === 0 ? (
                  <li className="text-slate-500 p-6 text-center text-sm font-bold">No agents found.</li>
                ) : (
                  agents.map((agent, idx) => (
                    <li key={idx} className="p-4 px-5 flex justify-between items-center hover:bg-slate-800/40 transition-colors group">
                      <span className="font-bold text-slate-200">{agent}</span>
                      <button onClick={() => handleRemoveAgent(agent)} className="text-slate-500 hover:text-red-500 bg-slate-800 hover:bg-red-950/50 p-2 rounded-lg transition-all opacity-50 group-hover:opacity-100" title="Remove Agent">
                        <Trash2 size={16} />
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
          <div className="bg-[#16161f] border border-slate-800 rounded-2xl p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded text-blue-500"><TrendingUp size={20} /></div>
              Agent Performance Overview
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {agentStats.map((stat, idx) => (
                <div key={idx} className="bg-[#0d0d12] border border-slate-700/80 rounded-2xl p-6 hover:border-red-900/50 transition-all relative overflow-hidden group shadow-lg hover:shadow-red-900/10">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-900/10 to-transparent rounded-bl-full -mr-4 -mt-4 group-hover:from-red-900/20 transition-colors"></div>
                  
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
                    <User size={18} />
                  </div>

                  <h4 className="text-white font-black text-lg mb-6 truncate pr-6 tracking-wide" title={stat.name}>{stat.name}</h4>
                  
                  <div className="flex justify-between items-end bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-wider">Valid Sales</p>
                      <p className="text-2xl font-black text-emerald-500">{stat.valid}</p>
                    </div>
                    <div className="text-right border-l border-slate-700/50 pl-4">
                      <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-wider">Duplicates</p>
                      <p className="text-xl font-black text-red-500">{stat.flags}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #16161f; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}